import { getContracts, provider } from '../utils/contracts';
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
      const { entrypoint } = await getContracts();
      const filter = entrypoint.filters.UserOperationEvent(chainTransaction.userOperationHash);
      const logs = await provider.getLogs({
        ...filter,
        fromBlock: 0,
        toBlock: "latest"
      });

      if (!logs || logs.length === 0) {
        return;
      }
      const receipt = await provider.getTransactionReceipt(logs[0].transactionHash);
      if (!receipt) {
        return;
      }

      const status = receipt.status === 1 ? 'CONFIRMED' : 'FAILED';
      await chainTransaction.update({
        status
      });
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
    const account = await Account.findOne({ where: { userOperationHash: chainTransaction.userOperationHash } });
    if (!account) {
      throw new NotFoundError(
        `account with transaction hash ${chainTransaction.userOperationHash} is not found`,
      );
    }

    const status =
      chainTransaction.status === 'CONFIRMED' ? 'CREATED' : 'FAILED';
    await account.update({
      status
    });
  }
}
