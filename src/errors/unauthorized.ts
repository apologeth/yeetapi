import BaseError from './base';

export default class Unauthorized extends BaseError {
  constructor(message: string) {
    super(401, message);
  }
}
