import { Request, Response } from 'express';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../utils/create-response';
import { snakeToCamel } from '../utils/conversion';
import BadRequestError from '../errors/bad-request';
import { mustBeTrue, notNull } from '../utils/assert';
import AccountService from '../services/accountService';
import Unauthorized from '../errors/unauthorized';

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
      const { accessToken, refreshToken } =
        await this.accountService.generateToken(account.id);

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
      const { accessToken, refreshToken } =
        await this.accountService.generateToken(account.id);

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

      const { account, shardDevice } = await this.accountService.recoverAccount(
        email,
        shardEmail,
      );
      const { accessToken, refreshToken } =
        await this.accountService.generateToken(account.id);

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

  async fetchAccount(request: Request, response: Response) {
    try {
      const accountId = request.params.id;
      const authAccountId = (request as any).auth.id;
      notNull(new BadRequestError('id is required'), accountId);
      mustBeTrue(
        new BadRequestError('invalid credentials'),
        authAccountId === accountId,
      );

      createSuccessResponse(
        response,
        await this.accountService.fetchAccount(accountId),
      );
    } catch (error: any) {
      createErrorResponse(response, error);
    }
  }

  async refreshToken(request: Request, response: Response) {
    try {
      const { refreshToken } = snakeToCamel(request.body);
      notNull(new Unauthorized('missing refresh token'), refreshToken);

      const accessToken = await this.accountService.refreshToken(refreshToken);
      createSuccessResponse(response, {
        accessToken,
      });
    } catch (error: any) {
      createErrorResponse(response, error);
    }
  }

  async login(request: Request, response: Response) {
    try {
      const { email, password } = snakeToCamel(request.body);
      notNull(new BadRequestError('email is required'), email);
      notNull(new BadRequestError('password is required'), password);

      const account = await this.accountService.login(email, password);
      const { accessToken, refreshToken } =
        await this.accountService.generateToken(account!.id);

      createSuccessResponse(response, {
        id: account!.id,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      console.log(error);
      createErrorResponse(response, error);
    }
  }
}
