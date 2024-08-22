import { getContracts, provider } from '../utils/contracts';
import { ChainTransaction } from '../models/ChainTransaction';
import { Account } from '../models/Account';
import NotFoundError from '../errors/not-found';
import { TransactionStep } from '../models/TransactionStep';
import { Transaction } from '../models/Transaction';

export default class WorkerService {
  async checkTransactionStatus() {
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

      const status = receipt.status === 1 ? 'CONFIRMED' : 'FAILED';
      await chainTransaction.update({
        status,
      });
      await this.nextStep(chainTransaction, logs[0].transactionHash);
    });
    await Promise.all(promises);
  }

  private async nextStep(
    chainTransaction: ChainTransaction,
    transactionHash: string,
  ) {
    try {
      switch (chainTransaction.actionType) {
        case 'DEPLOY_AA':
          await this.updateAccountStatus(chainTransaction);
          break;
        case 'TRANSFER_TOKEN':
          await this.updateTransactionStepStatus(
            chainTransaction,
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

  private async updateAccountStatus(chainTransaction: ChainTransaction) {
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
    await account.update({
      status,
    });
  }

  private async updateTransactionStepStatus(
    chainTransaction: ChainTransaction,
    transactionHash: string,
  ) {
    const step = await TransactionStep.findOne({
      where: { externalId: chainTransaction.userOperationHash },
    });
    if (!step) {
      throw new NotFoundError(
        `transsaction step with transaction hash ${chainTransaction.userOperationHash} is not found`,
      );
    }

    const status =
      chainTransaction.status === 'CONFIRMED' ? 'SUCCESS' : 'FAILED';
    await step.update({
      status,
    });

    const transaction = await Transaction.findByPk(step.transactionId);
    if (!transaction) {
      throw new NotFoundError(
        `transsaction with transaction id ${step.transactionId} is not found`,
      );
    }
    const transactionStatus =
      chainTransaction.status === 'CONFIRMED' ? 'SENT' : 'FAILED';
    transaction.update({
      status: transactionStatus,
      transactionHash,
    });
  }
}
