import { Response } from 'express';
import { camelToSnake } from './conversion';

export function createSuccessResponse(response: Response, data: object = {}) {
  const resObject = {
    code: 200,
    message: 'Success',
    data: camelToSnake(data),
  };

  console.log('==== LOG ====', resObject);

  return response.status(resObject.code).json(resObject);
}

export function createErrorResponse(response: Response, error: Error) {
  const errResponse = {
    status: 'error',
    code: 500,
    message: 'Internal Server Error',
  };

  if ('code' in error && typeof error.code === 'number') {
    errResponse.code = error.code;
    errResponse.message = error.message;
  }

  console.error('==== ERROR ====', errResponse, error);

  return response.status(errResponse.code).json(errResponse);
}
