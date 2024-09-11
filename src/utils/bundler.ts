import axios from 'axios';
import { getContracts } from './contracts';
import { UserOperation } from './user-operation';
import ENVIRONMENT from '../config/environment';

export async function sendUserOperation(userOp: UserOperation) {
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
  return responseFromBundler.data.result;
}

export async function estimateUserOperationGas(userOp: UserOperation): Promise<{
  preVerificationGas: string;
  verificationGasLimit: string;
  callGasLimit: string;
  verificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  validAfter: string;
  validUntil: string;
}> {
  const { entrypoint } = await getContracts();

  const responseFromBundler = await axios.post(ENVIRONMENT.BUNDLER_RPC_URL!, {
    jsonrpc: '2.0',
    method: 'eth_estimateUserOperationGas',
    params: [userOp, entrypoint.address],
    id: 1,
  });

  if (responseFromBundler.data.error) {
    throw Error(responseFromBundler.data.error.message);
  }
  return responseFromBundler.data.result;
}

export async function getUserOperationReceipt(userOpHash: string): Promise<{
  userOperationHash: string;
  success: boolean;
  transactionHash?: string;
}> {
  const responseFromBundler = await axios.post(ENVIRONMENT.BUNDLER_RPC_URL!, {
    jsonrpc: '2.0',
    method: 'eth_getUserOperationReceipt',
    params: [userOpHash],
    id: 1,
  });

  if (responseFromBundler.data.error) {
    throw Error(responseFromBundler.data.error.message);
  }

  const result = responseFromBundler.data.result;
  const transactionHash = result.logs?.[0]?.transactionHash;
  return {
    userOperationHash: result.userOpHash,
    success: result.success,
    transactionHash: transactionHash,
  };
}
