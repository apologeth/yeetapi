import { Router, Express } from 'express';
import { createUser } from '../controllers/userController';

export function userRoute(app: Express) {
  const router = Router();

  router.post('/', createUser);
  app.use('/api/users', router);
}