import express from 'express';
import bodyParser from 'body-parser';
import { userRoute } from './routes/user';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

userRoute(app);

export default app;
