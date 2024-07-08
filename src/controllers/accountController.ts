import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { split, combine } from 'shamir-secret-sharing';
import { Account } from '../models/Account';
import { sendEmail } from '../utils/send-email';
import { hashPassword } from '../utils/password';
import {
  shamirKeyFromReadableString,
  shamirKeyToReadableString,
} from '../utils/shamir-key';
import ConflictError from '../errors/conflict';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../utils/create-response';
import { snakeToCamel } from '../utils/conversion';
import BadRequestError from '../errors/bad-request';
import { mustBeNull, mustBeTrue, notNull } from '../utils/assert';
import NotFoundError from '../errors/not-found';
import axios from 'axios';
import ENVIRONMENT from '../config/environment';

export async function createAccount(request: Request, response: Response) {
  try {
    const { email, password } = snakeToCamel(request.body);

    notNull(new BadRequestError('email is required'), email);
    notNull(new BadRequestError('password is required'), password);

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
    const shamirKey = shamirKeyToReadableString(shares[0]);

    await sendEmail(
      email,
      'Your Secret Key',
      `Your secret Key: ${shamirKeyToReadableString(shares[1])}`,
    );
    await Account.create({
      email,
      password: await hashPassword(password),
      address,
      shamirKey,
    });

    createSuccessResponse(response, {
      address: wallet.address,
      shamirKey: shamirKeyToReadableString(shares[2]),
    });
  } catch (error: any) {
    createErrorResponse(response, error);
  }
}

export async function authWithGoogle(request: Request, response: Response) {
  try {
    const { googleCode } = snakeToCamel(request.body);
    notNull(new BadRequestError('google_code is required'), googleCode);
    
    console.log(googleCode);
    console.log(ENVIRONMENT.GOOGLE_CLIENT_ID);
    console.log(ENVIRONMENT.GOOGLE_CLIENT_SECRET);
    const resFromGoogle = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code: googleCode,
        client_id: ENVIRONMENT.GOOGLE_CLIENT_ID,
        client_secret: ENVIRONMENT.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'http://localhost:3000/api/accounts/google-auth',
        grant_type: 'authorization_code'
      }
    )
    const accessToken = resFromGoogle.data.access_token;

    const userResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const userDetails = userResponse.data;
    const { email } = userDetails.email;

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
    const shamirKey = shamirKeyToReadableString(shares[0]);

    await sendEmail(
      email,
      'Your Secret Key',
      `Your secret Key: ${shamirKeyToReadableString(shares[1])}`,
    );

    await Account.create({
      email,
      address,
      shamirKey,
    });

    createSuccessResponse(response, {
      address: wallet.address,
      shamirKey: shamirKeyToReadableString(shares[2]),
    });
  } catch(error: any) {
    console.log(error);
    createErrorResponse(response, error);
  }
}

export async function recoverAccount(request: Request, response: Response) {
  try {
    //shamirKey from email
    const { email, shamirKey } = snakeToCamel(request.body);
    notNull(new BadRequestError('email is required'), email);
    notNull(new BadRequestError('shamir_key is required'), shamirKey);

    const account = await Account.findOne({
      where: { email },
    });
    notNull(new NotFoundError('account not found'), account);

    const decoder = new TextDecoder();
    const firstShareKey = shamirKeyFromReadableString(account!.shamirKey);
    const secondShareKey = shamirKeyFromReadableString(shamirKey);
    const combined = await combine([firstShareKey, secondShareKey]);

    const privateKey = decoder.decode(combined);
    const wallet = new ethers.Wallet(privateKey);
    mustBeTrue(
      new BadRequestError('key not match'),
      account!.address === wallet.address,
    );

    const encoder = new TextEncoder();
    const shares = await split(encoder.encode(privateKey), 3, 2);

    createSuccessResponse(response, {
      address: wallet.address,
      shamirKey: shamirKeyToReadableString(shares[2]),
    });
  } catch (error: any) {
    createErrorResponse(response, error);
  }
}
