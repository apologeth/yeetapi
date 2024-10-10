import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

class TransactionStep extends Model {
  public id!: string;
  public transactionId!: string;
  public externalId!: string;
  public type!: string;
  public status!: string;
  public priority!: number;
  public senderAddress!: string | undefined | null;
  public receiverAddress!: string | undefined | null;
  public tokenAddress!: string | undefined | null;
  public tokenAmount!: string;
  public fiatAmount!: string | undefined | null;
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
      type: DataTypes.ENUM(
        'CHAIN_TRANSACTION',
        'EXCHANGE_TO_FIAT',
        'BUY_TOKEN',
        'ADMIN_CHAIN_TRANSACTION',
      ),
    },
    status: {
      type: DataTypes.ENUM(
        'INIT',
        'PROCESSING',
        'SUCCESS',
        'FAILED',
        'REVERTED',
      ),
    },
    priority: {
      type: DataTypes.NUMBER,
      allowNull: false,
    },
    senderAddress: {
      type: DataTypes.STRING,
    },
    receiverAddress: {
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
