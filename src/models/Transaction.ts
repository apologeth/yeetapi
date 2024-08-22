import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { Token } from './Token';
import { Account } from './Account';

class Transaction extends Model {
  public id!: string;
  public sender!: string;
  public receiver!: string;
  public senderAccount!: Account;
  public receiverAccount!: Account;
  public sentAmount!: string;
  public receivedAmount!: string;
  public sentToken!: string;
  public receivedToken!: string;
  public sentTokenObject!: Token;
  public receivedTokenObject!: Token;
  public transactionHash!: string | null;
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
      defaultValue: uuidv4(),
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

Transaction.belongsTo(Account, {
  foreignKey: 'receiver',
  as: 'receiverAccount',
});

Transaction.belongsTo(Token, {
  foreignKey: 'sentToken',
  as: 'sentTokenObject',
});

Transaction.belongsTo(Token, {
  foreignKey: 'receivedToken',
  as: 'receivedTokenObject',
});

export { Transaction };
