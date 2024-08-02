import { split } from 'shamir-secret-sharing';
import ConflictError from '../errors/conflict';
import { Account } from '../models/Account';
import { mustBeNull } from '../utils/assert';
import { hashPassword } from '../utils/password';
import { sendEmail } from '../utils/send-email';
import { shamirKeyToReadableString } from '../utils/shamir-key';
import { ethers } from 'ethers';
import axios from 'axios';
import ENVIRONMENT from '../config/environment';
import { encryptToKMS } from '../utils/kms';
import LangitAccount from '../contracts/LangitAccount.json';
import ChainTransactionService from './chainTransactionService';

type CreateAccountResult = {
  account: Account;
  shardDevice: string;
};

export default class AccountService {
  private chainTransactionService;

  constructor() {
    this.chainTransactionService = new ChainTransactionService();
  }

  async createAccount(
    email: string,
    password?: string,
  ): Promise<CreateAccountResult> {
    const existingAccount = await Account.findOne({ where: { email } });
    mustBeNull(
      new ConflictError(`email: ${email} is already registered`),
      existingAccount,
    );

    // Generate ETH private key
    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;
    const address = wallet.address;

    // Perform Shamir's secret sharing
    const encoder = new TextEncoder();
    const shares = await split(encoder.encode(privateKey), 3, 2);
    const shardKMS = shamirKeyToReadableString(shares[0]);
    const encryptedShard = await encryptToKMS(shardKMS);

    await sendEmail(
      email,
      'Your Secret Key',
      `Your secret Key: ${shamirKeyToReadableString(shares[1])}`,
    );
    const { accountAbstractionAddress, transactionHash } =
      await this.chainTransactionService.deployAccountAbstraction(
        email,
        privateKey,
      );
    console.log(transactionHash);
    return {
      account: await Account.create({
        email,
        password: password ? await hashPassword(password) : password,
        address,
        encryptedShard,
        accountAbstractionAddress,
        transactionHash,
        status: 'INIT',
      }),
      shardDevice: shamirKeyToReadableString(shares[2]),
    };
  }

  async createAccountWithGoogleToken(
    googleCode: string,
  ): Promise<CreateAccountResult> {
    const resFromGoogle = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code: googleCode,
        client_id: ENVIRONMENT.GOOGLE_CLIENT_ID,
        client_secret: ENVIRONMENT.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'http://localhost:3000/api/accounts/google-auth',
        grant_type: 'authorization_code',
      },
    );
    const accessToken = resFromGoogle.data.access_token;

    const userResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const userDetails = userResponse.data;
    const email = userDetails.email;

    return await this.createAccount(email);
  }

  async onDeployAccountAbstractionSuccess() {}
}
