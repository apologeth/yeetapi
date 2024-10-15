import BadRequestError from '../errors/bad-request';
import { Token } from '../models/Token';
import { ethers } from 'ethers';
import {
  Transaction,
  TRANSACTION_TYPE,
  TRANSFER_TYPE,
} from '../models/Transaction';
import { Account } from '../models/Account';
import NotFoundError from '../errors/not-found';
import { mustBeTrue, notNull } from '../utils/assert';
import { recoverPrivateKey } from '../utils/shamir-key';
import { TransactionStep } from '../models/TransactionStep';
import ChainTransactionService from './chainTransactionService';
import SimpleToken from '../contracts/SimpleToken.json';
import { provider } from '../utils/contracts';
import { Transaction as DBTransaction } from 'sequelize';
import ExchangeService from './exchangeService';
import { langitAdmin } from '../utils/user-operation';
import { v4 as uuid } from 'uuid';
import {
  convertToBiggestUnit,
  convertToSmallestUnit,
} from '../utils/conversion';
import WalletService from './walletService';
import { isEmail } from '../utils/send-email';
import InternalServerError from '../errors/internal-server-error';
import { sequelize } from '../config/database';

export default class TransactionService {
  private chainTransactionService: ChainTransactionService;
  private exchangeService: ExchangeService;
  private walletService: WalletService;

  constructor() {
    this.chainTransactionService = new ChainTransactionService();
    this.exchangeService = new ExchangeService();
    this.walletService = new WalletService();
  }

  async fetch(transactionId: string) {
    const transaction = await Transaction.findByPk(transactionId, {
      include: [
        {
          model: Account,
          as: 'senderAccount',
        },
        {
          model: Token,
          as: 'sentTokenDetails',
        },
        {
          model: Token,
          as: 'receivedTokenDetails',
        },
      ],
    });
    let sentAmount: any = transaction?.sentAmount;
    if (transaction?.sentTokenDetails) {
      sentAmount = convertToBiggestUnit(sentAmount!, transaction?.sentTokenDetails.decimals);
    } else if (transaction?.transferType?.includes('NATIVE')) {
      sentAmount = convertToBiggestUnit(sentAmount!, 18);
    } else if (transaction?.type === 'BUY_TOKEN') {
      sentAmount = convertToBiggestUnit(sentAmount!, 2);
    }

    let receivedAmount: any = transaction?.receivedAmount;
    if (transaction?.receivedTokenDetails) {
      receivedAmount = convertToBiggestUnit(receivedAmount!, transaction?.receivedTokenDetails.decimals);
    } else if (transaction?.transferType?.includes('TO_FIAT')) {
      receivedAmount = convertToBiggestUnit(receivedAmount!, 2);
    } else if (transaction?.transferType?.includes('TO_NATIVE')) {
      receivedAmount = convertToBiggestUnit(receivedAmount!, 18);
    }

    const { id, sender, receiver, sentToken, receivedToken, status, transactionHash, paymentCode, type, transferType, createdAt, updatedAt } = transaction!;
    return {
      id,
      sender,
      receiver,
      sentToken,
      receivedToken,
      status,
      transactionHash,
      paymentCode,
      type,
      transferType,
      createdAt,
      updatedAt,
      sentAmount,
      receivedAmount,
    }
  }

