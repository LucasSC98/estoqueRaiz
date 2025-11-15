import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../../shared/config/database";

class MovimentacoesModel extends Model {
  public id!: number;
  public tipo!: "ENTRADA" | "SAIDA" | "TRANSFERENCIA" | "AJUSTE";
  public quantidade!: number;
  public data_movimentacao!: Date;
  public observacao?: string;
  public documento?: string;
  public produto_id!: number;
  public usuario_id!: number;
  public unidade_origem_id?: number;
  public unidade_destino_id?: number;

  public toJSON(): object {
    return Object.assign({}, this.get());
  }
}

MovimentacoesModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tipo: {
      type: DataTypes.ENUM("ENTRADA", "SAIDA", "TRANSFERENCIA", "AJUSTE"),
      allowNull: false,
    },
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    data_movimentacao: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    documento: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    produto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unidade_origem_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    unidade_destino_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Movimentacao",
    tableName: "movimentacoes",
    timestamps: true,
    createdAt: "criado_em",
    updatedAt: "atualizado_em",
  }
);

export default MovimentacoesModel;
