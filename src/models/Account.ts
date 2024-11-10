import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export enum ACCOUNT_STATUS {
  INIT = 'INIT',
  CREATING = 'CREATING',
  CREATED = 'CREATED',
  FAILED = 'FAILED',
}
class Account extends Model {
  public id!: string;
  public email!: string;
  public password!: string;
  public address!: string;
  public accountAbstractionAddress!: string;
  public encryptedShard!: string;
  public fiatWalletId!: string | null;
  public chainTransactionId!: string | null;
  public status!: ACCOUNT_STATUS;
  public createdAt!: Date;
  public updatedAt!: Date | null;
}

Account.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      unique: true,
    },
    accountAbstractionAddress: {
      type: DataTypes.STRING,
    },
    encryptedShard: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ACCOUNT_STATUS)),
    },
    fiatWalletId: {
      type: DataTypes.STRING,
    },
    chainTransactionId: {
      type: DataTypes.UUID,
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
    modelName: 'Account',
    tableName: 'accounts',
    timestamps: true,
  },
);

export { Account };
