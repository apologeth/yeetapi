import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { Token } from './Token';
import { Account } from './Account';

export enum TRANSFER_TYPE {
  CRYPTO_TO_CRYPTO = 'CRYPTO_TO_CRYPTO',
  FIAT_TO_CRYPTO = 'FIAT_TO_CRYPTO',
  CRYPTO_TO_FIAT = 'CRYPTO_TO_FIAT',
  NATIVE_TO_NATIVE = 'NATIVE_TO_NATIVE',
  NATIVE_TO_FIAT = 'NATIVE_TO_FIAT',
}

class Transaction extends Model {
  public id!: string;
  public sender!: string;
  public receiver!: string | undefined | null;
  public senderAccount!: Account | undefined | null;
  public sentAmount!: string;
  public receivedAmount!: string | undefined | null;
  public sentToken!: string | undefined | null;
  public receivedToken!: string | undefined | null;
  public sentTokenDetails!: Token | undefined | null;
  public receivedTokenDetails!: Token | undefined | null;
  public transactionHash!: string | undefined | null;
  public transferType!: TRANSFER_TYPE;
  public status!: string;
  public createdAt!: string;
  public updatedAt!: string;
}

Transaction.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    sender: {
      type: DataTypes.STRING,
    },
    receiver: {
      type: DataTypes.STRING,
    },
    sentAmount: {
      type: DataTypes.STRING,
    },
    receivedAmount: {
      type: DataTypes.STRING,
    },
    sentToken: {
      type: DataTypes.STRING,
      unique: true,
    },
    receivedToken: {
      type: DataTypes.NUMBER,
    },
    status: {
      type: DataTypes.ENUM('INIT', 'SENDING', 'SENT', 'FAILED'),
    },
    transactionHash: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    transferType: {
      type: DataTypes.ENUM(...Object.keys(TRANSFER_TYPE)),
      defaultValue: 'CRYPTO_TO_CRYPTO',
      allowNull: false,
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
    modelName: 'Transaction',
    tableName: 'transactions',
    timestamps: true,
  },
);

Transaction.belongsTo(Account, {
  foreignKey: 'sender',
  as: 'senderAccount',
});

Transaction.belongsTo(Token, {
  foreignKey: 'sentToken',
  as: 'sentTokenDetails',
});

Transaction.belongsTo(Token, {
  foreignKey: 'receivedToken',
  as: 'receivedTokenDetails',
});

export { Transaction };
