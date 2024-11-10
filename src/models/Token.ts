import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

class Token extends Model {
  public id!: string;
  public name!: string;
  public symbol!: string;
  public address!: string;
  public decimals!: number;
  public createdAt!: string;
  public updatedAt!: string;
}

Token.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
    },
    symbol: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.STRING,
      unique: true,
    },
    decimals: {
      type: DataTypes.NUMBER,
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
    modelName: 'Token',
    tableName: 'tokens',
    timestamps: true,
  },
);

export { Token };
