import { Router } from 'express';
import TransactionController from '../controllers/transactionController';
import multer from 'multer';
import { bearerAuthMiddleware } from '../middlewares/auth';

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
  router.get(
    '/transaction-history/sent',
    bearerAuthMiddleware,
    transactionController.fetchSentHistory.bind(transactionController),
  );
  router.get(
    '/transaction-history/received',
    bearerAuthMiddleware,
    transactionController.fetchReceivedHistory.bind(transactionController),
  );
}
