import { ChainTransaction } from '../models/ChainTransaction';
import { Account } from '../models/Account';
import NotFoundError from '../errors/not-found';
import { sequelize } from '../config/database';
import { Transaction as DBTransaction } from 'sequelize';
import TransactionService from './transactionService';
import { Exchange } from '../models/Exchange';
import { cryptoExchange } from '../utils/crypto-exchange';
import { getUserOperationReceipt } from '../utils/bundler';

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
      const receipt = await getUserOperationReceipt(
        chainTransaction.userOperationHash,
      );

      if (
        receipt.success == null &&
        Math.floor(Date.now() / 1000) <=
        Math.floor(chainTransaction.createdAt.getTime() / 1000) + 1800
      ) {
        return;
      }

      const dbTransaction = await sequelize.transaction();
      try {
        const status = receipt.success ? 'CONFIRMED' : 'FAILED';
        await chainTransaction.update(
          {
            status,
          },
          { transaction: dbTransaction },
        );
        await this.nextStep(
          chainTransaction,
          dbTransaction,
          receipt.transactionHash,
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
    dbTransaction: DBTransaction,
    transactionHash?: string,
  ) {
    try {
      switch (chainTransaction.actionType) {
        case 'DEPLOY_AA':
          await this.updateAccountStatus(chainTransaction, dbTransaction);
          break;
        case 'TRANSFER_TOKEN':
          await this.updateTransactionStepStatus(
            chainTransaction,
            dbTransaction,
            transactionHash,
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
    dbTransaction: DBTransaction,
    transactionHash?: string,
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
