import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { split, combine } from 'shamir-secret-sharing';
import { Account } from '../models/Account';
import {
  shamirKeyFromReadableString,
  shamirKeyToReadableString,
} from '../utils/shamir-key';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../utils/create-response';
import { snakeToCamel } from '../utils/conversion';
import BadRequestError from '../errors/bad-request';
import { mustBeTrue, notNull } from '../utils/assert';
import NotFoundError from '../errors/not-found';
import AccountService from '../services/accountService';

export default class AccountController {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

  async createAccount(request: Request, response: Response) {
    try {
      const { email, password } = snakeToCamel(request.body);

      notNull(new BadRequestError('email is required'), email);
      notNull(new BadRequestError('password is required'), password);

      const { account, shardDevice } = await this.accountService.createAccount(
        email,
        password,
      );

      createSuccessResponse(response, {
        address: account.address,
        shardDevice,
      });
    } catch (error: any) {
      createErrorResponse(response, error);
    }
  }

  async authWithGoogle(request: Request, response: Response) {
    try {
      const { googleCode } = snakeToCamel(request.body);
      notNull(new BadRequestError('google_code is required'), googleCode);

      const { account, shardDevice } =
        await this.accountService.createAccountWithGoogleToken(googleCode);

      createSuccessResponse(response, {
        address: account.address,
        shardDevice,
      });
    } catch (error: any) {
      console.log(error);
      createErrorResponse(response, error);
    }
  }
}

export async function recoverAccount(request: Request, response: Response) {
  try {
    //shamirKey from email
    const { email, shamirKey } = snakeToCamel(request.body);
    notNull(new BadRequestError('email is required'), email);
    notNull(new BadRequestError('shamir_key is required'), shamirKey);

    const account = await Account.findOne({
      where: { email },
    });
    notNull(new NotFoundError('account not found'), account);

    const decoder = new TextDecoder();
    const firstShareKey = shamirKeyFromReadableString(account!.encryptedShard);
    const secondShareKey = shamirKeyFromReadableString(shamirKey);
    const combined = await combine([firstShareKey, secondShareKey]);

    const privateKey = decoder.decode(combined);
    const wallet = new ethers.Wallet(privateKey);
    mustBeTrue(
      new BadRequestError('key not match'),
      account!.address === wallet.address,
    );

    const encoder = new TextEncoder();
    const shares = await split(encoder.encode(privateKey), 3, 2);

    createSuccessResponse(response, {
      address: wallet.address,
      shamirKey: shamirKeyToReadableString(shares[2]),
    });
  } catch (error: any) {
    createErrorResponse(response, error);
  }
}
