import { getContracts, provider } from '../utils/contracts';
import { ChainTransaction } from '../models/ChainTransaction';
import { Account } from '../models/Account';
import NotFoundError from '../errors/not-found';
import { sequelize } from '../config/database';
import { Transaction as DBTransaction } from 'sequelize';
import TransactionService from './transactionService';
import { Exchange } from '../models/Exchange';
import { cryptoExchange } from '../utils/crypto-exchange';

export default class WorkerService {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  async checkExchangeStatus() {
    const exchanges = await Exchange.findAll({
      where: { status: 'OPENED' },
      order: ['createdAt'],
      limit: 10,
    });
    const promises = exchanges.map(async (exchange) => {
      const order = (
        await cryptoExchange.privateGetOpenV1OrdersDetail({
          orderId: exchange.orderId,
        })
      ).data;
      if (order.status === '0') {
        return;
      }
      const dbTransaction = await sequelize.transaction();
      try {
        const status = order.status === '2' ? 'SOLD' : 'FAILED';
        await exchange.update(
          {
            status,
          },
          { transaction: dbTransaction },
        );
        await this.transactionService.finalizeTransactionStep(
          exchange.orderId,
          status === 'SOLD' ? 'SUCCESS' : 'FAILED',
          undefined,
          { dbTransaction },
        );
        await dbTransaction.commit();
      } catch (e) {
        console.log(
          `Failed to update exchange ${exchange.orderId}, error = ${e}`,
        );
        await dbTransaction.rollback();
      }
    });
    await Promise.all(promises);
  }

  async checkChainTransactionStatus() {
    const chainTransactions = await ChainTransaction.findAll({
      where: { status: 'SUBMITTED' },
      order: ['createdAt'],
      limit: 10,
    });

    const promises = chainTransactions.map(async (chainTransaction) => {
      const { entrypoint } = await getContracts();
      const filter = entrypoint.filters.UserOperationEvent(
        chainTransaction.userOperationHash,
      );
      const logs = await provider.getLogs({
        ...filter,
        fromBlock: 0,
        toBlock: 'latest',
      });

      if (!logs || logs.length === 0) {
        return;
      }
      const receipt = await provider.getTransactionReceipt(
        logs[0].transactionHash,
      );
      if (!receipt) {
        return;
      }

      const dbTransaction = await sequelize.transaction();
      try {
        const status = receipt.status === 1 ? 'CONFIRMED' : 'FAILED';
        await chainTransaction.update(
          {
            status,
          },
          { transaction: dbTransaction },
        );
        await this.nextStep(
          chainTransaction,
          logs[0].transactionHash,
          dbTransaction,
        );
        await dbTransaction.commit();
      } catch (e) {
        console.log(
          `Failed to update chain transaction ${chainTransaction.userOperationHash}, error = ${e}`,
        );
        await dbTransaction.rollback();
      }
    });
    await Promise.all(promises);
  }

  private async nextStep(
    chainTransaction: ChainTransaction,
    transactionHash: string,
    dbTransaction: DBTransaction,
  ) {
    try {
      switch (chainTransaction.actionType) {
        case 'DEPLOY_AA':
          await this.updateAccountStatus(chainTransaction, dbTransaction);
          break;
        case 'TRANSFER_TOKEN':
          await this.updateTransactionStepStatus(
            chainTransaction,
            transactionHash,
            dbTransaction,
          );
          break;
        default:
          throw new Error('Unknown action type');
      }
    } catch (e) {
      console.log(e);
    }
  }

  private async updateAccountStatus(
    chainTransaction: ChainTransaction,
    dbTransaction: DBTransaction,
  ) {
    const account = await Account.findOne({
      where: { userOperationHash: chainTransaction.userOperationHash },
    });
    if (!account) {
      throw new NotFoundError(
        `account with transaction hash ${chainTransaction.userOperationHash} is not found`,
      );
    }

    const status =
      chainTransaction.status === 'CONFIRMED' ? 'CREATED' : 'FAILED';
    await account.update(
      {
        status,
      },
      { transaction: dbTransaction },
    );
  }

  private async updateTransactionStepStatus(
    chainTransaction: ChainTransaction,
    transactionHash: string,
    dbTransaction: DBTransaction,
  ) {
    const status =
      chainTransaction.status === 'CONFIRMED' ? 'SUCCESS' : 'FAILED';
    await this.transactionService.finalizeTransactionStep(
      chainTransaction.userOperationHash,
      status,
      transactionHash,
      { dbTransaction },
    );
  }
}
