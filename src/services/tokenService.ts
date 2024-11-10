import { mustBeNull } from '../utils/assert';
import { Token } from '../models/Token';
import BadRequestError from '../errors/bad-request';
import { fiatTokenAddress, nativeTokenAddress } from '../utils/const';

export default class TokenService {
  async fetch() {
    return (await Token.findAll())
      .map((token) => {
        return token.dataValues;
      })
      .filter(
        (value) =>
          value.address !== nativeTokenAddress &&
          value.address !== fiatTokenAddress,
      );
  }

  async create(params: {
    name: string;
    symbol: string;
    address: string;
    decimals: string;
  }) {
    mustBeNull(
      new BadRequestError(
        `token with address: ${params.address} is already registered`,
      ),
      await Token.findOne({ where: { address: params.address } }),
    );
    return await Token.create({
      ...params,
    });
  }
}
