import { split } from 'shamir-secret-sharing';
import ConflictError from '../errors/conflict';
import { Account } from '../models/Account';
import { mustBeNull, mustBeTrue, notNull } from '../utils/assert';
import { hashPassword, verifyPassword } from '../utils/password';
import { sendEmail } from '../utils/send-email';
import {
  recoverPrivateKey,
  shamirKeyToReadableString,
} from '../utils/shamir-key';
import { ethers } from 'ethers';
import axios from 'axios';
import ENVIRONMENT from '../config/environment';
import { encryptToKMS } from '../utils/kms';
import ChainTransactionService from './chainTransactionService';
import NotFoundError from '../errors/not-found';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/auth';
import Unauthorized from '../errors/unauthorized';
import BadRequestError from '../errors/bad-request';
import { Transaction as DBTransaction } from 'sequelize';

export default class AccountService {
  private chainTransactionService;

  constructor() {
    this.chainTransactionService = new ChainTransactionService();
  }

  async createAccount(params: {
    email: string;
    password?: string;
    opts: { dbTransaction: DBTransaction };
  }) {
    const { email, password, opts } = params;
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

    const { accountAbstractionAddress, userOperationHash } =
      await this.chainTransactionService.deployAccountAbstraction(
        email,
        privateKey,
        opts,
      );
    const account = await Account.create(
      {
        email,
        password: password ? await hashPassword(password) : password,
        address,
        encryptedShard,
        accountAbstractionAddress,
        userOperationHash,
        status: 'INIT',
      },
      {
        transaction: opts.dbTransaction,
      },
    );
    await sendEmail(
      email,
      'Your Secret Key',
      `Your secret Key: ${shamirKeyToReadableString(shares[1])}`,
    );
    const tokens = await this._generateToken(account);

    return {
      id: account.id,
      shardDevice: shamirKeyToReadableString(shares[2]),
      ...tokens,
    };
  }

  async createAccountWithGoogleToken(
    googleCode: string,
    opts: { dbTransaction: DBTransaction },
  ) {
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

    return await this.createAccount({ email, opts });
  }

  async recoverAccount(email: string, shardEmail: string) {
    const account = await Account.findOne({
      where: { email },
    });
    notNull(new NotFoundError('account not found'), account);

    const privateKey = await recoverPrivateKey(
      account!.encryptedShard,
      shardEmail,
    );
    const wallet = new ethers.Wallet(privateKey);
    mustBeTrue(
      new BadRequestError('key not match'),
      account!.address === wallet.address,
    );

    const encoder = new TextEncoder();
    const shares = await split(encoder.encode(privateKey), 3, 2);
    const shardKMS = shamirKeyToReadableString(shares[0]);
    const encryptedShard = await encryptToKMS(shardKMS);
    await account!.update({ encryptedShard });
    const tokens = await this._generateToken(account!);
    return {
      id: account!.id,
      shardDevice: shamirKeyToReadableString(shares[2]),
      ...tokens,
    };
  }

  async generateToken(accountId: string) {
    const account = await Account.findByPk(accountId);
    notNull(new NotFoundError('account is not found'), account);

    return this._generateToken(account!);
  }

  private async _generateToken(account: Account) {
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
    };
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
      decoded.type === 'account',
    );
    const account = await Account.findByPk(decoded.id);
    notNull(new Unauthorized('invalid credentials'), account);

    const accessToken = generateAccessToken({
      id: account!.id,
      email: account!.email,
      type: 'account',
    });
    return accessToken;
  }

  async fetchAccount(accountId: string) {
    const account = await Account.findByPk(accountId);
    return account
      ? {
          id: account.id,
          email: account.email,
          address: account.address,
          accountAbstractionAddress: account.accountAbstractionAddress,
          status: account.status,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        }
      : {};
  }

  async login(email: string, password: string) {
    const account = await Account.findOne({ where: { email } });
    notNull(new NotFoundError('invalid credentials'), account);
    mustBeTrue(
      new NotFoundError('invalid credentials'),
      await verifyPassword(password, account!.password),
    );

    const tokens = await this._generateToken(account!);
    return {
      id: account!.id,
      ...tokens,
    };
  }
}
