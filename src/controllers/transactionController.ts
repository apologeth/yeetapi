import { Request, Response } from 'express';
import { snakeToCamel } from '../utils/conversion';
import { notNull } from '../utils/assert';
import BadRequestError from '../errors/bad-request';
import TransactionService from '../services/transactionService';
import { createRequestProcessor } from '../utils/request-processor';
import { Transaction as DBTransaction } from 'sequelize';

export default class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  async create(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (
        request: Request,
        dbTransaction?: DBTransaction,
      ) => {
        const {
          senderAddress,
          receiverAddress,
          shardDevice,
          sentAmount,
          receivedAmount,
          sentTokenAddress,
          receivedTokenAddress,
          transferType,
          type,
        } = snakeToCamel(request.body);
        notNull(new BadRequestError('type is required'), type);

        const transaction = await this.transactionService.create({
          senderAddress,
          receiverAddress,
          shardDevice,
          sentAmount,
          receivedAmount,
          sentTokenAddress,
          receivedTokenAddress,
          transferType,
          type,
          opts: { dbTransaction: dbTransaction! },
        });
        return { transactionId: transaction.id };
      },
      opts: {
        useDBTransaction: true,
        context: 'Create Transaction',
      },
    });
  }

  async fetch(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (request: Request) => {
        const { transactionId } = snakeToCamel(request.params);
        notNull(
          new BadRequestError('transaction_id is required'),
          transactionId,
        );

        const transaction = await this.transactionService.fetch(transactionId);
        return transaction ?? {};
      },
      opts: {
        useDBTransaction: false,
        context: 'Fetch Account',
      },
    });
  }

  async notifyPayment(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (request: Request) => {
        const { trxId, statusCode, referenceId } = snakeToCamel(request.body);
        await this.transactionService.notifyPayment(
          trxId,
          statusCode,
          referenceId,
        );
      },
      opts: {
        useDBTransaction: false,
        context: 'Fetch Token Price To Fiat',
      },
    });
  }
}
