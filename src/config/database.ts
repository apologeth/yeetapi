import { Sequelize } from 'sequelize';
import ENVIRONMENT from './environment';

const sequelize = new Sequelize({
  database: ENVIRONMENT.DATABASE_NAME,
  host: ENVIRONMENT.DATABASE_HOST,
  port: ENVIRONMENT.DATABASE_PORT,
  username: ENVIRONMENT.DATABASE_USERNAME,
  password: ENVIRONMENT.DATABASE_PASSWORD,
  dialect: 'postgres',
  define: {
    timestamps: true,
    underscored: true,
  },
});

export { sequelize };
