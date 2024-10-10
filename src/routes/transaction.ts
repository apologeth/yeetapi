import { Router } from 'express';
import TransactionController from '../controllers/transactionController';

const transactionController = new TransactionController();
export function transactionRoute(router: Router) {
  router.post(
    '/transactions',
    transactionController.create.bind(transactionController),
  );
  router.get(
    '/transactions/:transaction_id',
    transactionController.fetch.bind(transactionController),
  );
  router.post(
    '/transactions/notify-payment',
    transactionController.notifyPayment.bind(transactionController),
  );
}
