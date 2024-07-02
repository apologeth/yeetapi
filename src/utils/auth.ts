import jwt from 'jsonwebtoken';
import ENVIRONMENT from '../config/environment';

const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRATION,
  JWT_REFRESH_EXPIRATION,
} = ENVIRONMENT;

if (
  !JWT_SECRET ||
  !JWT_REFRESH_SECRET ||
  !JWT_EXPIRATION ||
  !JWT_REFRESH_EXPIRATION
) {
  throw new Error('Missing environment variables for JWT configuration');
}

export function generateAccessToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: Number(JWT_EXPIRATION) });
}

export function generateRefreshToken(payload: object): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET!, {
    expiresIn: Number(JWT_REFRESH_EXPIRATION),
  });
}

export function verifyAccessToken(token: string): object | string {
  return jwt.verify(token, JWT_SECRET!);
}

export function verifyRefreshToken(token: string): object | string {
  return jwt.verify(token, JWT_REFRESH_SECRET!);
}
