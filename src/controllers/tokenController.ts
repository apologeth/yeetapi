import { Request, Response } from 'express';
import TokenService from '../services/tokenService';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../utils/create-response';
import { snakeToCamel } from '../utils/conversion';
import { notNull } from '../utils/assert';
import BadRequestError from '../errors/bad-request';

export default class TokenController {
  private tokenService: TokenService;

  constructor() {
    this.tokenService = new TokenService();
  }

  async fetch(_request: Request, response: Response) {
    try {
      createSuccessResponse(response, await this.tokenService.fetch());
    } catch (error: any) {
      createErrorResponse(response, error);
    }
  }

  async create(request: Request, response: Response) {
    try {
      const { name, symbol, address, decimals } = snakeToCamel(request.body);
      notNull(new BadRequestError('name is required'), name);
      notNull(new BadRequestError('symbol is required'), symbol);
      notNull(new BadRequestError('address is required'), address);
      notNull(new BadRequestError('decimals is required'), decimals);

      await this.tokenService.create({
        name,
        symbol,
        address,
        decimals,
      });
      createSuccessResponse(response);
    } catch (error: any) {
      createErrorResponse(response, error);
    }
  }
}
