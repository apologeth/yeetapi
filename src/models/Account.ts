import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

class Account extends Model {
  public id!: string;
  public email!: string;
  public password!: string;
  public address!: string;
  public accountAbstractionAddress!: string;
  public encryptedShard!: string;
  public fiatWalletId!: string | undefined;
  public fiatBalance!: string;
  public status!: string;
  public createdAt!: string;
  public updatedAt!: string;
}

Account.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: uuidv4(),
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
    userOperationHash: {
      type: DataTypes.STRING,
      unique: true,
    },
    encryptedShard: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.ENUM('INIT', 'CREATED', 'FAILED'),
    },
    fiatWalletId: {
      type: DataTypes.STRING,
    },
    fiatBalance: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '0',
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
    modelName: 'Account',
    tableName: 'accounts',
    timestamps: true,
  },
);

export { Account };
