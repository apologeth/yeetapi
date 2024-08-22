import BadRequestError from '../errors/bad-request';
import { Token } from '../models/Token';
import { BigNumber, ethers } from 'ethers';
import { Transaction } from '../models/Transaction';
import { Account } from '../models/Account';
import NotFoundError from '../errors/not-found';
import { mustBeTrue } from '../utils/assert';
import { recoverPrivateKey } from '../utils/shamir-key';
import { TransactionStep } from '../models/TransactionStep';
import ChainTransactionService from './chainTransactionService';
import SimpleToken from '../contracts/SimpleToken.json';
import { provider } from '../utils/contracts';

export default class TransactionService {
  private chainTransactionService;

  constructor() {
    this.chainTransactionService = new ChainTransactionService();
  }

  async create(params: {
    senderAddress: string;
    shardDevice: string;
    receiverAddress: string;
    sentAmount?: number;
    receivedAmount?: number;
    sentTokenAddress: string;
    receivedTokenAddress: string;
  }) {
    const {
      senderAddress,
      shardDevice,
      receiverAddress,
      sentAmount,
      receivedAmount,
      sentTokenAddress,
      receivedTokenAddress,
    } = params;

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

    if (!sentAmount && !receivedAmount) {
      throw new BadRequestError(
        'sentAmount or receivedAmount must be not undefined',
      );
    }

    const sentToken = await Token.findOne({
      where: { address: sentTokenAddress },
    });
    const receivedToken = await Token.findOne({
      where: { address: receivedTokenAddress },
    });

    if (!sentToken) {
      throw new BadRequestError('Unknown sent token');
    }

    if (!receivedToken) {
      throw new BadRequestError('Unknown received token');
    }

    const ten = BigNumber.from('10');
    const sentAmountInSmallestUnit = BigNumber.from(sentAmount).mul(
      ten.pow(BigNumber.from(sentToken.decimals)),
    );
    const receivedAmountInSmallestUnit = BigNumber.from(
      receivedAmount ?? sentAmount,
    ).mul(ten.pow(BigNumber.from(receivedToken.decimals)));

    const sentTokenContract = new ethers.Contract(
      sentToken.address,
      SimpleToken.abi,
      provider,
    );
    const senderAccountBalance = await sentTokenContract.balanceOf(
      sender.accountAbstractionAddress,
    );
    if (sentAmountInSmallestUnit.gt(senderAccountBalance)) {
      throw new BadRequestError('Insufficient balance');
    }

    let transaction = await Transaction.create({
      sender: sender.id,
      receiver: receiver.id,
      sentToken: sentToken.id,
      receivedToken: receivedToken.id,
      sentAmount: sentAmountInSmallestUnit.toString(),
      receivedAmount: receivedAmountInSmallestUnit.toString(),
      status: 'INIT',
    });
    transaction = (await Transaction.findByPk(transaction.id, {
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
          as: 'sentTokenObject',
        },
        {
          model: Token,
          as: 'receivedTokenObject',
        },
      ],
    }))!;
    const step = await TransactionStep.create({
      transactionId: transaction.id,
      type: 'CHAIN_TRANSACTION',
      status: 'INIT',
    });

    const externalId = await this.chainTransactionService.transferToken(
      transaction,
      privateKey,
    );
    await step.update({
      externalId,
      status: 'PROCESSING',
    });

    return transaction;
  }

  async fetch(transactionId: string) {
    return (await Transaction.findByPk(transactionId))?.dataValues;
  }
}
