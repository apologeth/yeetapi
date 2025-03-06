import { ethers } from 'ethers';
import { getContracts, provider } from '../utils/contracts';
import DrvAccount from '../contracts/DrvAccount.json';
import { yeetAdmin, setupUserOpExecute } from '../utils/user-operation';
import {
  CHAIN_TRANSACTION_ACTION_TYPE,
  CHAIN_TRANSACTION_STATUS,
  ChainTransaction,
} from '../models/ChainTransaction';
import SimpleToken from '../contracts/SimpleToken.json';
import { Transaction as DBTransaction } from 'sequelize';
import { TransactionStep } from '../models/TransactionStep';
import { sendUserOperation } from '../utils/bundler';
import { nativeTokenAddress } from '../utils/const';

export default class ChainTransactionService {
  async deployAccountAbstraction(
    email: string,
    accountPrivateKey: string,
    opts: { dbTransaction: DBTransaction },
  ) {
    const signer = new ethers.Wallet(accountPrivateKey);
    const { drvAccountFactory } = await getContracts();

    const initCallData = drvAccountFactory.interface.encodeFunctionData(
      'createAccount',
      [signer.address, '0x00'],
    );
    const factoryAddress = ethers.utils.solidityPack(
      ['address'],
      [drvAccountFactory.address],
    );
    const initCode = ethers.utils.solidityPack(
      ['bytes', 'bytes'],
      [factoryAddress, initCallData],
    );

    const accountAbstractionAddress: string =
      await drvAccountFactory.getAddress(signer.address, '0x00');
    const Account = new ethers.ContractFactory(
      DrvAccount.abi,
      DrvAccount.bytecode,
    );
    const callData = Account.interface.encodeFunctionData('register', [
      email,
      '',
    ]);

    const userOperation = await setupUserOpExecute({
      signer,
      sender: accountAbstractionAddress,
      initCode,
      target: accountAbstractionAddress,
      value: '0',
      callData,
    });
    const hash = await sendUserOperation(userOperation);

    const chainTransaction = await ChainTransaction.create(
      {
        hash,
        actionType: CHAIN_TRANSACTION_ACTION_TYPE.DEPLOY_AA,
        status: CHAIN_TRANSACTION_STATUS.SUBMITTED,
      },
      { transaction: opts.dbTransaction },
    );

    return {
      accountAbstractionAddress,
      chainTransactionId: chainTransaction.id,
    };
  }

  async aaTransfer(
    transactionStep: TransactionStep,
    accountPrivateKey: string,
    opts: { dbTransaction: DBTransaction },
  ) {
    const signer = new ethers.Wallet(accountPrivateKey);
    let callData = '0x';
    if (transactionStep.tokenAddress !== nativeTokenAddress) {
      const token = new ethers.Contract(
        transactionStep.tokenAddress!,
        SimpleToken.abi,
        provider,
      );
      callData = token.interface.encodeFunctionData('transfer', [
        transactionStep.receiver!,
        transactionStep.tokenAmount,
      ]);
    }

    const userOperation = await setupUserOpExecute({
      signer,
      sender: transactionStep.sender!,
      initCode: '0x',
      target:
        transactionStep.tokenAddress !== nativeTokenAddress
          ? transactionStep.tokenAddress!
          : transactionStep.receiver!,
      value:
        transactionStep.tokenAddress !== nativeTokenAddress
          ? '0'
          : transactionStep.tokenAmount!,
      callData,
    });
    const hash = await sendUserOperation(userOperation);

    const chainTransaction = await ChainTransaction.create(
      {
        hash,
        actionType: CHAIN_TRANSACTION_ACTION_TYPE.AA_TRANSFER,
        status: CHAIN_TRANSACTION_STATUS.SUBMITTED,
      },
      { transaction: opts.dbTransaction },
    );

    return chainTransaction.id;
  }

  async eoaTransfer(
    transactionStep: TransactionStep,
    opts: { dbTransaction: DBTransaction },
  ) {
    const signer = yeetAdmin;
    let callData;
    if (transactionStep.tokenAddress !== nativeTokenAddress) {
      const token = new ethers.Contract(
        transactionStep.tokenAddress!,
        SimpleToken.abi,
        provider,
      );
      callData = token.interface.encodeFunctionData('transfer', [
        transactionStep.receiver,
        transactionStep.tokenAmount,
      ]);
    }
    const response = await signer.connect(provider).sendTransaction({
      value:
        transactionStep.tokenAddress !== nativeTokenAddress
          ? '0'
          : transactionStep.tokenAmount!,
      to:
        transactionStep.tokenAddress !== nativeTokenAddress
          ? transactionStep.tokenAddress!
          : transactionStep.receiver!,
      data: callData,
    });
    const { id } = await ChainTransaction.create(
      {
        hash: response.hash,
        actionType: CHAIN_TRANSACTION_ACTION_TYPE.EOA_TRANSFER,
        status: CHAIN_TRANSACTION_STATUS.SUBMITTED,
      },
      { transaction: opts.dbTransaction },
    );

    return id;
  }
}
