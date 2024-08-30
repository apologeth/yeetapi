import BadRequestError from '../errors/bad-request';
import { Token } from '../models/Token';
import { ethers } from 'ethers';
import { Transaction, TRANSFER_TYPE } from '../models/Transaction';
import { Account } from '../models/Account';
import NotFoundError from '../errors/not-found';
import { mustBeTrue, notNull } from '../utils/assert';
import { recoverPrivateKey } from '../utils/shamir-key';
import { TransactionStep } from '../models/TransactionStep';
import ChainTransactionService from './chainTransactionService';
import SimpleToken from '../contracts/SimpleToken.json';
import { provider } from '../utils/contracts';
import BigNumber from 'bignumber.js';
import { Transaction as DBTransaction } from 'sequelize';
import ExchangeService from './exchangeService';
import { langitAdmin } from '../utils/user-operation';
import { v4 as uuid } from 'uuid';

export default class TransactionService {
  private chainTransactionService: ChainTransactionService;
  private exchangeService: ExchangeService;

  constructor() {
    this.chainTransactionService = new ChainTransactionService();
    this.exchangeService = new ExchangeService();
  }

  async fetch(transactionId: string) {
    return (await Transaction.findByPk(transactionId))?.dataValues;
  }

  async create(params: {
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
    const { senderAddress, shardDevice, receiverAddress, opts } = params;

    const sender = await Account.findOne({
      where: { accountAbstractionAddress: senderAddress },
    });
    const receiver = await Account.findOne({
      where: { accountAbstractionAddress: receiverAddress },
    });
    if (!sender || !receiver) {
      throw new NotFoundError('Unknown sender or receiver');
    }

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
      receiver,
    });

    const transaction = (await Transaction.findByPk(transactionId, {
      include: [
        {
          model: Account,
          as: 'senderAccount',
        },
        {
          model: Account,
          as: 'receiverAccount',
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

  private async createTransfer(params: {
    sender: Account;
    receiver: Account;
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
        return this.createCryptoToFiatTransfer({
          ...params,
          sentTokenAddress: params.sentTokenAddress!,
          receivedAmount: params.receivedAmount!,
        });
      default:
        throw new BadRequestError('unknown transfer_type');
    }
  }

  private async createCryptoToCryptoTransfer(params: {
    sender: Account;
    receiver: Account;
    sentAmount: number;
    sentTokenAddress: string;
    receivedTokenAddress: string;
    opts: { dbTransaction: DBTransaction };
  }) {
    const {
      sender,
      receiver,
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

    const amountInSmallestUnit = this.convertToSmallestUnit(
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
        receiver: receiver.id,
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
    receiver: Account;
    sentAmount: number;
    transferType: TRANSFER_TYPE;
    opts: { dbTransaction: DBTransaction };
  }) {
    const { sender, receiver, sentAmount, opts } = params;

    const amountInSmallestUnit = this.convertToSmallestUnit(sentAmount, 18);
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
        receiver: receiver.id,
        sentAmount: amountInSmallestUnit.toString(),
        status: 'INIT',
        transferType: 'NATIVE_TO_NATIVE',
      },
      { transaction: opts?.dbTransaction },
    );
  }

  private async createCryptoToFiatTransfer(params: {
    sender: Account;
    receiver: Account;
    sentTokenAddress: string;
    sentAmount: number;
    receivedAmount: number;
    transferType: TRANSFER_TYPE;
    opts: { dbTransaction: DBTransaction };
  }) {
    const {
      sender,
      receiver,
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

    const sentAmountInSmallestUnit = this.convertToSmallestUnit(
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

    const receivedAmountInSmallestUnit = this.convertToSmallestUnit(
      receivedAmount,
      2,
    ); //IDRT decimals precision is 2
    return await Transaction.create(
      {
        sender: sender.id,
        receiver: receiver.id,
        sentToken: sentToken?.id,
        sentAmount: sentAmountInSmallestUnit.toString(),
        receivedAmount: receivedAmountInSmallestUnit.toString(),
        status: 'INIT',
        transferType: 'CRYPTO_TO_FIAT',
      },
      { transaction: opts?.dbTransaction },
    );
  }

  private convertToSmallestUnit(amount: number, decimals: number) {
    const tokenDecimals = BigNumber(decimals);
    const ten = new BigNumber('10');
    return BigNumber(amount!).multipliedBy(ten.pow(tokenDecimals));
  }

  private convertToBiggestUnit(amount: string, decimals: number) {
    const tokenDecimals = BigNumber(decimals);
    const ten = new BigNumber('10');
    return BigNumber(amount!).dividedBy(ten.pow(tokenDecimals)).toNumber();
  }

  private async createTransactionSteps(
    transaction: Transaction,
    dbTransaction: DBTransaction,
  ) {
    const steps: TransactionStep[] = [];

    steps.push(await this.createCryptoTransferStep(transaction, dbTransaction));
    if (transaction.transferType === TRANSFER_TYPE.CRYPTO_TO_FIAT) {
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
      receiverAccount,
      sentTokenDetails,
      sentAmount: tokenAmount,
    } = transaction;
    notNull(new BadRequestError('senderAccount is required'), senderAccount);
    notNull(new BadRequestError('sentAmount is required'), tokenAmount);

    let senderAddress;
    let receiverAddress;
    if (transaction.transferType === TRANSFER_TYPE.CRYPTO_TO_FIAT) {
      senderAddress = senderAccount!.accountAbstractionAddress;
      receiverAddress = langitAdmin.address;
    } else {
      notNull(
        new BadRequestError('receiverAccount is required'),
        receiverAccount,
      );
      senderAddress = senderAccount!.accountAbstractionAddress;
      receiverAddress = receiverAccount!.accountAbstractionAddress;
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
    notNull(
      new BadRequestError('sentTokenDetails is required'),
      sentTokenDetails,
    );
    notNull(new BadRequestError('tokenAmount is required'), tokenAmount);
    notNull(new BadRequestError('recievedAmount is required'), fiatAmount);

    return await TransactionStep.create(
      {
        id: uuid(),
        transactionId: transaction.id,
        type: 'EXCHANGE_TO_FIAT',
        status: 'INIT',
        priority: 1,
        tokenAddress: sentTokenDetails!.address,
        tokenAmount,
        fiatAmount,
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
      case 'EXCHANGE_TO_FIAT':
        {
          //TODO: calculate from real token decimals
          const tokenAmount = this.convertToBiggestUnit(
            transactionStep.tokenAmount!,
            18,
          );
          const fiatAmount = this.convertToBiggestUnit(
            transactionStep.fiatAmount!,
            2,
          );
          externalId = await this.exchangeService.exchangeTokenToFiat(
            tokenAmount,
            fiatAmount,
            { dbTransaction },
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
  }

  async finalizeTransactionStep(
    externalId: string,
    status: 'SUCCESS' | 'FAILED',
    transactionHash?: string,
    opts?: { dbTransaction: DBTransaction },
  ) {
    const step = await TransactionStep.findOne({
      where: { externalId },
    });
    notNull(
      new NotFoundError(
        `transaction step not found for externalId: ${externalId}`,
      ),
      step,
    );
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

    if (steps!.length === 0) {
      const transactionStatus = status === 'SUCCESS' ? 'SENT' : 'FAILED';
      await Transaction.update(
        { status: transactionStatus },
        {
          where: { id: step!.transactionId },
          transaction: opts?.dbTransaction,
        },
      );
    } else {
      await this.executeTransactionStep(steps[0], opts?.dbTransaction!);
    }
  }
}