  async create(params: {
    senderAddress?: string;
    shardDevice?: string;
    receiverAddress?: string;
    sentAmount?: number;
    receivedAmount?: number;
    sentTokenAddress?: string;
    receivedTokenAddress?: string;
    type: TRANSACTION_TYPE;
    transferType: TRANSFER_TYPE;
    opts: { dbTransaction: DBTransaction };
  }) {
    switch (params.type) {
      case 'TRANSFER':
        notNull(
          new BadRequestError('sender_address is required'),
          params.senderAddress,
        );
        notNull(
          new BadRequestError('shard_device is required'),
          params.shardDevice,
        );
        notNull(
          new BadRequestError('receiver_address is required'),
          params.receiverAddress,
        );
        notNull(
          new BadRequestError('sent_amount is required'),
          params.sentAmount,
        );

        return await this.transfer({
          ...params,
          senderAddress: params.senderAddress!,
          shardDevice: params.shardDevice!,
          receiverAddress: params.receiverAddress!,
          sentAmount: params.sentAmount!,
        });
      case 'BUY_TOKEN':
        notNull(
          new BadRequestError('receiver_address is required'),
          params.receiverAddress,
        );
        notNull(
          new BadRequestError('received_amount is required'),
          params.receivedAmount,
        );

        return this.buyToken({
          ...params,
          receiverAddress: params.receiverAddress!,
          receivedAmount: params.receivedAmount!,
        });
      default:
        throw new BadRequestError('unknown transaction type');
    }
  }

  async notifyPayment(
    transactionId: string,
    statusCode: number,
    referenceId: string,
  ) {
    // Currently referenceId is internal transaction id,
    // so we can check it by making sure this transaction exist or not.
    const transaction = await Transaction.findByPk(referenceId);
    notNull(new BadRequestError('Invalid request'), transaction);
    mustBeTrue(
      new BadRequestError('Invalid request'),
      transaction!.status !== 'SENT' && transaction!.status !== 'FAILED',
    );
    if (statusCode === 0) {
      return;
    }

    const dbTransaction = await sequelize.transaction();
    try {
      const status = statusCode == 1 ? 'SUCCESS' : 'FAILED';
      await this.finalizeTransactionStep(transactionId, status, undefined, {
        dbTransaction,
      });
      await dbTransaction.commit();
    } catch (e) {
      console.log(
        `Failed to update buy token with transactionId: ${referenceId}, error = ${e}`,
      );
      await dbTransaction.rollback();
    }
  }

  private async transfer(params: {
    senderAddress: string;
    shardDevice: string;
    receiverAddress: string;
    sentAmount: number;
    receivedAmount?: number;
    sentTokenAddress?: string;
    receivedTokenAddress?: string;
    transferType: TRANSFER_TYPE;
    opts: { dbTransaction: DBTransaction };
  }) {
    const {
      senderAddress,
      shardDevice,
      receiverAddress: _receiverAddress,
      transferType,
      opts,
    } = params;

    const sender = await Account.findOne({
      where: { accountAbstractionAddress: senderAddress },
    });
    if (!sender) {
      throw new NotFoundError('Unknown sender');
    }

    const receiverAddress = await this.getReceiverAddress(
      _receiverAddress,
      transferType,
    );

    const privateKey = await recoverPrivateKey(
      sender.encryptedShard!,
      shardDevice,
    );
    const wallet = new ethers.Wallet(privateKey);
    mustBeTrue(
      new BadRequestError('key not match'),
      sender!.address === wallet.address,
    );

    const { id: transactionId } = await this.createTransfer({
      ...params,
      sender,
      receiverAddress,
    });

    const transaction = (await Transaction.findByPk(transactionId, {
      include: [
        {
          model: Account,
          as: 'senderAccount',
        },
        {
          model: Token,
          as: 'sentTokenDetails',
        },
        {
          model: Token,
          as: 'receivedTokenDetails',
        },
      ],
      transaction: opts.dbTransaction,
    }))!;
    const steps = await this.createTransactionSteps(
      transaction,
      opts.dbTransaction,
    );

    await this.executeTransactionStep(steps[0], opts.dbTransaction, privateKey);

    return transaction;
  }

