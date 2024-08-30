import { mustBeTrue } from '../utils/assert';
import BadRequestError from '../errors/bad-request';
import { Exchange } from '../models/Exchange';
import { Transaction as DBTransaction } from 'sequelize';
import { cryptoExchange } from '../utils/crypto-exchange';

export default class ExchangeService {
  async getTokenAmount(fiatAmount: number) {
    const orders = await cryptoExchange.fetchOrderBook('USDT/IDRT');
    const bids = orders.bids;
    let bidsIndex = 0;
    let price = 0;
    let totalFiatAmount = 0;
    do {
      price = Number(bids[bidsIndex][0]);
      totalFiatAmount +=
        Number(bids[bidsIndex][0]) * Number(bids[bidsIndex][1]);
      bidsIndex++;
    } while (totalFiatAmount < fiatAmount);

    // We add 0.02 to avoid the token amoun too low
    return {
      tokenAmount: Number(((fiatAmount + 0.02) / price).toFixed(2)),
      price,
    };
  }

  async exchangeTokenToFiat(
    tokenAmount: number,
    fiatAmount: number,
    opts?: { dbTransaction: DBTransaction },
  ) {
    const { tokenAmount: expectedTokenAmount, price } =
      await this.getTokenAmount(fiatAmount);
    mustBeTrue(
      new BadRequestError('tokenAmount is too low'),
      tokenAmount >= expectedTokenAmount,
    );
    const balance = await cryptoExchange.fetchBalance();
    mustBeTrue(
      new BadRequestError('insufficient vault balance'),
      balance['USDT']?.free != null && balance['USDT'].free > tokenAmount,
    );

    const result = await cryptoExchange.createOrder(
      'USDT/IDR',
      'limit',
      'sell',
      tokenAmount,
      price,
    );
    await Exchange.create(
      {
        orderId: result.id,
        status: 'OPENED',
      },
      { transaction: opts?.dbTransaction },
    );

    return result.id;
  }
}
