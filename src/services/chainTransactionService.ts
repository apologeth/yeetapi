import { ethers } from 'ethers';
import { getContracts, provider } from '../utils/contracts';
import LangitAccount from '../contracts/LangitAccount.json';
import { setupUserOpExecute } from '../utils/user-operation';
import { ChainTransaction } from '../models/ChainTransaction';
import SimpleToken from '../contracts/SimpleToken.json';
import { Transaction as DBTransaction } from 'sequelize';
import { TransactionStep } from '../models/TransactionStep';
import { sendUserOperation } from '../utils/bundler';

export default class ChainTransactionService {
  async deployAccountAbstraction(
    email: string,
    accountPrivateKey: string,
    opts: { dbTransaction: DBTransaction },
  ) {
    const signer = new ethers.Wallet(accountPrivateKey);
    const { langitAccountFactory } = await getContracts();

    const initCallData = langitAccountFactory.interface.encodeFunctionData(
      'createAccount',
      [signer.address, '0x00'],
    );
    const factoryAddress = ethers.utils.solidityPack(
      ['address'],
      [langitAccountFactory.address],
    );
    const initCode = ethers.utils.solidityPack(
      ['bytes', 'bytes'],
      [factoryAddress, initCallData],
    );

    const accountAbstractionAddress: string =
      await langitAccountFactory.getAddress(signer.address, '0x00');
    const Account = new ethers.ContractFactory(
      LangitAccount.abi,
      LangitAccount.bytecode,
    );
    const callData = Account.interface.encodeFunctionData('register', [
      email,
      '',
    ]);

    const userOp = await setupUserOpExecute({
      signer,
      sender: accountAbstractionAddress,
      initCode,
      target: accountAbstractionAddress,
      value: '0',
      callData,
    });

    const userOperationHash = await sendUserOperation(userOp);
    await ChainTransaction.create(
      {
        userOperationHash,
        actionType: 'DEPLOY_AA',
        status: 'SUBMITTED',
      },
      { transaction: opts.dbTransaction },
    );

    return {
      accountAbstractionAddress,
      userOperationHash,
    };
  }

  async transferToken(
    transactionStep: TransactionStep,
    accountPrivateKey: string,
    opts: { dbTransaction: DBTransaction },
  ) {
    const signer = new ethers.Wallet(accountPrivateKey);
    let callData = '0x';
    if (transactionStep.tokenAddress) {
      const token = new ethers.Contract(
        transactionStep.tokenAddress,
        SimpleToken.abi,
        provider,
      );
      callData = token.interface.encodeFunctionData('transfer', [
        transactionStep.receiverAddress,
        transactionStep.tokenAmount,
      ]);
    }

    const userOp = await setupUserOpExecute({
      signer,
      sender: transactionStep.senderAddress!,
      initCode: '0x',
      target: transactionStep.tokenAddress ?? transactionStep.receiverAddress!,
      value: transactionStep.tokenAddress ? '0' : transactionStep.tokenAmount,
      callData,
    });

    const userOperationHash = await sendUserOperation(userOp);
    await ChainTransaction.create(
      {
        userOperationHash,
        actionType: 'TRANSFER_TOKEN',
        status: 'SUBMITTED',
      },
      { transaction: opts.dbTransaction },
    );

    return userOperationHash;
  }
}
