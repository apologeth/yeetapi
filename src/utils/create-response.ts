import { Response } from 'express';

export function createSuccessResponse(response: Response, data: object = {}) {
  const resObject = {
    code: 200,
    message: 'Success',
    data,
  };

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

  return response.status(errResponse.code).json(errResponse);
}
