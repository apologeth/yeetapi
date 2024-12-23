'use strict';

import dotenv from 'dotenv';
dotenv.config();

const ENVIRONMENT = {
  DATABASE_HOST: process.env.DATABASE_HOST,
  DATABASE_PORT: Number(process.env.DATABASE_PORT),
  DATABASE_NAME: process.env.DATABASE_NAME,
  DATABASE_USERNAME: process.env.DATABASE_USERNAME,
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_SERVICE: process.env.SMTP_SERVICE,

  ADMIN_NAME: process.env.ADMIN_NAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_EXPIRATION: process.env.JWT_EXPIRATION,
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

  AWS_KMS_KEY_ID: process.env.AWS_KMS_KEY_ID,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,

  ENTRYPOINT_ADDRESS: process.env.ENTRYPOINT_ADDRESS,
  YEET_ACCOUNT_FACTORY_ADDRESS: process.env.YEET_ACCOUNT_FACTORY_ADDRESS,
  YEET_PAYMASTER_ADDRESS: process.env.YEET_PAYMASTER_ADDRESS,
  GAS_TOKEN_ADDRESS: process.env.GAS_TOKEN_ADDRESS,

  CHAIN_RPC_URL: process.env.CHAIN_RPC_URL,
  CHAIN_ID: process.env.CHAIN_ID,
  CHAIN_NAME: process.env.CHAIN_NAME,
  ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY,
  BUNDLER_RPC_URL: process.env.BUNDLER_RPC_URL,

  EXCHANGE_API_KEY: process.env.EXCHANGE_API_KEY,
  EXCHANGE_API_SECRET: process.env.EXCHANGE_API_SECRET,

  PULLING_ACCOUNT_ID: process.env.PULLING_ACCOUNT_ID,
  EXTERNAL_WALLET_API_KEY: process.env.EXTERNAL_WALLET_API_KEY,
  EXTERNAL_WALLET_BASE_URL: process.env.EXTERNAL_WALLET_BASE_URL,

  CALLBACK_URL: process.env.CALLBACK_URL,

  PPOB_USERNAME: process.env.PPOB_USERNAME,
  PPOB_API_KEY: process.env.PPOB_API_KEY,
  PPOB_BASE_URL: process.env.PPOB_BASE_URL,
};

export default ENVIRONMENT;