  private async buyToken(params: {
    receiverAddress: string;
    receivedTokenAddress?: string;
    receivedAmount: number;
    opts: { dbTransaction: DBTransaction };
  }) {
    const { receiverAddress, receivedTokenAddress, receivedAmount, opts } =
      params;

    if (!isEmail(receiverAddress)) {
      throw new BadRequestError('receiver_address must be email address');
    }
    const receiver = await Account.findOne({
      where: { email: receiverAddress },
    });
    if (!receiver) {
      throw new NotFoundError('Unknown receiver');
    }

    let token;
    if (receivedTokenAddress) {
      token = await Token.findOne({
        where: { address: receivedTokenAddress },
      });
    }

    const amountInSmallestUnit = convertToSmallestUnit(
      receivedAmount,
      token?.decimals ?? 18,
    );
    const adminBalance = receivedTokenAddress ? 
      await (new ethers.Contract(
        receivedTokenAddress,
        SimpleToken.abi,
        provider,
      )).balanceOf(langitAdmin.address) : await provider.getBalance(langitAdmin.address);

    mustBeTrue(
      new BadRequestError('Insufficient admin balance'),
      amountInSmallestUnit.lte(adminBalance.toString()),
    );

    const tokenPriceInIDR = (await this.exchangeService.getTokenAmount(1))
      .price;
    const amountToSend = receivedAmount * tokenPriceInIDR;
    const transaction = await Transaction.create(
      {
        receiver: receiver.id,
        receivedToken: token?.id,
        receivedAmount: amountInSmallestUnit.toString(),
        sentAmount: convertToSmallestUnit(amountToSend, 2).toString(),
        status: 'INIT',
        type: 'BUY_TOKEN',
      },
      { transaction: opts?.dbTransaction },
    );

    

    const { TransactionId: externalPaymentId, PaymentNo: paymentCode } =
      await this.walletService.createPayment({
        referenceId: transaction.id,
        email: receiver.email,
        amount: amountToSend,
      });

    await TransactionStep.create(
      {
        id: uuid(),
        transactionId: transaction.id,
        externalId: externalPaymentId,
        type: 'BUY_TOKEN',
        status: 'PROCESSING',
        priority: 0,
        receiverAddress: receiver.accountAbstractionAddress,
        tokenAddress: token?.address,
        tokenAmount: amountInSmallestUnit.toString(),
      },
      { transaction: opts?.dbTransaction },
    );

    await TransactionStep.create(
      {
        id: uuid(),
        transactionId: transaction.id,
        type: 'ADMIN_CHAIN_TRANSACTION',
        status: 'INIT',
        priority: 1,
        receiverAddress: receiver.accountAbstractionAddress,
        tokenAddress: token?.address,
        tokenAmount: amountInSmallestUnit.toString(),
      },
      { transaction: opts?.dbTransaction },
    );

    await transaction.update(
      {
        paymentCode,
      },
      { transaction: opts?.dbTransaction },
    );

    return transaction;
  }

  private async getReceiverAddress(
    receiverAddress: string,
    transferType: TRANSFER_TYPE,
  ) {
    if (!isEmail(receiverAddress) && !ethers.utils.isAddress(receiverAddress)) {
      throw new BadRequestError(
        'receiver address must be either email or EOA or account abstraction',
      );
    }

    const receiver = await Account.findOne({
      where: isEmail(receiverAddress)
        ? { email: receiverAddress }
        : { accountAbstractionAddress: receiverAddress },
    });

    switch (transferType) {
      case TRANSFER_TYPE.CRYPTO_TO_CRYPTO:
        return receiver?.accountAbstractionAddress ?? receiverAddress;
      case TRANSFER_TYPE.NATIVE_TO_NATIVE:
        return receiver?.accountAbstractionAddress ?? receiverAddress;
      case TRANSFER_TYPE.CRYPTO_TO_FIAT:
      case TRANSFER_TYPE.NATIVE_TO_FIAT:
        notNull(
          new BadRequestError(
            'this email address must be associated with fiat wallet id',
          ),
          receiver?.fiatWalletId,
        );
        return receiver!.fiatWalletId!;
      default:
        throw new InternalServerError(
          'must be not here: unknown transfer type',
        );
    }
  }

