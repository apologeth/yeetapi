import { PhoneNumberPrefix } from '../models/PhoneNumberPrefix';
import { ProductType } from '../models/ProductType';
import { notNull } from '../utils/assert';
import NotFoundError from '../errors/not-found';
import ENVIRONMENT from '../config/environment';
import axios from 'axios';
import md5 from 'md5';
import InternalServerError from '../errors/internal-server-error';

type Product = {
  product_code: string,
  product_description: string,
  product_nominal: number,
  product_details: string,
  product_price: number,
  product_type: string,
  active_period: number,
  status: string,
  icon_url: string,
  product_category: string,
}

export default class ProductService {
  private products: Map<string, Product> = new Map();

  async fetchProductTypes() {
    const types = await ProductType.findAll();
    const result = types.map((value) => ({
      [value.name]: value.operators,
    }));
    return result;
  }

  async identifyPhoneNumberOperator(phoneNumber: string) {
    const prefixes = await PhoneNumberPrefix.findAll();
    const prefix = prefixes.find((value) =>
      phoneNumber.startsWith(value.prefix),
    );
    notNull(new NotFoundError('unknown phone number operator'), prefix);
    return {
      pulsaOperator: prefix!.pulsaOperator,
      dataOperator: prefix!.dataOperator,
    };
  }

  async getPriceList(type: string, operator: string) {
    const username = ENVIRONMENT.PPOB_USERNAME!;
    const apiKey = ENVIRONMENT.PPOB_API_KEY!;

    const responseFromPPOB = await axios.post(
      `${ENVIRONMENT.PPOB_BASE_URL}pricelist/${type}/${operator}`,
      {
        username,
        status: 'active',
        sign: md5(username + apiKey + 'pl'),
      },
    );

    if (
      responseFromPPOB.status != 200 ||
      !responseFromPPOB.data.data.pricelist
    ) {
      throw new InternalServerError(`Failed to fetch Third Party`);
    }

    let products = responseFromPPOB.data.data.pricelist as Product[];
    products.forEach(product => this.products.set(product.product_code, product));
    return products;
  }

  async getBalance(): Promise<number> {
    const username = ENVIRONMENT.PPOB_USERNAME!;
    const apiKey = ENVIRONMENT.PPOB_API_KEY!;

    const responseFromPPOB = await axios.post(
      `${ENVIRONMENT.PPOB_BASE_URL}checkbalance`,
      {
        username,
        sign: md5(username + apiKey + 'bl'),
      },
    );

    if (
      responseFromPPOB.status != 200 ||
      !responseFromPPOB.data.data.balance
    ) {
      throw new InternalServerError(`Failed to fetch Third Party`);
    }

    return responseFromPPOB.data.data.balance;
  }

  getProductByProductCode(productCode: string) {
    return this.products.get(productCode);
  }
  
  async topup(productCode: string, customerId: string, referenceId: string) {
    const username = ENVIRONMENT.PPOB_USERNAME!;
    const apiKey = ENVIRONMENT.PPOB_API_KEY!;

    const responseFromPPOB = await axios.post(
      `${ENVIRONMENT.PPOB_BASE_URL}top-up`,
      {
        username,
        product_code: productCode,
        customer_id: customerId,
        ref_id: referenceId,
        sign: md5(username + apiKey + referenceId),
      },
    );

    if (
      responseFromPPOB.status != 200 ||
      !responseFromPPOB.data.data.tr_id
    ) {
      throw new InternalServerError(`Failed to fetch Third Party`);
    }

    return responseFromPPOB.data.data.tr_id as string;
  }
}
