import { Router } from 'express';
import AccountController, {
  recoverAccount,
} from '../controllers/accountController';
import { bearerAuthMiddleware } from '../middlewares/auth';

const accountController = new AccountController();
export function accountRoute(router: Router) {
  router.post(
    '/accounts',
    bearerAuthMiddleware,
    accountController.createAccount,
  );
  router.post(
    '/accounts/google-auth',
    bearerAuthMiddleware,
    accountController.authWithGoogle,
  );
  router.post('/accounts/recover', bearerAuthMiddleware, recoverAccount);
}
