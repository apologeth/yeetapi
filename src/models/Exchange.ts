import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export enum ExchangeStatus {
  OPENED = 'OPENED',
  SOLD = 'SOLD',
  FAILED = 'FAILED',
}

class Exchange extends Model {
  public id!: number;
  public orderId!: string;
  public status!: ExchangeStatus;
  public createdAt!: string;
  public updatedAt!: string;
}

Exchange.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    orderId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.keys(ExchangeStatus)),
      allowNull: false,
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
    modelName: 'Exchange',
    tableName: 'exchanges',
    timestamps: true,
  },
);

export { Exchange };
