import { Router } from 'express';
import ProductController from '../controllers/productController';
import { bearerAuthMiddleware } from '../middlewares/auth';

const productController = new ProductController();
export function productRoute(router: Router) {
  router.get(
    '/products/types',
    bearerAuthMiddleware,
    productController.fetchTypes.bind(productController),
  );
  router.post(
    '/products/identify-phone-number-operator',
    bearerAuthMiddleware,
    productController.identifyPhoneNumberOperatior.bind(productController),
  );
  router.get(
    '/products/:type/:operator',
    bearerAuthMiddleware,
    productController.getPriceList.bind(productController),
  );
}
