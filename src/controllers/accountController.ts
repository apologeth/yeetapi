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
      const { accessToken, refreshToken } = await this.accountService.generateToken(account.id);

      createSuccessResponse(response, {
        id: account.id,
        accessToken,
        refreshToken,
        shardDevice,
      });
    } catch (error: any) {
      console.log(error);
      createErrorResponse(response, error);
    }
  }

  async authWithGoogle(request: Request, response: Response) {
    try {
      const { googleCode } = snakeToCamel(request.body);
      notNull(new BadRequestError('google_code is required'), googleCode);

      const { account, shardDevice } =
        await this.accountService.createAccountWithGoogleToken(googleCode);
      const { accessToken, refreshToken } = await this.accountService.generateToken(account.id);

      createSuccessResponse(response, {
        id: account.id,
        accessToken,
        refreshToken,
        shardDevice,
      });
    } catch (error: any) {
      console.log(error);
      createErrorResponse(response, error);
    }
  }

  async recoverAccount(request: Request, response: Response) {
    try {
      //shamirKey from email
      const { email, shardEmail } = snakeToCamel(request.body);
      notNull(new BadRequestError('email is required'), email);
      notNull(new BadRequestError('shard_email is required'), shardEmail);
      
      const { account, shardDevice } =
        await this.accountService.recoverAccount(email, shardEmail);
      const { accessToken, refreshToken } = await this.accountService.generateToken(account.id);
  
      createSuccessResponse(response, {
        id: account.id,
        accessToken,
        refreshToken,
        shardDevice,
      });
    } catch (error: any) {
      createErrorResponse(response, error);
    }
  }

  async fetchAccount(request: Request, response: Response) {
    try {
      //shamirKey from email
      const accountId = request.params.id;
      const authAccountId = (request as any).auth.id;
      notNull(new BadRequestError('id is required'), accountId);
      mustBeTrue(new BadRequestError('invalid credentials'), authAccountId === accountId);
  
      createSuccessResponse(response, await this.accountService.fetchAccount(accountId));
    } catch (error: any) {
      createErrorResponse(response, error);
    }
  }
}