  private async createTransfer(params: {
    sender: Account;
    receiverAddress: string;
    sentAmount: number;
    receivedAmount?: number;
    sentTokenAddress?: string;
    receivedTokenAddress?: string;
    transferType: TRANSFER_TYPE;
    opts: { dbTransaction: DBTransaction };
  }) {
    switch (params.transferType) {
      case TRANSFER_TYPE.CRYPTO_TO_CRYPTO:
        notNull(
          new BadRequestError('sent_token_address is required'),
          params.sentTokenAddress,
        );
        notNull(
          new BadRequestError('received_token_address is required'),
          params.receivedTokenAddress,
        );
        return this.createCryptoToCryptoTransfer({
          ...params,
          sentTokenAddress: params.sentTokenAddress!,
          receivedTokenAddress: params.receivedTokenAddress!,
        });
      case TRANSFER_TYPE.NATIVE_TO_NATIVE:
        return this.createNativeToNativeTransfer(params);
      case TRANSFER_TYPE.CRYPTO_TO_FIAT:
        notNull(
          new BadRequestError('sent_token_address is required'),
          params.sentTokenAddress,
        );
        notNull(
          new BadRequestError('received_amount is required'),
          params.receivedAmount,
        );
        console.log(params.receiverAddress);
        mustBeTrue(
          new BadRequestError(
            'receiver_address must be email address with fiat wallet id',
          ),
          !ethers.utils.isAddress(params.receiverAddress),
        );
        return this.createCryptoToFiatTransfer({
          ...params,
          sentTokenAddress: params.sentTokenAddress!,
          receivedAmount: params.receivedAmount!,
        });
      case TRANSFER_TYPE.NATIVE_TO_FIAT:
        notNull(
          new BadRequestError('received_amount is required'),
          params.receivedAmount,
        );
        mustBeTrue(
          new BadRequestError(
            'receiver_address must be email address with fiat wallet id',
          ),
          !ethers.utils.isAddress(params.receiverAddress),
        );
        return this.createNativeToFiatTransfer({
          ...params,
          receivedAmount: params.receivedAmount!,
        });
      default:
        throw new BadRequestError('unknown transfer_type');
    }
  }

  private async createCryptoToCryptoTransfer(params: {
    sender: Account;
    receiverAddress: string;
    sentAmount: number;
    sentTokenAddress: string;
    receivedTokenAddress: string;
    opts: { dbTransaction: DBTransaction };
  }) {
    const {
      sender,
      receiverAddress,
      sentAmount,
      sentTokenAddress,
      receivedTokenAddress,
      opts,
    } = params;

    const sentToken = await Token.findOne({
      where: { address: sentTokenAddress },
    });
    const receivedToken = await Token.findOne({
      where: { address: receivedTokenAddress },
    });

    notNull(new BadRequestError('Unknown sent token'), sentToken);
    notNull(new BadRequestError('Unknown recived token'), receivedToken);

    const amountInSmallestUnit = convertToSmallestUnit(
      sentAmount,
      sentToken!.decimals,
    );
    const sentTokenContract = new ethers.Contract(
      sentToken!.address,
      SimpleToken.abi,
      provider,
    );
    const senderAccountBalance = await sentTokenContract.balanceOf(
      sender.accountAbstractionAddress,
    );
    mustBeTrue(
      new BadRequestError('Insufficient balance'),
      amountInSmallestUnit.lte(senderAccountBalance.toString()),
    );

    return await Transaction.create(
      {
        sender: sender.id,
        receiver: receiverAddress,
        sentToken: sentToken?.id,
        receivedToken: receivedToken?.id,
        sentAmount: amountInSmallestUnit.toString(),
        status: 'INIT',
        transferType: 'CRYPTO_TO_CRYPTO',
      },
      { transaction: opts?.dbTransaction },
    );
  }

