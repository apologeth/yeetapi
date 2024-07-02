import { Request, Response } from 'express';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../utils/create-response';
import { snakeToCamel } from '../utils/conversion';
import BadRequestError from '../errors/bad-request';
import { mustBeNull, mustBeTrue, notNull } from '../utils/assert';
import { Client } from '../models/Client';
import ConflictError from '../errors/conflict';
import { hashPassword, verifyPassword } from '../utils/password';
import Unauthorized from '../errors/unauthorized';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/auth';

export async function createClient(request: Request, response: Response) {
  try {
    const { name, email, password } = snakeToCamel(request.body);
    notNull(new BadRequestError('name is required'), name);
    notNull(new BadRequestError('email is required'), email);
    notNull(new BadRequestError('password is required'), password);

    const existingClient = await Client.findOne({ where: { email } });
    mustBeNull(
      new ConflictError(`email: ${email} is already registered`),
      existingClient,
    );

    await Client.create({
      name,
      email,
      password: await hashPassword(password),
    });

    createSuccessResponse(response);
  } catch (error: any) {
    createErrorResponse(response, error);
  }
}

export async function loginClient(request: Request, response: Response) {
  try {
    const { email, password } = snakeToCamel(request.body);
    const client = await Client.findOne({ where: { email } });
    mustBeTrue(
      new Unauthorized('email or password is invalid'),
      client != null && (await verifyPassword(password, client!.password)),
    );

    const accessToken = generateAccessToken({
      id: client!.id,
      email,
      type: 'client',
    });
    const refreshToken = generateRefreshToken({
      id: client!.id,
      email,
      type: 'client',
    });

    createSuccessResponse(
      response,
      snakeToCamel({
        accessToken,
        refreshToken,
      }),
    );
  } catch (error: any) {
    createErrorResponse(response, error);
  }
}

export async function refresh(request: Request, response: Response) {
  try {
    const { refreshToken } = snakeToCamel(request.body);
    notNull(new Unauthorized('missing refresh token'), refreshToken);

    const decoded = verifyRefreshToken(refreshToken) as {
      id: string;
      email: string;
      type: string;
    };
    const client = await Client.findByPk(decoded.id);
    mustBeTrue(
      new Unauthorized('invalid credentials'),
      decoded.type === 'client' &&
        client != null &&
        client.email === decoded.email,
    );

    const accessToken = generateAccessToken({
      id: client!.id,
      email: client!.email,
      type: 'client',
    });
    createSuccessResponse(
      response,
      snakeToCamel({
        accessToken,
      }),
    );
  } catch (error: any) {
    createErrorResponse(response, error);
  }
}
