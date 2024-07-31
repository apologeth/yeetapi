import LangitAccount from '../contracts/LangitAccount.json';
import { getContracts, provider } from './contracts';
import { ethers, Signer } from 'ethers';
import ENVIRONMENT from '../config/environment';

export type UserOperation = {
  sender: string;
  nonce: number;
  initCode: string;
  callData: string;
  callGasLimit: number;
  verificationGasLimit: number;
  preVerificationGas: number;
  maxFeePerGas: number;
  maxPriorityFeePerGas: number;
  paymasterAndData: string;
  signature: string;
};

export async function setupUserOpExecute(params: {
  signer: Signer;
  sender: string;
  initCode: string;
  target: string;
  value: number;
  callData: string;
}): Promise<UserOperation> {
  const Account = new ethers.ContractFactory(
    LangitAccount.abi,
    LangitAccount.bytecode,
  );
  const callDataForEntryPoint = Account.interface.encodeFunctionData(
    'execute',
    [params.target, params.value, params.callData],
  );

  return await setupUserOp({
    ...params,
    callDataForEntryPoint,
  });
}

async function setupUserOp(params: {
  signer: Signer;
  sender: string;
  initCode: string;
  callDataForEntryPoint: string;
}): Promise<UserOperation> {
  const { signer, sender, initCode, callDataForEntryPoint } = params;
  const { entrypoint } = await getContracts();
  const nonce = await entrypoint.getNonce(sender, 0);

  const userOp = {
    sender: sender,
    nonce: Number(nonce),
    initCode,
    callData: callDataForEntryPoint,
    callGasLimit: 500000,
    verificationGasLimit: 500000,
    preVerificationGas: 500000,
    maxFeePerGas: 232673939,
    maxPriorityFeePerGas: 0,
    paymasterAndData: '0x',
    signature: '0x',
  };

  userOp.paymasterAndData = await generatePaymasterAndData(userOp);

  const opHash = await entrypoint.getUserOpHash(Object.values(userOp));
  const signature = await signer.signMessage(ethers.utils.arrayify(opHash));
  userOp.signature = signature;
  return userOp;
}

async function generatePaymasterAndData(userOp: any): Promise<string> {
  const { langitPaymaster } = await getContracts();
  const latestBlock = await provider.getBlock('latest');
  const validAfter = latestBlock.timestamp;
  const validUntil = validAfter + 86400;
  const erc20Token = ENVIRONMENT.GAS_TOKEN_ADDRESS;
  const exchangeRate = 0; // For now it's free

  const hash = await langitPaymaster.getHash(
    Object.values(userOp),
    validUntil,
    validAfter,
    erc20Token,
    exchangeRate,
  );
  const langitAdmin = new ethers.Wallet(ENVIRONMENT.ADMIN_PRIVATE_KEY!);
  const signature = await langitAdmin.signMessage(ethers.utils.arrayify(hash));
  const paymasterAndData = ethers.utils.defaultAbiCoder.encode(
    ['uint48', 'uint48', 'address', 'uint256'],
    [validUntil, validAfter, erc20Token, exchangeRate],
  );
  return ethers.utils.hexlify(
    ethers.utils.concat([langitPaymaster.address, paymasterAndData, signature]),
  );
}
