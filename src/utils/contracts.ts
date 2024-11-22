import { Contract, ethers } from 'ethers';
import ENVIRONMENT from '../config/environment';
import EntryPoint from '../contracts/EntryPoint.json';
import StraxAccountFactory from '../contracts/StraxAccountFactory.json';
import StraxPaymaster from '../contracts/StraxPaymaster.json';

let entrypoint: Contract;
let straxAccountFactory: Contract;
let straxPaymaster: Contract;

export const provider = new ethers.providers.JsonRpcProvider(
  ENVIRONMENT.CHAIN_RPC_URL,
  {
    name: ENVIRONMENT.CHAIN_NAME!,
    chainId: Number(ENVIRONMENT.CHAIN_ID!),
  },
);

export async function getContracts() {
  if (!entrypoint || !straxAccountFactory || !straxPaymaster) {
    entrypoint = new ethers.Contract(
      ENVIRONMENT.ENTRYPOINT_ADDRESS!,
      EntryPoint.abi,
      provider,
    );
    straxAccountFactory = new ethers.Contract(
      ENVIRONMENT.STRAX_ACCOUNT_FACTORY_ADDRESS!,
      StraxAccountFactory.abi,
      provider,
    );
    straxPaymaster = new ethers.Contract(
      ENVIRONMENT.STRAX_PAYMASTER_ADDRESS!,
      StraxPaymaster.abi,
      provider,
    );
  }

  return {
    entrypoint,
    straxAccountFactory,
    straxPaymaster,
  };
}
