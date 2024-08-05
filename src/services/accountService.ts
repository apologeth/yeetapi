import { combine, split } from 'shamir-secret-sharing';
import ConflictError from '../errors/conflict';
import { Account } from '../models/Account';
import { mustBeNull, mustBeTrue, notNull } from '../utils/assert';
import { hashPassword } from '../utils/password';
import { sendEmail } from '../utils/send-email';
import { shamirKeyFromReadableString, shamirKeyToReadableString } from '../utils/shamir-key';
import { ethers } from 'ethers';
import axios from 'axios';
import ENVIRONMENT from '../config/environment';
import { decryptFromKMS, encryptToKMS } from '../utils/kms';
import LangitAccount from '../contracts/LangitAccount.json';
import ChainTransactionService from './chainTransactionService';
import NotFoundError from '../errors/not-found';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/auth';
import Unauthorized from '../errors/unauthorized';
import BadRequestError from '../errors/bad-request';

type CreateAccountResult = {
  account: Account;
  shardDevice: string;
};

export default class AccountService {
  private chainTransactionService;

  constructor() {
    this.chainTransactionService = new ChainTransactionService();
  }

  async createAccount(
    email: string,
    password?: string,
  ): Promise<CreateAccountResult> {
    const existingAccount = await Account.findOne({ where: { email } });
    mustBeNull(
      new ConflictError(`email: ${email} is already registered`),
      existingAccount,
    );

    // Generate ETH private key
    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;
    const address = wallet.address;

    // Perform Shamir's secret sharing
    const encoder = new TextEncoder();
    const shares = await split(encoder.encode(privateKey), 3, 2);
    const shardKMS = shamirKeyToReadableString(shares[0]);
    const encryptedShard = await encryptToKMS(shardKMS);

    await sendEmail(
      email,
      'Your Secret Key',
      `Your secret Key: ${shamirKeyToReadableString(shares[1])}`,
    );
    const { accountAbstractionAddress, userOperationHash } =
      await this.chainTransactionService.deployAccountAbstraction(
        email,
        privateKey,
      );

    return {
      account: await Account.create({
        email,
        password: password ? await hashPassword(password) : password,
        address,
        encryptedShard,
        accountAbstractionAddress,
        userOperationHash,
        status: 'INIT',
      }),
      shardDevice: shamirKeyToReadableString(shares[2]),
    };
  }

  async createAccountWithGoogleToken(
    googleCode: string,
  ): Promise<CreateAccountResult> {
    const resFromGoogle = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code: googleCode,
        client_id: ENVIRONMENT.GOOGLE_CLIENT_ID,
        client_secret: ENVIRONMENT.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'http://localhost:3000/api/accounts/google-auth',
        grant_type: 'authorization_code',
      },
    );
    const accessToken = resFromGoogle.data.access_token;

    const userResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const userDetails = userResponse.data;
    const email = userDetails.email;

    return await this.createAccount(email);
  }

  async recoverAccount(email: string, shardEmail: string): Promise<{
    account: Account,
    shardDevice: string,
  }> {
    const account = await Account.findOne({
      where: { email },
    });
    notNull(new NotFoundError('account not found'), account);

    const decoder = new TextDecoder();
    const _shardKMS = await decryptFromKMS(account!.encryptedShard);
    notNull(new NotFoundError('shard key not found'), _shardKMS);
    const shardKMS = shamirKeyFromReadableString(_shardKMS!);
    const secondShareKey = shamirKeyFromReadableString(shardEmail);
    const combined = await combine([shardKMS, secondShareKey]);

    const privateKey = decoder.decode(combined);
    const wallet = new ethers.Wallet(privateKey);
    mustBeTrue(
      new BadRequestError('key not match'),
      account!.address === wallet.address,
    );

    const encoder = new TextEncoder();
    const shares = await split(encoder.encode(privateKey), 3, 2);
    return {
      account: account!,
      shardDevice: shamirKeyToReadableString(shares[2]),
    };
  }

  async generateToken(accountId: string) {
    const account = await Account.findByPk(accountId);
    notNull(new NotFoundError('account is not found'), account);

    const accessToken = generateAccessToken({
      id: account!.id,
      email: account!.email,
      type: 'account',
    });
    const refreshToken = generateRefreshToken({
      id: account!.id,
      email: account!.email,
      type: 'account',
    });

    return {
      accessToken,
      refreshToken,
    }
  }

  async refreshToken(token: string) {
    notNull(new Unauthorized('missing refresh token'), token);

    const decoded = verifyRefreshToken(token) as {
      id: string;
      email: string;
      type: string;
    };

    mustBeTrue(
      new Unauthorized('must be account token'),
      decoded.type === 'account'
    );
    const account = await Account.findByPk(decoded.id);
    notNull(
      new Unauthorized('invalid credentials'),
      account
    );

    const accessToken = generateAccessToken({
      id: account!.id,
      email: account!.email,
      type: 'account',
    });
    return accessToken;
  }

  async fetchAccount(accountId: string) {
    const account = await Account.findByPk(accountId);
    return account ? {
      id: account.id,
      email: account.email,
      address: account.address,
      accountAbstractionAddress: account.accountAbstractionAddress,
      status: account.status,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    } : {}
  }
}
