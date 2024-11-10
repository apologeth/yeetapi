import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export enum CHAIN_TRANSACTION_ACTION_TYPE {
  DEPLOY_AA = 'DEPLOY_AA',
  AA_TRANSFER = 'AA_TRANSFER',
  EOA_TRANSFER = 'EOA_TRANSFER',
}

export enum CHAIN_TRANSACTION_STATUS {
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}
class ChainTransaction extends Model {
  public id!: string;
  public hash!: string;
  public actionType!: CHAIN_TRANSACTION_ACTION_TYPE;
  public status!: CHAIN_TRANSACTION_STATUS;
  public createdAt!: Date;
  public updatedAt!: Date | null;
}

ChainTransaction.init(
  {
    id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    hash: {
      type: DataTypes.STRING,
      unique: true,
    },
    actionType: {
      type: DataTypes.ENUM(...Object.values(CHAIN_TRANSACTION_ACTION_TYPE)),
    },
    status: {
      type: DataTypes.ENUM(...Object.values(CHAIN_TRANSACTION_STATUS)),
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
