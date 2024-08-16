import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { Token } from './Token';
import { Account } from './Account';

class Transaction extends Model {
  public id!: string;
  public sender!: Account;
  public receiver!: Account;
  public sentAmount!: string;
  public receivedAmount!: string;
  public sentToken!: Token;
  public receivedToken!: Token;
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
});

Transaction.belongsTo(Account, {
  foreignKey: 'receiver',
});

Transaction.belongsTo(Token, {
  foreignKey: 'sentToken',
});

Transaction.belongsTo(Token, {
  foreignKey: 'receivedToken',
});

export { Transaction };
