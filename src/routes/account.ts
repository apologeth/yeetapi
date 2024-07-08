import { Router } from 'express';
import {
  authWithGoogle,
  createAccount,
  recoverAccount,
} from '../controllers/accountController';
import { bearerAuthMiddleware } from '../middlewares/auth';

export function accountRoute(router: Router) {
  router.post('/accounts', bearerAuthMiddleware, createAccount);
  router.post('/accounts/google-auth', bearerAuthMiddleware, authWithGoogle);
  router.post('/accounts/recover', bearerAuthMiddleware, recoverAccount);
}
