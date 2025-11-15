import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../../shared/config/database";

class CategoriasModel extends Model {
  public id!: number;
  public nome!: string;
  public descricao!: string;

  public toJSON(): object {
    return Object.assign({}, this.get());
  }
}

CategoriasModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descricao: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Categoria",
    tableName: "categorias",
    timestamps: true,
    createdAt: "criadoEm",
    updatedAt: "atualizadoEm",
  }
);

export default CategoriasModel;
