import express, { Router } from 'express';
import bodyParser from 'body-parser';
import { accountRoute } from './routes/account';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const router = Router();
accountRoute(router);
app.use('/api', router);

export default app;
