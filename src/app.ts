import express, { Router } from 'express';
import bodyParser from 'body-parser';
import { accountRoute } from './routes/account';
import { clientRoute } from './routes/client';
import WorkerService from './services/workerService';
import { tokenRoute } from './routes/token';
import { transactionRoute } from './routes/transaction';
import { exchangeRoute } from './routes/exchange';
import { fiatWalletRoute } from './routes/fiatWallet';
import { productRoute } from './routes/product';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const router = Router();
accountRoute(router);
clientRoute(router);
tokenRoute(router);
transactionRoute(router);
exchangeRoute(router);
fiatWalletRoute(router);
productRoute(router);
app.use('/api', router);

const workerService = new WorkerService();
let isWorkerRunning = false;
const worker = async () => {
  if (isWorkerRunning) {
    console.log(
      'Previous worker execution still running. Skipping this interval.',
    );
    return;
  }

  isWorkerRunning = true;
  console.log('Worker started at', new Date().toLocaleTimeString());

  try {
    // Simulate some asynchronous work
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await Promise.all([
      workerService.checkChainTransactionStatus(),
      workerService.checkExchangeStatus(),
    ]);
    console.log('Worker completed at', new Date().toLocaleTimeString());
  } catch (error) {
    console.error('Error in worker:', error);
  } finally {
    isWorkerRunning = false;
  }
};

// Run the worker every 1 minute
setInterval(worker, 500);

export default app;
