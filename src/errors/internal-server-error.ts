import BaseError from './base';

export default class InternalServerError extends BaseError {
  constructor(message: string) {
    super(500, message);
  }
}
