import bcrypt from "bcrypt";
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../../shared/config/database";

class UsuariosModel extends Model {
  public id!: number;
  public nome!: string;
  public email!: string;
  public senha!: string;
  public cpf!: string;
  public status!: "pendente" | "aprovado" | "rejeitado";
  public cargo!: "gerente" | "estoquista" | "financeiro" | null;
  public unidade_id!: number | null;

  public async verificarSenha(senha: string): Promise<boolean> {
    return bcrypt.compare(senha, this.senha);
  }

  public toJSON(): object {
    const values = Object.assign({}, this.get());
    delete values.senha;
    return values;
  }
}

UsuariosModel.init(
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
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    senha: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cpf: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM("pendente", "aprovado", "rejeitado"),
      allowNull: false,
      defaultValue: "pendente",
    },
    cargo: {
      type: DataTypes.ENUM("gerente", "estoquista", "financeiro"),
      allowNull: true,
    },
    unidade_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Usuario",
    tableName: "usuarios",
    timestamps: false,
    underscored: true,
    hooks: {
      beforeCreate: async (usuario: UsuariosModel) => {
        if (usuario.senha) {
          const salt = await bcrypt.genSalt(10);
          usuario.senha = await bcrypt.hash(usuario.senha, salt);
        }
      },
      beforeUpdate: async (usuario: UsuariosModel) => {
        if (usuario.changed("senha")) {
          const salt = await bcrypt.genSalt(10);
          usuario.senha = await bcrypt.hash(usuario.senha, salt);
        }
      },
    },
  }
);

export default UsuariosModel;
