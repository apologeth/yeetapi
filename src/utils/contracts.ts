import { Contract, ethers } from 'ethers';
import ENVIRONMENT from '../config/environment';
import EntryPoint from '../contracts/EntryPoint.json';
import YeetAccountFactory from '../contracts/YeetAccountFactory.json';
import YeetPaymaster from '../contracts/YeetPaymaster.json';

let entrypoint: Contract;
let yeetAccountFactory: Contract;
let yeetPaymaster: Contract;

export const provider = new ethers.providers.JsonRpcProvider(
  ENVIRONMENT.CHAIN_RPC_URL,
  {
    name: ENVIRONMENT.CHAIN_NAME!,
    chainId: Number(ENVIRONMENT.CHAIN_ID!),
  },
);

export async function getContracts() {
  if (!entrypoint || !yeetAccountFactory || !yeetPaymaster) {
    entrypoint = new ethers.Contract(
      ENVIRONMENT.ENTRYPOINT_ADDRESS!,
      EntryPoint.abi,
      provider,
    );
    yeetAccountFactory = new ethers.Contract(
      ENVIRONMENT.YEET_ACCOUNT_FACTORY_ADDRESS!,
      YeetAccountFactory.abi,
      provider,
    );
    yeetPaymaster = new ethers.Contract(
      ENVIRONMENT.YEET_PAYMASTER_ADDRESS!,
      YeetPaymaster.abi,
      provider,
    );
  }

  return {
    entrypoint,
    yeetAccountFactory,
    yeetPaymaster,
  };
}
