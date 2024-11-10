import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { Token } from './Token';
import { Account } from './Account';

export enum TRANSFER_TYPE {
  CRYPTO_TO_CRYPTO = 'CRYPTO_TO_CRYPTO',
  FIAT_TO_CRYPTO = 'FIAT_TO_CRYPTO',
  CRYPTO_TO_FIAT = 'CRYPTO_TO_FIAT',
  NATIVE_TO_NATIVE = 'NATIVE_TO_NATIVE',
  NATIVE_TO_FIAT = 'NATIVE_TO_FIAT',
}

export enum TRANSACTION_TYPE {
  BUY_TOKEN = 'BUY_TOKEN',
  TRANSFER = 'TRANSFER',
}

export enum TRANSACTION_STATUS {
  INIT = 'INIT',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

class Transaction extends Model {
  public id!: string;
  public sender!: string;
  public receiver!: string | null;
  public senderAccount!: Account | null;
  public receiverAccount!: Account | null;
  public sentAmount!: string;
  public receivedAmount!: string | undefined | null;
  public sentToken!: string | undefined | null;
  public receivedToken!: string | undefined | null;
  public sentTokenDetails!: Token | undefined | null;
  public receivedTokenDetails!: Token | undefined | null;
  public transactionHash!: string | undefined | null;
  public paymentCode!: string | undefined | null;
  public type!: TRANSACTION_TYPE;
  public transferType!: TRANSFER_TYPE;
  public status!: TRANSACTION_STATUS;
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
      allowNull: false,
    },
    receiver: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sentAmount: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    receivedAmount: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sentToken: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    receivedToken: {
      type: DataTypes.NUMBER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.keys(TRANSACTION_STATUS)),
    },
    transactionHash: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    paymentCode: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM(...Object.keys(TRANSACTION_TYPE)),
      defaultValue: 'TRANSFER',
      allowNull: false,
    },
    transferType: {
      type: DataTypes.ENUM(...Object.keys(TRANSFER_TYPE)),
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    updatedAt: {
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

Transaction.belongsTo(Account, {
  foreignKey: 'receiver',
  as: 'receiverAccount',
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
