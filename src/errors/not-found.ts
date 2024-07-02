import BaseError from './base';

export default class NotFoundError extends BaseError {
  constructor(message: string) {
    super(404, message);
  }
}
