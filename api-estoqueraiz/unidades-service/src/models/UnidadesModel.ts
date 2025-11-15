import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../../shared/config/database";

class UnidadesModel extends Model {
  public id!: number;
  public nome!: string;
  public descricao!: string;
  public rua!: string;
  public numero!: string;
  public bairro!: string;
  public cidade!: string;
  public estado!: string;
  public cep!: string;

  public toJSON(): object {
    return Object.assign({}, this.get());
  }
}

UnidadesModel.init(
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
    rua: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numero: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bairro: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cidade: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cep: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Unidade",
    tableName: "unidades",
    timestamps: false,
  }
);

export default UnidadesModel;
