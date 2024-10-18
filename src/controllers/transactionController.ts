import { Request, Response } from 'express';
import { convertToSmallestUnit, snakeToCamel } from '../utils/conversion';
import { notNull } from '../utils/assert';
import BadRequestError from '../errors/bad-request';
import TransactionService from '../services/transactionService';
import { createRequestProcessor } from '../utils/request-processor';
import { Transaction as DBTransaction } from 'sequelize';
import { exec } from 'child_process';
import { promisify } from 'util';
import InternalServerError from '../errors/internal-server-error';
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

  async bridgeIn(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (request: Request) => {
        const { recepient, amount, privateKey } = snakeToCamel(request.body);
        notNull(new BadRequestError('recepient is required'), recepient);
        notNull(new BadRequestError('amount is required'), amount);
        notNull(new BadRequestError('privateKey is required'), privateKey);
        const command = `hyperlane warp send --relay --warp $HOME/.hyperlane/deployments/warp_routes/USDT/arbitrumsepolia-sepolia-x0-config.yaml --amount ${convertToSmallestUnit(amount, 6)} --origin arbitrumsepolia --destination x0 --recipient ${recepient} --private-key ${privateKey}`;
  
        return new Promise((resolve, reject) => {
          exec(command, (error, stdout, stderr) => {
            if (error) {
              console.error(`Error executing command: ${error.message}`);
              reject(new InternalServerError('Something went wrong'));
              return;
            }
        
            if (stderr) {
              console.error(`stderr: ${stderr}`);
              reject(new InternalServerError('Something went wrong'));
              return;
            }
        
            console.log(`stdout: ${stdout}`);
            resolve({});
          });
        });
      },
      opts: {
        useDBTransaction: false,
        context: 'Bridge In',
      },
    });
  }

  async bridgeOut(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (request: Request) => {
        const { recepient, amount, privateKey } = snakeToCamel(request.body);
        notNull(new BadRequestError('recepient is required'), recepient);
        notNull(new BadRequestError('amount is required'), amount);
        notNull(new BadRequestError('privateKey is required'), privateKey);
        const command = `hyperlane warp send --relay --warp $HOME/.hyperlane/deployments/warp_routes/USDT/arbitrumsepolia-sepolia-x0-config.yaml --amount ${convertToSmallestUnit(amount, 6)} --origin x0 --destination arbitrumsepolia  --recipient ${recepient} --private-key ${privateKey}`;
  
        return new Promise((resolve, reject) => {
          exec(command, (error, stdout, stderr) => {
            if (error) {
              console.error(`Error executing command: ${error.message}`);
              reject(new InternalServerError('Something went wrong'));
              return;
            }
        
            if (stderr) {
              console.error(`stderr: ${stderr}`);
              reject(new InternalServerError('Something went wrong'));
              return;
            }
        
            console.log(`stdout: ${stdout}`);
            resolve({});
          });
        });
      },
      opts: {
        useDBTransaction: false,
        context: 'Bridge Out',
      },
    });
  }
}
