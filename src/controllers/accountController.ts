import { Request, Response } from 'express';
import { snakeToCamel } from '../utils/conversion';
import BadRequestError from '../errors/bad-request';
import { mustBeTrue, notNull } from '../utils/assert';
import AccountService from '../services/accountService';
import Unauthorized from '../errors/unauthorized';
import { Transaction as DBTransaction } from 'sequelize';
import { createRequestProcessor } from '../utils/request-processor';

export default class AccountController {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

  async createAccount(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (
        request: Request,
        dbTransaction?: DBTransaction,
      ) => {
        const { email, password } = snakeToCamel(request.body);

        notNull(new BadRequestError('email is required'), email);
        notNull(new BadRequestError('password is required'), password);
        return await this.accountService.createAccount({
          email,
          password,
          opts: { dbTransaction: dbTransaction! },
        });
      },
      opts: {
        useDBTransaction: true,
        context: 'Create Account',
      },
    });
  }

  async authWithGoogle(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (
        request: Request,
        dbTransaction?: DBTransaction,
      ) => {
        const { googleCode } = snakeToCamel(request.body);
        notNull(new BadRequestError('google_code is required'), googleCode);

        return await this.accountService.createAccountWithGoogleToken(
          googleCode,
          { dbTransaction: dbTransaction! },
        );
      },
      opts: {
        useDBTransaction: true,
        context: 'Create Account With Google Auth',
      },
    });
  }

  async recoverAccount(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (request: Request) => {
        const { email, shardEmail } = snakeToCamel(request.body);
        notNull(new BadRequestError('email is required'), email);
        notNull(new BadRequestError('shard_email is required'), shardEmail);

        return await this.accountService.recoverAccount(email, shardEmail);
      },
      opts: {
        useDBTransaction: false,
        context: 'Recover Account',
      },
    });
  }

  async fetchAccount(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (request: Request) => {
        const accountId = request.params.id;
        const authAccountId = (request as any).auth.id;
        notNull(new BadRequestError('id is required'), accountId);
        mustBeTrue(
          new BadRequestError('invalid credentials'),
          authAccountId === accountId,
        );
        return await this.accountService.fetchAccount(accountId);
      },
      opts: {
        useDBTransaction: false,
        context: 'Fetch Account',
      },
    });
  }

  async refreshToken(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (request: Request) => {
        const { refreshToken } = snakeToCamel(request.body);
        notNull(new Unauthorized('missing refresh token'), refreshToken);

        const accessToken =
          await this.accountService.refreshToken(refreshToken);
        return {
          accessToken,
        };
      },
      opts: {
        useDBTransaction: false,
        context: 'Refresh Token',
      },
    });
  }

  async login(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (request: Request) => {
        const { email, password } = snakeToCamel(request.body);
        notNull(new BadRequestError('email is required'), email);
        notNull(new BadRequestError('password is required'), password);

        return await this.accountService.login(email, password);
      },
      opts: {
        useDBTransaction: false,
        context: 'Login Account',
      },
    });
  }
}
