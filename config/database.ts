import { Options, Sequelize } from 'sequelize';
import config from './config.json';

interface DatabaseConfig {
  [key: string]: {
    username: string;
    password: string;
    database: string;
    host: string;
    port?: number;
    dialect: string;
  };
}

const env = process.env.NODE_ENV || 'development'; // Set environment
const dbConfig = (config as DatabaseConfig)[env];
const sequelize = new Sequelize({
  ...(dbConfig as Options),
  define: {
    timestamps: true,
    underscored: true,
  },
});

export { sequelize };
