import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export enum TRANSACTION_STEP_TYPE {
  AA_CHAIN_TRANSACTION = 'AA_CHAIN_TRANSACTION',
  EOA_CHAIN_TRANSACTION = 'EOA_CHAIN_TRANSACTION',
  WALLET_TRANSFER = 'WALLET_TRANSFER',
  WALLET_PAYMENT = 'WALLET_PAYMENT',
  PRODUCT_TOPUP = 'PRODUCT_TOPUP',
}

export enum TRANSACTION_STEP_STATUS {
  INIT = 'INIT',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

class TransactionStep extends Model {
  public id!: string;
  public transactionId!: string;
  public externalId!: string;
  public type!: string;
  public status!: string;
  public priority!: number;
  public sender!: string | null;
  public receiver!: string | null;
  public tokenAddress!: string | null;
  public tokenAmount!: string | null;
  public fiatAmount!: string | null;
  public createdAt!: string;
  public updatedAt!: string;
}

TransactionStep.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    transactionId: {
      type: DataTypes.STRING,
    },
    externalId: {
      type: DataTypes.STRING,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(TRANSACTION_STEP_TYPE)),
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TRANSACTION_STEP_STATUS)),
    },
    priority: {
      type: DataTypes.NUMBER,
      allowNull: false,
    },
    sender: {
      type: DataTypes.STRING,
    },
    receiver: {
      type: DataTypes.STRING,
    },
    tokenAddress: {
      type: DataTypes.STRING,
    },
    tokenAmount: {
      type: DataTypes.STRING,
    },
    fiatAmount: {
      type: DataTypes.STRING,
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    modelName: 'TransactionStep',
    tableName: 'transaction_steps',
    timestamps: true,
  },
);

export { TransactionStep };
