import { sequelize } from "../../../shared/config/database";
import { logger } from "../../../shared/utils/logger";
import { cacheService } from "../../../shared/utils/cache";
import {
  publicadorEventos,
  EventosTipo,
} from "../../../shared/eventos/publicador";
import {
  ErroNaoAutorizado,
  ErroProibido,
} from "../../../shared/utils/tratamentoErros";
import { LoginDTO, LoginRespostaDTO } from "../dto/LoginDTO";
import { gerarToken } from "../utils/jwt";
import bcrypt from "bcrypt";

export class AuthService {
  async login(dados: LoginDTO): Promise<LoginRespostaDTO> {
    const { email, senha } = dados;

    const usuario = await this.buscarUsuarioPorEmail(email);

    if (!usuario) {
      await publicadorEventos.publicar(
        EventosTipo.LOGIN_FALHOU,
        { email, motivo: "Usuario nao encontrado" },
        "auth-service"
      );
      throw new ErroNaoAutorizado("Email ou senha incorretos");
    }

    if (usuario.status !== "aprovado") {
      await publicadorEventos.publicar(
        EventosTipo.LOGIN_FALHOU,
        { email, motivo: "Conta nao aprovada" },
        "auth-service"
      );
      throw new ErroProibido("Conta aguardando pela aprovação do gerente");
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      await publicadorEventos.publicar(
        EventosTipo.LOGIN_FALHOU,
        { email, motivo: "Senha incorreta" },
        "auth-service"
      );
      throw new ErroNaoAutorizado("Email ou senha incorretos");
    }

    const token = gerarToken({
      id: usuario.id,
      email: usuario.email,
      cargo: usuario.cargo,
      unidade_id: usuario.unidade_id,
    });

    await publicadorEventos.publicar(
      EventosTipo.LOGIN_REALIZADO,
      { id: usuario.id, email: usuario.email },
      "auth-service"
    );

    await cacheService.armazenar(
      `sessao:${usuario.id}`,
      { logadoEm: new Date() },
      { ttl: 7200, namespace: "auth" }
    );

    logger.info(`Login realizado com sucesso: ${email}`);

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo,
        unidade_id: usuario.unidade_id,
        status: usuario.status,
      },
    };
  }

  private async buscarUsuarioPorEmail(email: string): Promise<any> {
    const chaveCache = `usuario:email:${email}`;

    return await cacheService.buscarOuExecutar(
      chaveCache,
      async () => {
        const [resultado] = await sequelize.query(
          "SELECT * FROM usuarios WHERE email = :email LIMIT 1",
          {
            replacements: { email },
            type: "SELECT",
          }
        );
        return resultado || null;
      },
      { ttl: 600, namespace: "usuarios" }
    );
  }
}

export const authService = new AuthService();
