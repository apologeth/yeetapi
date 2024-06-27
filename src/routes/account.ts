import { Router } from 'express';
import {
  createAccount,
  recoverAccount,
} from '../controllers/accountController';

export function accountRoute(router: Router) {
  router.post('/accounts', createAccount);
  router.post('/accounts/recover', recoverAccount);
}
