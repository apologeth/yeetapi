import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

class ChainTransaction extends Model {
  public id!: number;
  public transactionHash!: string;
  public actionType!: string;
  public status!: string;
  public createdAt!: string;
  public updatedAt!: string;
}

ChainTransaction.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: uuidv4(),
    },
    transactionHash: {
      type: DataTypes.STRING,
      unique: true,
    },
    actionType: {
      type: DataTypes.ENUM('DEPLOY_AA'),
    },
    status: {
      type: DataTypes.ENUM('SUBMITTED', 'CONFIRMED', 'FAILED'),
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
    modelName: 'ChainTransaction',
    tableName: 'chain_transactions',
    timestamps: true,
  },
);

export { ChainTransaction };
