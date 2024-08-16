import { Token } from '../models/Token';

export default class TokenService {
  async fetch() {
    return await Token.findAll();
  }

  async create(params: {
    name: string;
    symbol: string;
    address: string;
    decimals: string;
  }) {
    return await Token.create({
      ...params,
    });
  }
}
