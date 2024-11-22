import BadRequestError from '../errors/bad-request';
import { Token } from '../models/Token';
import { ethers } from 'ethers';
import {
  Transaction,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  TRANSFER_TYPE,
} from '../models/Transaction';
import { Account } from '../models/Account';
import NotFoundError from '../errors/not-found';
import { mustBeTrue, notNull } from '../utils/assert';
import { recoverPrivateKey } from '../utils/shamir-key';
import {
  TRANSACTION_STEP_TYPE,
  TRANSACTION_STEP_STATUS,
  TransactionStep,
} from '../models/TransactionStep';
import ChainTransactionService from './chainTransactionService';
import SimpleToken from '../contracts/SimpleToken.json';
import { provider } from '../utils/contracts';
import { Transaction as DBTransaction } from 'sequelize';
import ExchangeService from './exchangeService';
import { straxAdmin } from '../utils/user-operation';
import { v4 as uuid } from 'uuid';
import {
  convertToBiggestUnit,
  convertToSmallestUnit,
} from '../utils/conversion';
import WalletService from './walletService';
import { isEmail } from '../utils/send-email';
import InternalServerError from '../errors/internal-server-error';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import { fiatTokenAddress, nativeTokenAddress } from '../utils/const';
import ENVIRONMENT from '../config/environment';
import ProductService from './productService';

export default class TransactionService {
  private chainTransactionService: ChainTransactionService;
  private exchangeService: ExchangeService;
  private walletService: WalletService;
  private productService: ProductService;

  constructor() {
    this.chainTransactionService = new ChainTransactionService();
    this.exchangeService = new ExchangeService();
    this.walletService = new WalletService();
    this.productService = new ProductService();
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
      sentAmount = convertToBiggestUnit(
        sentAmount!,
        transaction?.sentTokenDetails.decimals,
      );
    } else if (transaction?.transferType?.includes('NATIVE')) {
      sentAmount = convertToBiggestUnit(sentAmount!, 18);
    } else if (transaction?.type === 'BUY_TOKEN') {
      sentAmount = convertToBiggestUnit(sentAmount!, 2);
    }

    let receivedAmount: any = transaction?.receivedAmount;
    if (transaction?.receivedTokenDetails) {
      receivedAmount = convertToBiggestUnit(
        receivedAmount!,
        transaction?.receivedTokenDetails.decimals,
      );
    } else if (transaction?.transferType?.includes('TO_FIAT')) {
      receivedAmount = convertToBiggestUnit(receivedAmount!, 2);
    } else if (transaction?.transferType?.includes('TO_NATIVE')) {
      receivedAmount = convertToBiggestUnit(receivedAmount!, 18);
    }

