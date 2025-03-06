import { Contract, ethers } from 'ethers';
import ENVIRONMENT from '../config/environment';
import EntryPoint from '../contracts/EntryPoint.json';
import DrvAccountFactory from '../contracts/DrvAccountFactory.json';
import DrvPaymaster from '../contracts/DrvPaymaster.json';

let entrypoint: Contract;
let drvAccountFactory: Contract;
let drvPaymaster: Contract;

export const provider = new ethers.providers.JsonRpcProvider(
  ENVIRONMENT.CHAIN_RPC_URL,
  {
    name: ENVIRONMENT.CHAIN_NAME!,
    chainId: Number(ENVIRONMENT.CHAIN_ID!),
  },
);

export async function getContracts() {
  if (!entrypoint || !drvAccountFactory || !drvPaymaster) {
    entrypoint = new ethers.Contract(
      ENVIRONMENT.ENTRYPOINT_ADDRESS!,
      EntryPoint.abi,
      provider,
    );
    drvAccountFactory = new ethers.Contract(
      ENVIRONMENT.YEET_ACCOUNT_FACTORY_ADDRESS!,
      DrvAccountFactory.abi,
      provider,
    );
    drvPaymaster = new ethers.Contract(
      ENVIRONMENT.YEET_PAYMASTER_ADDRESS!,
      DrvPaymaster.abi,
      provider,
    );
  }

  return {
    entrypoint,
    drvAccountFactory,
    drvPaymaster,
  };
}
