import { Request, Response } from 'express';
import { createRequestProcessor } from '../utils/request-processor';
import ProductService from '../services/productService';
import { snakeToCamel } from '../utils/conversion';
import { notNull } from '../utils/assert';
import BadRequestError from '../errors/bad-request';

export default class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  async fetchTypes(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (_request: Request) => {
        return await this.productService.fetchProductTypes();
      },
      opts: {
        useDBTransaction: false,
        context: 'Fetch Product Types',
      },
    });
  }

  async identifyPhoneNumberOperatior(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (request: Request) => {
        const { phoneNumber } = snakeToCamel(request.body);
        notNull(new BadRequestError('phone_number is required'), phoneNumber);
        return await this.productService.identifyPhoneNumberOperator(
          phoneNumber,
        );
      },
      opts: {
        useDBTransaction: false,
        context: 'Identify phone number`s operator',
      },
    });
  }

  async getPriceList(request: Request, response: Response) {
    return await createRequestProcessor({
      request,
      response,
      functionToExecute: async (request: Request) => {
        const { type, operator } = snakeToCamel(request.params);
        notNull(new BadRequestError('type is required'), type);
        notNull(new BadRequestError('operator is required'), operator);
        return await this.productService.getPriceList(type, operator);
      },
      opts: {
        useDBTransaction: false,
        context: 'Get Price List',
      },
    });
  }
}
