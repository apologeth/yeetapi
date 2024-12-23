import YeetAccount from '../contracts/YeetAccount.json';
import { getContracts } from './contracts';
import { ethers, Signer } from 'ethers';
import ENVIRONMENT from '../config/environment';
import { estimateUserOperationGas } from './bundler';

export const yeetAdmin = new ethers.Wallet(ENVIRONMENT.ADMIN_PRIVATE_KEY!);

export type UserOperation = {
  sender: string;
  nonce: number;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
};

export async function setupUserOpExecute(params: {
  signer: Signer;
  sender: string;
  initCode: string;
  target: string;
  value: string;
  callData: string;
}): Promise<UserOperation> {
  const Account = new ethers.ContractFactory(
    YeetAccount.abi,
    YeetAccount.bytecode,
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
    callGasLimit: '0x00',
    verificationGasLimit: '0x00',
    preVerificationGas: '0x00',
    maxFeePerGas: '0x00',
    maxPriorityFeePerGas: '0x00',
    paymasterAndData: '0x',
    signature: '0x',
  };

  userOp.paymasterAndData = await generatePaymasterAndData(userOp);
  const estimatedGas = await estimateUserOperationGas(userOp);
  userOp.callGasLimit = estimatedGas.callGasLimit;
  userOp.verificationGasLimit = estimatedGas.verificationGasLimit;
  userOp.preVerificationGas = estimatedGas.preVerificationGas;
  userOp.maxFeePerGas = estimatedGas.maxFeePerGas;
  userOp.maxPriorityFeePerGas = estimatedGas.maxPriorityFeePerGas;
  userOp.paymasterAndData = await generatePaymasterAndData(userOp);

  const opHash = await entrypoint.getUserOpHash(Object.values(userOp));
  const signature = await signer.signMessage(ethers.utils.arrayify(opHash));
  userOp.signature = signature;
  return userOp;
}

async function generatePaymasterAndData(userOp: any): Promise<string> {
  const { yeetPaymaster } = await getContracts();
  const validAfter = Math.floor(Date.now() / 1000);
  const validUntil = validAfter + 1800;
  const erc20Token = ENVIRONMENT.GAS_TOKEN_ADDRESS;
  const exchangeRate = 0; // For now it's free

  const hash = await yeetPaymaster.getHash(
    Object.values(userOp),
    validUntil,
    validAfter,
    erc20Token,
    exchangeRate,
  );
  const signature = await yeetAdmin.signMessage(ethers.utils.arrayify(hash));
  const paymasterAndData = ethers.utils.defaultAbiCoder.encode(
    ['uint48', 'uint48', 'address', 'uint256'],
    [validUntil, validAfter, erc20Token, exchangeRate],
  );
  return ethers.utils.hexlify(
    ethers.utils.concat([yeetPaymaster.address, paymasterAndData, signature]),
  );
}
