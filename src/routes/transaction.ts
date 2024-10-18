import { Router } from 'express';
import TransactionController from '../controllers/transactionController';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

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
    upload.none(),
    transactionController.notifyPayment.bind(transactionController),
  );
  router.post(
    '/transactions/bridgein',
    transactionController.bridgeIn.bind(transactionController),
  );
  router.post(
    '/transactions/bridgeout',
    transactionController.bridgeOut.bind(transactionController),
  );
}
