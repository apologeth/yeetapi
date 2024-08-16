import { Router } from 'express';
import TransactionController from '../controllers/transactionController';

const transactionController = new TransactionController();
export function transactionRoute(router: Router) {
  router.post(
    '/transactions',
    transactionController.create.bind(transactionController),
  );
}
