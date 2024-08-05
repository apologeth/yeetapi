import { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '../utils/create-response';
import Unauthorized from '../errors/unauthorized';
import ENVIRONMENT from '../config/environment';
import { verifyAccessToken } from '../utils/auth';

export function basicAuthMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    response.setHeader('WWW-Authenticate', 'Basic');
    return createErrorResponse(
      response,
      new Unauthorized('basic auth token is required'),
    );
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString(
    'ascii',
  );
  const [username, password] = credentials.split(':');

  if (
    username !== ENVIRONMENT.ADMIN_NAME ||
    password !== ENVIRONMENT.ADMIN_PASSWORD
  ) {
    return createErrorResponse(
      response,
      new Unauthorized('invalid username or password'),
    );
  }

  next();
}

export function bearerAuthMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createErrorResponse(
      response,
      new Unauthorized('bearer auth token is required'),
    );
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    (request as any).auth = decoded;
  } catch (err) {
    return createErrorResponse(
      response,
      new Unauthorized('invalid or expired token'),
    );
  }

  next();
}
