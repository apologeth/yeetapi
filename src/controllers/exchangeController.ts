import { Request, Response } from 'express';
import ExchangeService from '../services/exchangeService';
import { createRequestProcessor } from '../utils/request-processor';
import BadRequestError from '../errors/bad-request';
import { notNull } from '../utils/assert';

export default class ExchangeController {
  private exchangeService: ExchangeService;

  constructor() {
    this.exchangeService = new ExchangeService();
  }

  async getTokenAmount(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (request: Request) => {
        const fiatAmount = request.params.fiat_amount;
        notNull(new BadRequestError('fiat_amount is required'), fiatAmount);
        return await this.exchangeService.getTokenAmount(Number(fiatAmount));
      },
      opts: {
        useDBTransaction: false,
        context: 'Fetch Token Price To Fiat',
      },
    });
  }
}
