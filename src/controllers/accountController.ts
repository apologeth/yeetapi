import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { split, combine } from 'shamir-secret-sharing';
import { Account } from '../models/Account';
import { sendEmail } from '../utils/send-email';
import { hashPassword } from '../utils/hash-password';
import {
  shamirKeyFromReadableString,
  shamirKeyToReadableString,
} from '../utils/shamir-key';

export async function createAccount(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;

    // Generate ETH private key
    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;
    const publicKey = wallet.address;

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
      name,
      email,
      password: await hashPassword(password),
      publicKey,
      shamirKey,
    });

    res.json({ secretKey: shamirKeyToReadableString(shares[2]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function recoverAccount(req: Request, res: Response) {
  try {
    //shamirKey from email
    const { email, shamirKey } = req.body;
    const account = await Account.findOne({
      where: { email },
    });
    if (!account) {
      throw new Error('Account not found');
    }
    const decoder = new TextDecoder();
    const firstShareKey = shamirKeyFromReadableString(shamirKey);
    const secondShareKey = shamirKeyFromReadableString(account.shamirKey);
    const combined = await combine([firstShareKey, secondShareKey]);

    const privateKey = decoder.decode(combined);
    const wallet = new ethers.Wallet(privateKey);
    if (wallet.address !== account.address) {
      throw new Error('Key not match');
    }

    res.json({ email: account.email, address: wallet.address });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
