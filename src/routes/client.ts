import { Router } from 'express';
import {
  createClient,
  loginClient,
  refresh,
} from '../controllers/clientController';
import { basicAuthMiddleware } from '../middlewares/auth';

export function clientRoute(router: Router) {
  router.post('/clients', basicAuthMiddleware, createClient);
  router.post('/clients/login', loginClient);
  router.post('/clients/refresh', refresh);
}
