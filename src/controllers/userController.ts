import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { split } from 'shamir-secret-sharing';
import { User } from '../models/User';
import { sendEmail } from '../utils/send-email';

export async function createUser(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;

    // Generate ETH private key
    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;
    const publicKey = wallet.publicKey;

    // Perform Shamir's secret sharing
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const shares = await split(encoder.encode(privateKey), 3, 2);
    const shamirKey = decoder.decode(shares[0]);

    await User.create({ name, email, password, publicKey, shamirKey });
    //await sendEmail(email, 'Your Secret Key', `Your secret Key: ${decoder.decode(shares[1])}`)
    // Send first secret key in API response
    res.json({ secretKey: decoder.decode(shares[2]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