  private async createNativeToNativeTransfer(params: {
    sender: Account;
    receiverAddress: string;
    sentAmount: number;
    transferType: TRANSFER_TYPE;
    opts: { dbTransaction: DBTransaction };
  }) {
    const { sender, receiverAddress, sentAmount, opts } = params;

    const amountInSmallestUnit = convertToSmallestUnit(sentAmount, 18);
    const nativeTokenBalance = await provider.getBalance(
      sender.accountAbstractionAddress,
    );
    mustBeTrue(
      new BadRequestError('Insufficient balance'),
      amountInSmallestUnit.lte(nativeTokenBalance.toString()),
    );

    return await Transaction.create(
      {
        sender: sender.id,
        receiver: receiverAddress,
        sentAmount: amountInSmallestUnit.toString(),
        status: 'INIT',
        transferType: 'NATIVE_TO_NATIVE',
      },
      { transaction: opts?.dbTransaction },
    );
  }

  private async createCryptoToFiatTransfer(params: {
    sender: Account;
    receiverAddress: string;
    sentTokenAddress: string;
    sentAmount: number;
    receivedAmount: number;
    transferType: TRANSFER_TYPE;
    opts: { dbTransaction: DBTransaction };
  }) {
    const {
      sender,
      receiverAddress,
      sentTokenAddress,
      sentAmount,
      receivedAmount,
      opts,
    } = params;

    const sentToken = await Token.findOne({
      where: { address: sentTokenAddress },
    });

    notNull(new BadRequestError('Unknown sent token'), sentToken);

    const { tokenAmount: expectedSentAmount } =
      await this.exchangeService.getTokenAmount(receivedAmount);
    mustBeTrue(
      new BadRequestError('sent token amount is too low'),
      sentAmount >= expectedSentAmount,
    );

    const sentAmountInSmallestUnit = convertToSmallestUnit(
      expectedSentAmount,
      sentToken!.decimals,
    );
    const sentTokenContract = new ethers.Contract(
      sentToken!.address,
      SimpleToken.abi,
      provider,
    );
    const senderAccountBalance = await sentTokenContract.balanceOf(
      sender.accountAbstractionAddress,
    );
    mustBeTrue(
      new BadRequestError('Insufficient balance'),
      sentAmountInSmallestUnit.lte(senderAccountBalance.toString()),
    );

    const receivedAmountInSmallestUnit = convertToSmallestUnit(
      receivedAmount,
      2,
    ); //IDRT decimals precision is 2
    return await Transaction.create(
      {
        sender: sender.id,
        receiver: receiverAddress,
        sentToken: sentToken?.id,
        sentAmount: sentAmountInSmallestUnit.toString(),
        receivedAmount: receivedAmountInSmallestUnit.toString(),
        status: 'INIT',
        transferType: 'CRYPTO_TO_FIAT',
      },
      { transaction: opts?.dbTransaction },
    );
  }

  private async createNativeToFiatTransfer(params: {
    sender: Account;
    receiverAddress: string;
    sentAmount: number;
    receivedAmount: number;
    transferType: TRANSFER_TYPE;
    opts: { dbTransaction: DBTransaction };
  }) {
    const { sender, receiverAddress, sentAmount, receivedAmount, opts } =
      params;

    const amountInSmallestUnit = convertToSmallestUnit(sentAmount, 18);
    const nativeTokenBalance = await provider.getBalance(
      sender.accountAbstractionAddress,
    );
    mustBeTrue(
      new BadRequestError('Insufficient balance'),
      amountInSmallestUnit.lte(nativeTokenBalance.toString()),
    );

    return await Transaction.create(
      {
        sender: sender.id,
        receiver: receiverAddress,
        sentAmount: amountInSmallestUnit.toString(),
        receivedAmount: convertToSmallestUnit(receivedAmount, 2).toString(),
        status: 'INIT',
        transferType: 'NATIVE_TO_FIAT',
      },
      { transaction: opts?.dbTransaction },
    );
  }

