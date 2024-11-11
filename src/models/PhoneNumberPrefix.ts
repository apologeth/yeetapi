import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

class PhoneNumberPrefix extends Model {
  public id!: number;
  public prefix!: string;
  public pulsaOperator!: string | null;
  public dataOperator!: string | null;
  public createdAt!: string;
  public updatedAt!: string;
}

PhoneNumberPrefix.init(
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    prefix: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pulsaOperator: {
      type: DataTypes.STRING,
    },
    dataOperator: {
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
    modelName: 'PhoneNumberPrefix',
    tableName: 'phone_number_prefixes',
    timestamps: true,
  },
);

export { PhoneNumberPrefix };
