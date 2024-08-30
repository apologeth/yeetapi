import ccxt from 'ccxt';
import ENVIRONMENT from '../config/environment';

const exchangeClass = ccxt['tokocrypto'];
export const cryptoExchange = new exchangeClass({
  apiKey: ENVIRONMENT.EXCHANGE_API_KEY,
  secret: ENVIRONMENT.EXCHANGE_API_SECRET,
});