  private async createTransactionSteps(
    transaction: Transaction,
    dbTransaction: DBTransaction,
  ) {
    const steps: TransactionStep[] = [];

    steps.push(await this.createCryptoTransferStep(transaction, dbTransaction));
    if (
      transaction.transferType === TRANSFER_TYPE.CRYPTO_TO_FIAT ||
      transaction.transferType === TRANSFER_TYPE.NATIVE_TO_FIAT
    ) {
      steps.push(
        await this.createExchangeToFiatStep(transaction, dbTransaction),
      );
    }

    return steps;
  }

  private async createCryptoTransferStep(
    transaction: Transaction,
    dbTransaction: DBTransaction,
  ) {
    const {
      senderAccount,
      receiver,
      sentTokenDetails,
      sentAmount: tokenAmount,
    } = transaction;
    notNull(new BadRequestError('senderAccount is required'), senderAccount);
    notNull(new BadRequestError('sentAmount is required'), tokenAmount);

    let senderAddress;
    let receiverAddress;
    if (
      transaction.transferType === TRANSFER_TYPE.CRYPTO_TO_FIAT ||
      transaction.transferType === TRANSFER_TYPE.NATIVE_TO_FIAT
    ) {
      senderAddress = senderAccount!.accountAbstractionAddress;
      receiverAddress = langitAdmin.address;
    } else {
      senderAddress = senderAccount!.accountAbstractionAddress;
      receiverAddress = receiver;
    }

    return await TransactionStep.create(
      {
        id: uuid(),
        transactionId: transaction.id,
        type: 'CHAIN_TRANSACTION',
        status: 'INIT',
        priority: 0,
        senderAddress,
        receiverAddress,
        tokenAddress: sentTokenDetails?.address,
        tokenAmount,
      },
      { transaction: dbTransaction },
    );
  }

  private async createExchangeToFiatStep(
    transaction: Transaction,
    dbTransaction: DBTransaction,
  ) {
    const {
      sentTokenDetails,
      sentAmount: tokenAmount,
      receivedAmount: fiatAmount,
    } = transaction;
    notNull(new BadRequestError('tokenAmount is required'), tokenAmount);
    notNull(new BadRequestError('recievedAmount is required'), fiatAmount);

    return await TransactionStep.create(
      {
        id: uuid(),
        transactionId: transaction.id,
        type: 'EXCHANGE_TO_FIAT',
        status: 'INIT',
        priority: 1,
        tokenAddress: sentTokenDetails?.address,
        tokenAmount,
        fiatAmount,
        receiverAddress: transaction.receiver,
      },
      { transaction: dbTransaction },
    );
  }

  private async executeTransactionStep(
    transactionStep: TransactionStep,
    dbTransaction: DBTransaction,
    privateKey?: string,
  ) {
    let externalId;
    switch (transactionStep.type) {
      case 'CHAIN_TRANSACTION':
        {
          mustBeTrue(
            new BadRequestError(
              'privateKey is required for this transaction step',
            ),
            transactionStep.type === 'CHAIN_TRANSACTION' && privateKey != null,
          );
          externalId = await this.chainTransactionService.transferToken(
            transactionStep,
            privateKey!,
            { dbTransaction },
          );
        }
        break;
      case 'ADMIN_CHAIN_TRANSACTION':
        {
          externalId = await this.chainTransactionService.adminTransferToken(
            transactionStep,
            { dbTransaction },
          );
        }
        break;
      case 'EXCHANGE_TO_FIAT':
        {
          const amount = convertToBiggestUnit(transactionStep.fiatAmount!, 2);
          externalId = await this.walletService.transfer(
            transactionStep.receiverAddress!,
            amount,
          );
        }
        break;
      default:
        throw new Error('unknown transaction step type');
    }

    await transactionStep.update(
      {
        externalId,
        status: 'PROCESSING',
      },
      { transaction: dbTransaction },
    );

    if (transactionStep.type === 'EXCHANGE_TO_FIAT') {
      await this.finalizeTransactionStep(externalId, 'SUCCESS', undefined, {
        dbTransaction,
      });
    }
  }

