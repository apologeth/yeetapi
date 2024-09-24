import { Router } from 'express';
import { bearerAuthMiddleware } from '../middlewares/auth';
import FiatWalletController from '../controllers/fiatwalletController';

const fiatWalletController = new FiatWalletController();
export function fiatWalletRoute(router: Router) {
  router.get(
    '/fiat-wallet/balance',
    bearerAuthMiddleware,
    fiatWalletController.getBalance.bind(fiatWalletController),
  );
}
