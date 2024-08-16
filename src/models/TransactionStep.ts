import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from './Transaction';

class TransactionStep extends Model {
  public id!: string;
  public transactionId!: string;
  public externalId!: string;
  public type!: string;
  public status!: string;
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
      defaultValue: uuidv4(),
    },
    transactionId: {
      type: DataTypes.STRING,
    },
    externalId: {
      type: DataTypes.STRING,
    },
    type: {
      type: DataTypes.ENUM('CHAIN_TRANSACTION'),
    },
    status: {
      type: DataTypes.ENUM('INIT', 'PROCESSING', 'SUCCESS', 'FAILED'),
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

Transaction.hasMany(TransactionStep, {
  foreignKey: 'transactionId',
});

TransactionStep.belongsTo(Transaction, {
  foreignKey: 'transactionId',
});

export { TransactionStep };