  async finalizeTransactionStep(
    externalId: string,
    status: string,
    transactionHash?: string,
    opts?: { dbTransaction: DBTransaction },
  ) {
    const step = await TransactionStep.findOne({
      where: { externalId },
      transaction: opts?.dbTransaction,
    });
    notNull(
      new NotFoundError(
        `transaction step not found for externalId: ${externalId}`,
      ),
      step,
    );
    status = step?.status !== 'REVERTING' ? status : 'REVERTED';
    await step!.update(
      {
        status,
      },
      { transaction: opts?.dbTransaction },
    );

    const steps = await TransactionStep.findAll({
      where: { transactionId: step!.transactionId, status: 'INIT' },
      order: ['priority'],
      transaction: opts?.dbTransaction,
    });

    if (transactionHash) {
      await Transaction.update(
        { transactionHash },
        {
          where: { id: step!.transactionId },
          transaction: opts?.dbTransaction,
        },
      );
    }

    if (steps!.length === 0 || status === 'FAILED') {
      const transaction = await Transaction.findByPk(step!.transactionId, {
        transaction: opts?.dbTransaction,
      });
      notNull(
        new BadRequestError(
          `transaction with id: ${step!.transactionId} is not found`,
        ),
        transaction,
      );
      transaction!.status = status === 'SUCCESS' ? 'SENT' : 'FAILED';
      await transaction!.update(
        { status: transaction!.status },
        {
          transaction: opts?.dbTransaction,
        },
      );
      if (
        transaction!.status === 'SUCCESS' &&
        (transaction!.transferType === TRANSFER_TYPE.CRYPTO_TO_FIAT ||
          transaction!.transferType === TRANSFER_TYPE.NATIVE_TO_FIAT)
      ) {
        this.postTransaction(transaction!);
      }
    } else {
      try {
        await this.executeTransactionStep(steps[0], opts?.dbTransaction!);
      } catch (err: any) {
        console.error(
          `transaction with id: ${step?.transactionId} failed when executing steps: ${steps[0].id}, error: ${err.message}`,
        );
        // Currently only crypto / native transaction step that need to be reverted.
        await this.revertTransactionStep(step!, opts?.dbTransaction!);
        await steps[0].update(
          {
            status: 'FAILED',
          },
          { transaction: opts?.dbTransaction },
        );
        await Transaction.update(
          {
            status: 'FAILED',
          },
          {
            where: { id: step?.transactionId! },
            transaction: opts?.dbTransaction,
          },
        );
      }
    }
  }

  async revertTransactionStep(
    step: TransactionStep,
    dbTransaction: DBTransaction,
  ) {
    let callData: string | null = null;
    if (step.tokenAddress) {
      const token = new ethers.Contract(
        step.tokenAddress,
        SimpleToken.abi,
        provider,
      );
      callData = token.interface.encodeFunctionData('transfer', [
        step.senderAddress,
        step.tokenAmount,
      ]);
    }
    await langitAdmin.connect(provider).sendTransaction({
      to: step.tokenAddress ?? step.senderAddress!,
      value: step.tokenAddress ? '0' : step.tokenAmount,
      data: callData ?? '',
    });

    await step.update(
      {
        status: 'REVERTED',
      },
      { transaction: dbTransaction },
    );
  }

  async postTransaction(transaction: Transaction) {
    try {
      if (
        !transaction.transferType.includes('FIAT') ||
        transaction.status !== 'SENT'
      ) {
        return;
      }
      let decimals = 18;
      if (transaction.sentToken) {
        const token = await Token.findByPk(transaction.sentToken);
        decimals = token?.decimals ?? decimals;
      }
      const tokenAmount = convertToBiggestUnit(
        transaction.sentAmount!,
        decimals,
      );
      const fiatAmount = convertToBiggestUnit(transaction.receivedAmount!, 2);
      await this.exchangeService.exchangeTokenToFiat(tokenAmount, fiatAmount);
    } catch (err: any) {
      console.error(
        `Failed to execute post transaction, error = ${err.message}`,
      );
    }
  }
}
