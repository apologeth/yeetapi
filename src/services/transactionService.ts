import BadRequestError from '../errors/bad-request';
import { Token } from '../models/Token';
import { BigNumber, ethers } from 'ethers';
import { Transaction } from '../models/Transaction';
import { Account } from '../models/Account';
import NotFoundError from '../errors/not-found';
import { decryptFromKMS } from '../utils/kms';
import { mustBeTrue, notNull } from '../utils/assert';
import { shamirKeyFromReadableString } from '../utils/shamir-key';
import { combine } from 'shamir-secret-sharing';

export default class TransactionService {
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

    const decoder = new TextDecoder();
    const _shardKMS = await decryptFromKMS(sender!.encryptedShard);
    notNull(new NotFoundError('shard key not found'), _shardKMS);
    const shardKMS = shamirKeyFromReadableString(_shardKMS!);
    const secondShareKey = shamirKeyFromReadableString(shardDevice);
    const combined = await combine([shardKMS, secondShareKey]);

    const privateKey = decoder.decode(combined);
    console.log(privateKey);
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
    const transaction = await Transaction.create({
      sender: sender.id,
      receiver: receiver.id,
      sentToken: sentToken.id,
      receivedToken: receivedToken.id,
      sentAmount: sentAmountInSmallestUnit.toString(),
      receivedAmount: receivedAmountInSmallestUnit.toString(),
      status: 'INIT',
    });

    return transaction;
  }
}
