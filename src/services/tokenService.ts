import { Token } from '../models/Token';

export default class TokenService {
  async fetch() {
    return (await Token.findAll()).map(token => {
      console.log(token);
      return token.dataValues;
    });
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
