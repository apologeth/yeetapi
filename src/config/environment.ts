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
};

export default ENVIRONMENT;
