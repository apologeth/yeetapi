import ccxt, { Exchange } from 'ccxt';
import ENVIRONMENT from '../config/environment';
import { Token } from '../models/Token';
import { mustBeTrue } from '../utils/assert';
import BadRequestError from '../errors/bad-request';

export default class ExchangeService {
  exchange: Exchange;

  constructor() {
    const exchangeClass = ccxt['tokocrypto'];
    this.exchange = new exchangeClass({
      apiKey: ENVIRONMENT.EXCHANGE_API_KEY,
      secret: ENVIRONMENT.EXCHANGE_API_SECRET,
    });
  }

  async getTokenAmount(fiatAmount: number) {
    const orders = await this.exchange.fetchOrderBook('USDT/IDRT');
    const bids = orders.bids;
    let bidsIndex = 0;
    let price = 0
    let totalFiatAmount = 0;
    do {
      price = Number(bids[bidsIndex][0]);
      totalFiatAmount += Number(bids[bidsIndex][0]) * Number(bids[bidsIndex][1]);
      bidsIndex++;
    } while (totalFiatAmount < fiatAmount);

    // We add 0.02 to avoid the token amoun too low
    return {
      tokenAmount: Number(((fiatAmount + 0.02) / price).toFixed(2)),
      price
    }
  }

  async exchangeTokenToFiat(tokenAmount: number, fiatAmount: number) {
    const { tokenAmount: expectedTokenAmount, price } = await this.getTokenAmount(fiatAmount);
    mustBeTrue(new BadRequestError('tokenAmount is too low'), tokenAmount >= expectedTokenAmount);
    let balance = await this.exchange.fetchBalance();
    mustBeTrue(new BadRequestError('insufficient vault balance'), balance['USDT']?.free != null && balance['USDT'].free > tokenAmount);
    
    let result = await this.exchange.createOrder('USDT/IDR', 'limit', 'sell', tokenAmount, price);
    return result;
  }
}