import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

class ChainTransaction extends Model {
  public id!: number;
  public userOperationHash!: string;
  public actionType!: string;
  public status!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

ChainTransaction.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    userOperationHash: {
      type: DataTypes.STRING,
      unique: true,
    },
    actionType: {
      type: DataTypes.ENUM('DEPLOY_AA', 'TRANSFER_TOKEN'),
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
