import { Router } from 'express';
import {
  createAccount,
  recoverAccount,
} from '../controllers/accountController';
import { bearerAuthMiddleware } from '../middlewares/auth';

export function accountRoute(router: Router) {
  router.post('/accounts', bearerAuthMiddleware, createAccount);
  router.post('/accounts/recover', bearerAuthMiddleware, recoverAccount);
}
