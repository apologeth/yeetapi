import { PhoneNumberPrefix } from '../models/PhoneNumberPrefix';
import { ProductType } from '../models/ProductType';
import { notNull } from '../utils/assert';
import NotFoundError from '../errors/not-found';
import ENVIRONMENT from '../config/environment';
import axios from 'axios';
import md5 from 'md5';
import InternalServerError from '../errors/internal-server-error';

export default class ProductService {
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

    return responseFromPPOB.data.data.pricelist;
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
}