    const {
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
    } = transaction!;
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
    };
  }

  async create(params: {
    senderAddress?: string;
    shardDevice?: string;
    receiverAddress?: string;
    sentAmount?: number;
    receivedAmount?: number;
    sentTokenAddress?: string;
    receivedTokenAddress?: string;
    productCode?: string;
    customerId?: string;
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
      case 'BUY_PRODUCT':
        notNull(
          new BadRequestError('sender_address is required'),
          params.senderAddress,
        );
        notNull(
          new BadRequestError('shard_device is required'),
          params.shardDevice,
        );
        notNull(
          new BadRequestError('product_code is required'),
          params.productCode,
        );
        notNull(
          new BadRequestError('customer_id is required'),
          params.customerId,
        );

        return this.buyProduct({
          ...params,
          shardDevice: params.shardDevice!,
          senderAddress: params.senderAddress!,
          productCode: params.productCode!,
          customerId: params.customerId!,
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
    const { senderAddress, shardDevice, receiverAddress, opts } = params;

    const sender = await Account.findOne({
      where: { accountAbstractionAddress: senderAddress },
    });
    if (!sender) {
      throw new NotFoundError('Unknown sender');
    }

    const receiver = await this.getReceiver(receiverAddress);

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

    const fiatToken = await Token.findOne({
      where: { address: fiatTokenAddress },
    });
    const token = await Token.findOne({
      where: { address: receivedTokenAddress ?? nativeTokenAddress },
    });

    const amountInSmallestUnit = convertToSmallestUnit(
      receivedAmount,
      token!.decimals!,
    );
    const adminBalance =
      receivedTokenAddress && receivedTokenAddress !== nativeTokenAddress
        ? await new ethers.Contract(
            receivedTokenAddress!,
            SimpleToken.abi,
            provider,
          ).balanceOf(straxAdmin.address)
        : await provider.getBalance(straxAdmin.address);

    mustBeTrue(
      new BadRequestError('Insufficient admin balance'),
      amountInSmallestUnit.lte(adminBalance.toString()),
    );

    const tokenPriceInIDR = (await this.exchangeService.getTokenAmount(1))
      .price;
    const amountToSend = receivedAmount * tokenPriceInIDR;
    const { id: transactionId } = await Transaction.create(
      {
        sender: receiver.id,
        receiver: receiver.id,
        sentToken: fiatToken!.id,
        receivedToken: token!.id,
        sentAmount: convertToSmallestUnit(
          amountToSend,
          fiatToken!.decimals,
        ).toString(),
        receivedAmount: amountInSmallestUnit.toString(),
        status: TRANSACTION_STATUS.INIT,
        type: TRANSACTION_TYPE.BUY_TOKEN,
      },
      { transaction: opts?.dbTransaction },
    );
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
    await this.executeTransactionStep(steps[0], opts.dbTransaction);

    return transaction;
  }

  private async buyProduct(params: {
    senderAddress: string;
    shardDevice: string;
    productCode: string;
    customerId: string;
    sentTokenAddress?: string;
    opts: { dbTransaction: DBTransaction };
  }) {
    const { senderAddress, shardDevice, productCode, customerId, sentTokenAddress, opts } = params;

    const sender = await Account.findOne({
      where: { accountAbstractionAddress: senderAddress },
    });
    if (!sender) {
      throw new NotFoundError('Unknown sender');
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

    const product = this.productService.getProductByProductCode(productCode);
    notNull(new NotFoundError('unknown product code'), product);
    const receivedAmount = product!.product_price;
    const { tokenAmount: sentAmount } =
      await this.exchangeService.getTokenAmount(receivedAmount);

    const sentToken = await Token.findOne({ where: { address: sentTokenAddress ?? nativeTokenAddress }});
    const sentAmountInSmallestUnit = convertToSmallestUnit(
      sentAmount,
      sentToken!.decimals,
    );
    let senderAccountBalance;
    if (sentTokenAddress !== nativeTokenAddress) {
      const sentTokenContract = new ethers.Contract(
        sentToken!.address,
        SimpleToken.abi,
        provider,
      );
      senderAccountBalance = await sentTokenContract.balanceOf(
        sender.accountAbstractionAddress,
      );
    } else {
      senderAccountBalance = await provider.getBalance(sender.accountAbstractionAddress);
    }
    mustBeTrue(
      new BadRequestError('Insufficient balance'),
      sentAmountInSmallestUnit.lte(senderAccountBalance.toString()),
    );

    const receivedToken = await Token.findOne({ where: { address: fiatTokenAddress }});
    const receivedAmountInSmallestUnit = convertToSmallestUnit(
      receivedAmount,
      receivedToken!.decimals,
    );
    const adminBalance = await this.productService.getBalance();
    mustBeTrue(
      new BadRequestError('Insufficient admin balance'),
      receivedAmountInSmallestUnit.lte(convertToSmallestUnit(adminBalance, receivedToken!.decimals)),
    );

    const { id: transactionId } = await Transaction.create(
      {
        sender: sender.id,
        receiver: sender.id,
        sentToken: sentToken!.id,
        receivedToken: receivedToken!.id,
        sentAmount: sentAmountInSmallestUnit.toString(),
        receivedAmount: receivedAmountInSmallestUnit.toString(),
        status: TRANSACTION_STATUS.INIT,
        type: TRANSACTION_TYPE.BUY_PRODUCT,
        productCode,
        customerId,
      },
      { transaction: opts?.dbTransaction },
    );

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

  private async getReceiver(receiverAddress: string): Promise<Account> {
    if (!isEmail(receiverAddress) && !ethers.utils.isAddress(receiverAddress)) {
      throw new BadRequestError(
        'receiver address must be either email or EOA or account abstraction',
      );
    }
    const account = await Account.findOne({
      where: isEmail(receiverAddress)
        ? { email: receiverAddress }
        : { accountAbstractionAddress: receiverAddress },
    });
    notNull(
      new BadRequestError('uknonwn email or account abstraction address'),
      account,
    );

    return account!;
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
        return this.createCryptoToCryptoTransfer({
          ...params,
          sentTokenAddress: params.sentTokenAddress!,
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
      case TRANSFER_TYPE.NATIVE_TO_FIAT:
        notNull(
          new BadRequestError('received_amount is required'),
          params.receivedAmount,
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
    receiver: Account;
    sentAmount: number;
    sentTokenAddress: string;
    opts: { dbTransaction: DBTransaction };
  }) {
    const { sender, receiver, sentAmount, sentTokenAddress, opts } = params;

    const sentToken = await Token.findOne({
      where: { address: sentTokenAddress },
    });

    notNull(new BadRequestError('Unknown sent token'), sentToken);

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
        receiver: receiver.id,
        sentToken: sentToken!.id,
        receivedToken: sentToken!.id,
        sentAmount: amountInSmallestUnit.toString(),
        receivedAmount: amountInSmallestUnit.toString(),
        status: TRANSACTION_STATUS.INIT,
        transferType: TRANSFER_TYPE.CRYPTO_TO_CRYPTO,
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

    const token = await Token.findOne({
      where: { address: nativeTokenAddress },
    });
    notNull(new InternalServerError('Native token has not been set'), token);

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
        receiver: receiver.id,
        sentToken: token!.id,
        receivedToken: token!.id,
        sentAmount: amountInSmallestUnit.toString(),
        receivedAmount: amountInSmallestUnit.toString(),
        status: TRANSACTION_STATUS.INIT,
        transferType: TRANSFER_TYPE.NATIVE_TO_NATIVE,
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
    const receivedToken = await Token.findOne({
      where: { address: fiatTokenAddress },
    });
    notNull(new BadRequestError('Unknown sent token'), sentToken);
    notNull(
      new InternalServerError('fiat token has not been set'),
      receivedToken,
    );

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
      receivedToken!.decimals,
    );
    return await Transaction.create(
      {
        sender: sender.id,
        receiver: receiver.id,
        sentToken: sentToken!.id,
        receivedToken: receivedToken!.id,
        sentAmount: sentAmountInSmallestUnit.toString(),
        receivedAmount: receivedAmountInSmallestUnit.toString(),
        status: TRANSACTION_STATUS.INIT,
        transferType: TRANSFER_TYPE.CRYPTO_TO_FIAT,
      },
      { transaction: opts?.dbTransaction },
    );
  }

  private async createNativeToFiatTransfer(params: {
    sender: Account;
    receiver: Account;
    sentAmount: number;
    receivedAmount: number;
    transferType: TRANSFER_TYPE;
    opts: { dbTransaction: DBTransaction };
  }) {
    const { sender, receiver, sentAmount, receivedAmount, opts } = params;

    const sentToken = await Token.findOne({
      where: { address: nativeTokenAddress },
    });
    const receivedToken = await Token.findOne({
      where: { address: fiatTokenAddress },
    });
    notNull(
      new InternalServerError('native token has not been set'),
      sentToken,
    );
    notNull(
      new InternalServerError('fiat token has not been set'),
      receivedToken,
    );
    const sentAmountInSmallestUnit = convertToSmallestUnit(
      sentAmount,
      sentToken!.decimals,
    );
    const nativeTokenBalance = await provider.getBalance(
      sender.accountAbstractionAddress,
    );
    mustBeTrue(
      new BadRequestError('Insufficient balance'),
      sentAmountInSmallestUnit.lte(nativeTokenBalance.toString()),
    );
    return await Transaction.create(
      {
        sender: sender.id,
        receiver: receiver.id,
        sentToken: sentToken!.id,
        receivedToken: receivedToken!.id,
        sentAmount: sentAmountInSmallestUnit.toString(),
        receivedAmount: convertToSmallestUnit(
          receivedAmount,
          receivedToken!.decimals,
        ).toString(),
        status: TRANSACTION_STATUS.INIT,
        transferType: TRANSFER_TYPE.NATIVE_TO_FIAT,
      },
      { transaction: opts?.dbTransaction },
    );
  }

  private async createTransactionSteps(
    transaction: Transaction,
    dbTransaction: DBTransaction,
  ) {
    const steps: TransactionStep[] = [];

    switch (transaction.type) {
      case TRANSACTION_TYPE.TRANSFER:
        {
          steps.push(
            await this.createAAChainTransactionStep(transaction, dbTransaction),
          );
          if (
            transaction.transferType === TRANSFER_TYPE.CRYPTO_TO_FIAT ||
            transaction.transferType === TRANSFER_TYPE.NATIVE_TO_FIAT
          ) {
            steps.push(
              await this.createWalletTransferStep(transaction, dbTransaction),
            );
          }
        }
        break;
      case TRANSACTION_TYPE.BUY_TOKEN:
        {
          steps.push(
            await this.createWalletPaymentStep(transaction, dbTransaction),
          );
          steps.push(
            await this.createEOAChainTransactionStep(
              transaction,
              dbTransaction,
            ),
          );
        }
        break;
      case TRANSACTION_TYPE.BUY_PRODUCT:
        {
          steps.push(
            await this.createAAChainTransactionStep(transaction, dbTransaction),
          );
          steps.push(
            await this.createProductTopUp(
              transaction,
              dbTransaction,
            ),
          );
        }
        break;
      default:
        throw new InternalServerError(
          'Failed to create transaction steps, unknown transfer type',
        );
    }

    return steps;
  }

  private async createAAChainTransactionStep(
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

    let sender;
    let receiver;
    if (
      transaction.type === TRANSACTION_TYPE.BUY_PRODUCT ||
      transaction.transferType === TRANSFER_TYPE.CRYPTO_TO_FIAT ||
      transaction.transferType === TRANSFER_TYPE.NATIVE_TO_FIAT
    ) {
      sender = senderAccount!.accountAbstractionAddress;
      receiver = straxAdmin.address;
    } else {
      sender = senderAccount!.accountAbstractionAddress;
      receiver = receiverAccount!.accountAbstractionAddress;
    }

    return await TransactionStep.create(
      {
        id: uuid(),
        transactionId: transaction.id,
        type: TRANSACTION_STEP_TYPE.AA_CHAIN_TRANSACTION,
        status: TRANSACTION_STEP_STATUS.INIT,
        priority: 0,
        sender,
        receiver,
        tokenAddress: sentTokenDetails!.address,
        tokenAmount,
      },
      { transaction: dbTransaction },
    );
  }

  private async createWalletTransferStep(
    transaction: Transaction,
    dbTransaction: DBTransaction,
  ) {
    const { receiverAccount, receivedAmount: fiatAmount } = transaction;
    notNull(new BadRequestError('recievedAmount is required'), fiatAmount);

    return await TransactionStep.create(
      {
        id: uuid(),
        transactionId: transaction.id,
        type: TRANSACTION_STEP_TYPE.WALLET_TRANSFER,
        status: TRANSACTION_STATUS.INIT,
        priority: 1,
        sender: ENVIRONMENT.PULLING_ACCOUNT_ID,
        receiver: receiverAccount!.fiatWalletId!,
        fiatAmount,
        receiverAddress: transaction.receiver,
      },
      { transaction: dbTransaction },
    );
  }

  private async createWalletPaymentStep(
    transaction: Transaction,
    dbTransaction: DBTransaction,
  ) {
    const { senderAccount, sentAmount: fiatAmount } = transaction;
    notNull(new BadRequestError('recievedAmount is required'), fiatAmount);

    return await TransactionStep.create(
      {
        id: uuid(),
        transactionId: transaction.id,
        type: TRANSACTION_STEP_TYPE.WALLET_PAYMENT,
        status: TRANSACTION_STATUS.INIT,
        priority: 0,
        sender: senderAccount!.fiatWalletId!,
        receiver: ENVIRONMENT.PULLING_ACCOUNT_ID,
        fiatAmount,
      },
      { transaction: dbTransaction },
    );
  }

  private async createEOAChainTransactionStep(
    transaction: Transaction,
    dbTransaction: DBTransaction,
  ) {
    const {
      receiverAccount,
      receivedTokenDetails,
      receivedAmount: tokenAmount,
    } = transaction;
    notNull(
      new BadRequestError('receiverAccount is required'),
      receiverAccount,
    );
    notNull(new BadRequestError('receivedAmount is required'), tokenAmount);

    return await TransactionStep.create(
      {
        id: uuid(),
        transactionId: transaction.id,
        type: TRANSACTION_STEP_TYPE.EOA_CHAIN_TRANSACTION,
        status: TRANSACTION_STEP_STATUS.INIT,
        priority: 1,
        sender: straxAdmin.address,
        receiver: receiverAccount!.accountAbstractionAddress,
        tokenAddress: receivedTokenDetails!.address!,
        tokenAmount,
      },
      { transaction: dbTransaction },
    );
  }

  private async createProductTopUp(
    transaction: Transaction,
    dbTransaction: DBTransaction,
  ) {
    const { senderAccount, sentAmount: fiatAmount } = transaction;
    notNull(new BadRequestError('recievedAmount is required'), fiatAmount);

    return await TransactionStep.create(
      {
        id: uuid(),
        transactionId: transaction.id,
        type: TRANSACTION_STEP_TYPE.PRODUCT_TOPUP,
        status: TRANSACTION_STATUS.INIT,
        priority: 0,
        receiver: transaction.customerId,
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
      case TRANSACTION_STEP_TYPE.AA_CHAIN_TRANSACTION:
        {
          mustBeTrue(
            new BadRequestError(
              'privateKey is required for this transaction step',
            ),
            privateKey != null,
          );
          externalId = await this.chainTransactionService.aaTransfer(
            transactionStep,
            privateKey!,
            { dbTransaction },
          );
        }
        break;
      case TRANSACTION_STEP_TYPE.EOA_CHAIN_TRANSACTION:
        {
          externalId = await this.chainTransactionService.eoaTransfer(
            transactionStep,
            { dbTransaction },
          );
        }
        break;
      case TRANSACTION_STEP_TYPE.WALLET_TRANSFER:
        {
          const fiatToken = await Token.findOne({
            where: { address: fiatTokenAddress },
          });
          externalId = await this.walletService.transfer(
            transactionStep.receiver!,
            Number(convertToBiggestUnit(
              transactionStep.fiatAmount!,
              fiatToken!.decimals,
            ).toFixed(0)),
          );
        }
        break;
      case TRANSACTION_STEP_TYPE.WALLET_PAYMENT:
        {
          const account = await Account.findOne({
            where: { fiatWalletId: transactionStep.sender! },
          });
          const fiatToken = await Token.findOne({
            where: { address: fiatTokenAddress },
          });
          const { TransactionId, PaymentNo: paymentCode } =
            await this.walletService.createPayment({
              referenceId: transactionStep.transactionId,
              email: account!.email,
              amount: Number(convertToBiggestUnit(
                transactionStep.fiatAmount!,
                fiatToken!.decimals,
              ).toFixed(0)),
            });
          externalId = TransactionId;
          await Transaction.update(
            { paymentCode },
            {
              where: { id: transactionStep.transactionId },
              transaction: dbTransaction,
            },
          );
        }
        break;
      case TRANSACTION_STEP_TYPE.PRODUCT_TOPUP:
        {
          const transaction = await Transaction.findByPk(transactionStep.transactionId);
          externalId  =
            await this.productService.topup(transaction!.productCode!, transaction!.customerId!, transaction!.id);
        }
        break;
      default:
        throw new Error('unknown transaction step type');
    }

    await transactionStep.update(
      {
        externalId,
        status: TRANSACTION_STEP_STATUS.PROCESSING,
      },
      { transaction: dbTransaction },
    );

    if (transactionStep.type === TRANSACTION_STEP_TYPE.WALLET_TRANSFER) {
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
      transaction!.status =
        status === 'SUCCESS'
          ? TRANSACTION_STATUS.SENT
          : TRANSACTION_STATUS.FAILED;
      await transaction!.update(
        { status: transaction!.status },
        {
          transaction: opts?.dbTransaction,
        },
      );
      if (
        transaction!.status === TRANSACTION_STATUS.SENT &&
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
        const transaction = await Transaction.findByPk(step!.transactionId);
        if (
          transaction!.type === TRANSACTION_TYPE.TRANSFER &&
          transaction!.transferType.includes('TO_NATIVE')
        ) {
          // Currently only crypto / native transaction step that need to be reverted.
          await this.revertTransactionStep(step!, opts?.dbTransaction!);
        }
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
    if (step.tokenAddress !== nativeTokenAddress) {
      const token = new ethers.Contract(
        step.tokenAddress!,
        SimpleToken.abi,
        provider,
      );
      callData = token.interface.encodeFunctionData('transfer', [
        step.sender,
        step.tokenAmount,
      ]);
    }
    await straxAdmin.connect(provider).sendTransaction({
      to:
        step.tokenAddress !== nativeTokenAddress
          ? step.tokenAddress!
          : step.sender!,
      value: step.tokenAddress !== nativeTokenAddress ? '0' : step.tokenAmount!,
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

  async fetchSentHistory(
    accountId: string,
    opts?: { offset: number; limit: number },
  ) {
    const offset = opts?.offset ?? 0;
    const limit = opts?.limit ?? 15;

    const transactions = await Transaction.findAll({
      where: {
        [Op.or]: [
          {
            sender: accountId,
            type: 'TRANSFER',
            [Op.or]: [{ status: 'SENT' }, { status: 'FAILED' }],
          },
          {
            receiver: accountId,
            type: 'BUY_TOKEN',
            [Op.or]: [{ status: 'SENT' }, { status: 'FAILED' }],
            sentAmount: {
              [Op.ne]: null,
            },
            receivedAmount: {
              [Op.ne]: null,
            },
          },
        ],
      },
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
      offset,
      limit,
    });
    const data = transactions.map((transaction) => {
      let token;
      if (transaction.type === 'BUY_TOKEN') {
        token = {
          name: 'IDR',
          symbol: 'IDR',
        };
      } else if (transaction.sentTokenDetails) {
        token = {
          name: transaction.sentTokenDetails.name,
          symbol: transaction.sentTokenDetails.symbol,
          address: transaction.sentTokenDetails.address,
        };
      } else {
        token = {
          name: 'x0',
          symbol: 'x0',
        };
      }

      return {
        receiver: transaction.receiverAccount!.accountAbstractionAddress,
        type: transaction.type,
        transferType: transaction.transferType,
        token,
        amount: convertToBiggestUnit(
          transaction.sentAmount,
          transaction.sentTokenDetails!.decimals,
        ),
        fiat_amount:
          transaction.receivedTokenDetails!.address === fiatTokenAddress
            ? convertToBiggestUnit(
                transaction.receivedAmount!,
                transaction.receivedTokenDetails!.decimals,
              )
            : null,
        status: transaction.status,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      };
    });
    return {
      data,
      meta: {
        offset,
        limit,
      },
    };
  }

  async fetchReceivedHistory(
    accountId: string,
    opts?: { offset: number; limit: number },
  ) {
    const offset = opts?.offset ?? 0;
    const limit = opts?.limit ?? 15;

    const transactions = await Transaction.findAll({
      where: {
        [Op.or]: [
          {
            receiver: accountId,
            type: 'TRANSFER',
            [Op.or]: [{ status: 'SENT' }, { status: 'FAILED' }],
          },
          {
            receiver: accountId,
            type: 'BUY_TOKEN',
            [Op.or]: [{ status: 'SENT' }, { status: 'FAILED' }],
            sentAmount: {
              [Op.ne]: null,
            },
            receivedAmount: {
              [Op.ne]: null,
            },
          },
        ],
      },
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
      offset,
      limit,
    });
    const data = transactions.map((transaction) => {
      let token;
      if (transaction.receivedTokenDetails) {
        token = {
          name: transaction.receivedTokenDetails!.name,
          symbol: transaction.receivedTokenDetails!.name,
          address: transaction.receivedTokenDetails!.name,
        };
      } else if (transaction.type.includes('TO_FIAT')) {
        token = {
          name: 'IDR',
          symbol: 'IDR',
        };
      } else {
        token = {
          name: 'x0',
          symbol: 'x0',
        };
      }

      return {
        sender: transaction.senderAccount?.accountAbstractionAddress,
        type: transaction.type,
        transferType: transaction.transferType,
        token,
        amount: convertToBiggestUnit(
          transaction.sentAmount,
          transaction.sentTokenDetails!.decimals,
        ),
        fiat_amount:
          transaction.receivedTokenDetails!.address === fiatTokenAddress
            ? convertToBiggestUnit(
                transaction.receivedAmount!,
                transaction.receivedTokenDetails!.decimals,
              )
            : null,
        status: transaction.status,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      };
    });
    return {
      data,
      meta: {
        offset,
        limit,
      },
    };
  }
}
