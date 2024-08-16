import { Router } from 'express';
import AccountController from '../controllers/accountController';
import { bearerAuthMiddleware } from '../middlewares/auth';

const accountController = new AccountController();
export function accountRoute(router: Router) {
  router.post(
    '/accounts',
    bearerAuthMiddleware,
    accountController.createAccount.bind(accountController),
  );
  router.post(
    '/accounts/google-auth',
    bearerAuthMiddleware,
    accountController.authWithGoogle.bind(accountController),
  );
  router.post(
    '/accounts/refresh',
    bearerAuthMiddleware,
    accountController.refreshToken.bind(accountController),
  );
  router.post(
    '/accounts/recover',
    bearerAuthMiddleware,
    accountController.recoverAccount.bind(accountController),
  );
  router.post(
    '/accounts/login',
    bearerAuthMiddleware,
    accountController.login.bind(accountController),
  );
  router.get(
    '/accounts/:id',
    bearerAuthMiddleware,
    accountController.fetchAccount.bind(accountController),
  );
}
