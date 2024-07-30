import { Contract, ethers } from 'ethers';
import ENVIRONMENT from '../config/environment';
import EntryPoint from '../contracts/EntryPoint.json';
import LangitAccountFactory from '../contracts/LangitAccountFactory.json';
import LangitPaymaster from '../contracts/LangitPaymaster.json';

let entrypoint: Contract;
let langitAccountFactory: Contract;
let langitPaymaster: Contract;

export const provider = new ethers.providers.JsonRpcProvider(
  ENVIRONMENT.CHAIN_RPC_URL,
  {
    name: ENVIRONMENT.CHAIN_NAME!,
    chainId: Number(ENVIRONMENT.CHAIN_ID!),
  },
);

export async function getContracts() {
  if (!entrypoint || !langitAccountFactory || !langitPaymaster) {
    entrypoint = new ethers.Contract(
      ENVIRONMENT.ENTRYPOINT_ADDRESS!,
      EntryPoint.abi,
      provider,
    );
    langitAccountFactory = new ethers.Contract(
      ENVIRONMENT.LANGIT_ACCOUNT_FACTORY_ADDRESS!,
      LangitAccountFactory.abi,
      provider,
    );
    langitPaymaster = new ethers.Contract(
      ENVIRONMENT.LANGIT_PAYMASTER_ADDRESS!,
      LangitPaymaster.abi,
      provider,
    );
  }

  return {
    entrypoint,
    langitAccountFactory,
    langitPaymaster,
  };
}
