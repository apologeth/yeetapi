import { Request, Response } from 'express';
import { createRequestProcessor } from '../utils/request-processor';
import { notNull } from '../utils/assert';
import WalletService from '../services/walletService';
import Unauthorized from '../errors/unauthorized';

export default class FiatWalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  async getBalance(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (request: Request) => {
        const userId = (request as any).auth.id;
        notNull(new Unauthorized('invalid credentials'), userId);
        return {
          fiatBalance: await this.walletService.getAccontBalance(userId),
        };
      },
      opts: {
        useDBTransaction: false,
        context: 'Fetch Token Price To Fiat',
      },
    });
  }
}
