import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export enum ChainTransactionActionType {
  DEPLOY_AA = 'DEPLOY_AA',
  TRANSFER_TOKEN = 'TRANSFER_TOKEN',
}

export enum ChainTransactionStatus {
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}
class ChainTransaction extends Model {
  public id!: number;
  public userOperationHash!: string;
  public actionType!: ChainTransactionActionType;
  public status!: ChainTransactionStatus;
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
    userOperationHash: {
      type: DataTypes.STRING,
      unique: true,
    },
    actionType: {
      type: DataTypes.ENUM(...Object.values(ChainTransactionActionType)),
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ChainTransactionStatus)),
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
