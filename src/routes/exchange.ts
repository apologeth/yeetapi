import { Router } from 'express';
import ExchangeController from '../controllers/exchangeController';

const exchangeController = new ExchangeController();
export function exchangeRoute(router: Router) {
  router.get(
    '/exchange/token-amount/:fiat_amount',
    exchangeController.getTokenAmount.bind(exchangeController),
  );
}
