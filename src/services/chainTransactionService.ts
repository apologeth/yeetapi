import { ethers } from 'ethers';
import { getContracts, provider } from '../utils/contracts';
import LangitAccount from '../contracts/LangitAccount.json';
import { setupUserOpExecute, UserOperation } from '../utils/user-operation';
import ENVIRONMENT from '../config/environment';
import axios from 'axios';
import { ChainTransaction } from '../models/ChainTransaction';
import { Transaction } from '../models/Transaction';
import SimpleToken from '../contracts/SimpleToken.json';

export default class ChainTransactionService {
  async deployAccountAbstraction(email: string, accountPrivateKey: string) {
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
      value: 0,
      callData,
    });

    const userOperationHash = await this.send(userOp);
    await ChainTransaction.create({
      userOperationHash,
      actionType: 'DEPLOY_AA',
      status: 'SUBMITTED',
    });

    return {
      accountAbstractionAddress,
      userOperationHash,
    };
  }

  async transferToken(transaction: Transaction, accountPrivateKey: string) {
    const signer = new ethers.Wallet(accountPrivateKey);
    const token = new ethers.Contract(
      transaction.sentTokenObject.address,
      SimpleToken.abi,
      provider,
    );

    const callData = token.interface.encodeFunctionData('transfer', [
      transaction.receiverAccount.accountAbstractionAddress,
      transaction.receivedAmount,
    ]);

    const userOp = await setupUserOpExecute({
      signer,
      sender: transaction.senderAccount.accountAbstractionAddress,
      initCode: '0x',
      target: token.address,
      value: 0,
      callData,
    });

    const userOperationHash = await this.send(userOp);
    await ChainTransaction.create({
      userOperationHash,
      actionType: 'TRANSFER_TOKEN',
      status: 'SUBMITTED',
    });

    return userOperationHash;
  }

  private async send(userOp: UserOperation): Promise<string> {
    const { entrypoint } = await getContracts();

    const responseFromBundler = await axios.post(ENVIRONMENT.BUNDLER_RPC_URL!, {
      jsonrpc: '2.0',
      method: 'eth_sendUserOperation',
      params: [userOp, entrypoint.address],
      id: 1,
    });

    if (responseFromBundler.data.error) {
      throw Error(responseFromBundler.data.error.message);
    }
    console.log(responseFromBundler.data);
    return responseFromBundler.data.result;
  }
}
