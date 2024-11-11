import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

class ProductType extends Model {
  public id!: number;
  public name!: string;
  public operators!: string[];
  public createdAt!: string;
  public updatedAt!: string;
}

ProductType.init(
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
      allowNull: false,
    },
    operators: {
      type: DataTypes.JSONB,
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
    modelName: 'ProductType',
    tableName: 'product_types',
    timestamps: true,
  },
);

export { ProductType };
