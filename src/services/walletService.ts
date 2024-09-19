import crypto from 'crypto';
import ENVIRONMENT from '../config/environment';
import axios, { Method } from 'axios';
import InternalServerError from '../errors/internal-server-error';
import { mustBeTrue } from '../utils/assert';

export default class WalletService {
  async transfer(receiver: string, amount: number): Promise<string> {
    const pullingAccountBalance = await this.pullingAccountBalance();
    mustBeTrue(
      new InternalServerError('insufficient pulling account balance'),
      pullingAccountBalance >= amount,
    );

    const requestBody = {
      "sender": ENVIRONMENT.PULLING_ACCOUNT_ID,
      "receiver": receiver,
      "amount": amount,
    };

    const result = await this.fetch(
      `${ENVIRONMENT.EXTERNAL_WALLET_BASE_URL}transferva`,
      requestBody,
      'POST',
    );
    return String(result.TransactionId);
  }

  private async pullingAccountBalance() {
    const requestBody = { "account": ENVIRONMENT.PULLING_ACCOUNT_ID };
    const result = await this.fetch(
      `${ENVIRONMENT.EXTERNAL_WALLET_BASE_URL}balance`,
      requestBody,
      'POST',
    );

    return result.MerchantBalance;
  }

  private async fetch(url: string, data: any, method: Method) {
    const signature = this.pullingAccountSignature(data, method);
    
    const response = await axios.request({
      url,
      method,
      headers: {
        'Content-Type': 'application/json',
        signature,
        va: ENVIRONMENT.PULLING_ACCOUNT_ID,
      },
      data,
    });

    if (response.data.Status !== 200) {
      throw new InternalServerError(
        `failed to fetch url = ${url}, error = ${response.data.Message}`,
      );
    }

    return response.data.Data;
  }

  private pullingAccountSignature(data: any, method: Method) {
    const bodyEncrypt = crypto
      .createHash('SHA256')
      .update(JSON.stringify(data))
      .digest('hex');

    const stringToSign = `${method}:${ENVIRONMENT.PULLING_ACCOUNT_ID}:${bodyEncrypt}:${ENVIRONMENT.EXTERNAL_WALLET_API_KEY}`;
    const hmac = crypto.createHmac('SHA256', ENVIRONMENT.EXTERNAL_WALLET_API_KEY!);
    return hmac.update(stringToSign).digest('hex');
  }
}
