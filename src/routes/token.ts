import { Router } from 'express';
import { basicAuthMiddleware } from '../middlewares/auth';
import TokenController from '../controllers/tokenController';

const tokenController = new TokenController();
export function tokenRoute(router: Router) {
  router.post(
    '/tokens',
    basicAuthMiddleware,
    tokenController.create.bind(tokenController),
  );
  router.get('/tokens', tokenController.fetch.bind(tokenController));
}
