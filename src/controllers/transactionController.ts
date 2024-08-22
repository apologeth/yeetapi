import { Request, Response } from 'express';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../utils/create-response';
import { snakeToCamel } from '../utils/conversion';
import { notNull } from '../utils/assert';
import BadRequestError from '../errors/bad-request';
import TransactionService from '../services/transactionService';

export default class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  async create(request: Request, response: Response) {
    try {
      const {
        senderAddress,
        receiverAddress,
        shardDevice,
        sentAmount,
        receivedAmount,
        sentTokenAddress,
        receivedTokenAddress,
      } = snakeToCamel(request.body);
      notNull(new BadRequestError('sender_address is required'), senderAddress);
      notNull(
        new BadRequestError('receiver_address is required'),
        receiverAddress,
      );
      notNull(new BadRequestError('shard_device is required'), shardDevice);
      notNull(
        new BadRequestError('sent_token_address is required'),
        sentTokenAddress,
      );
      notNull(
        new BadRequestError('recieved_token_address is required'),
        receivedTokenAddress,
      );

      const transaction = await this.transactionService.create({
        senderAddress,
        receiverAddress,
        shardDevice,
        sentAmount,
        receivedAmount,
        sentTokenAddress,
        receivedTokenAddress,
      });
      createSuccessResponse(response, { transactionId: transaction.id });
    } catch (error: any) {
      console.log(error);
      createErrorResponse(response, error);
    }
  }

  async fetch(request: Request, response: Response) {
    try {
      const { transactionId } = snakeToCamel(request.params);
      notNull(new BadRequestError('transaction_id is required'), transactionId);

      const transaction = await this.transactionService.fetch(transactionId);
      createSuccessResponse(response, transaction ?? {});
    } catch (error: any) {
      console.log(error);
      createErrorResponse(response, error);
    }
  }
}
