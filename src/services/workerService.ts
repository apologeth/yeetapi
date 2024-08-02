import { provider } from '../utils/contracts';
import { ChainTransaction } from '../models/ChainTransaction';
import { Account } from '../models/Account';
import NotFoundError from '../errors/not-found';

export default class WorkerService {
  async checkTransactionStatus() {
    const chainTransactions = await ChainTransaction.findAll({
      where: { status: 'SUBMITTED' },
      order: ['createdAt'],
      limit: 10,
    });
    const promises = chainTransactions.map(async (chainTransaction) => {
      const receipt = await provider.getTransactionReceipt(
        chainTransaction.transactionHash,
      );
      console.log(chainTransaction.transactionHash);
      if (!receipt || (receipt.status !== 1 && receipt.status !== 2)) {
        return;
      }

      const status = receipt.status === 1 ? 'CONFIRMED' : 'FAILED';
      await chainTransaction.update('status', status);
      await this.nextStep(chainTransaction);
    });
    await Promise.all(promises);
  }

  private async nextStep(chainTransaction: ChainTransaction) {
    try {
      switch (chainTransaction.actionType) {
        case 'DEPLOY_AA':
          await this.updateAccountStatus(chainTransaction);
          break;
        default:
          throw new Error('Unknown action type');
      }
    } catch (e) {
      console.log(e);
    }
  }

  private async updateAccountStatus(chainTransaction: ChainTransaction) {
    const account = await Account.findOne({ where: { chainTransaction } });
    if (!account) {
      throw new NotFoundError(
        `account with transaction hash ${chainTransaction.transactionHash} is not found`,
      );
    }

    const status =
      chainTransaction.status === 'SUBMITTED' ? 'CREATED' : 'FAILED';
    await account.update('status', status);
  }
}
