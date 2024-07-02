import BaseError from '../errors/base';

export function notNull(error: BaseError, value?: any) {
  if (value == null) {
    throw error;
  }
}

export function mustBeNull(error: BaseError, value?: any) {
  if (value != null) {
    throw error;
  }
}

export function mustBeTrue(error: BaseError, value: boolean) {
  if (!value) {
    throw error;
  }
}
