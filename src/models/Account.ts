import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

class Account extends Model {
  public id!: number;
  public email!: string;
  public password!: string;
  public passwordSalt!: string;
  public address!: string;
  public encryptedShard!: string;
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
    encryptedShard: {
      type: DataTypes.STRING,
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
