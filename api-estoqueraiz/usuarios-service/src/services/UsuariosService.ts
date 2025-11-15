import { sequelize } from "../../../shared/config/database";
import { logger } from "../../../shared/utils/logger";
import { cacheService } from "../../../shared/utils/cache";
import {
  publicadorEventos,
  EventosTipo,
} from "../../../shared/eventos/publicador";
import {
  ErroValidacao,
  ErroNaoEncontrado,
} from "../../../shared/utils/tratamentoErros";
import UsuariosModel from "../models/UsuariosModel";
import {
  CriarUsuarioDTO,
  AtualizarUsuarioDTO,
  AprovarUsuarioDTO,
  AlterarCargoDTO,
} from "../dto/UsuarioDTO";
import { enviarEmail } from "../utils/smtp";
import {
  validarSenhaForte,
  validarCPF,
  validarEmail,
} from "../../../shared/utils/validacoes";

export class UsuariosService {
  async listarTodos(): Promise<any[]> {
    return await cacheService.buscarOuExecutar(
      "todos",
      async () => {
        return await UsuariosModel.findAll({
          attributes: { exclude: ["senha"] },
        });
      },
      { ttl: 300, namespace: "usuarios" }
    );
  }

  async buscarPorId(id: number): Promise<any> {
    return await cacheService.buscarOuExecutar(
      `id:${id}`,
      async () => {
        const usuario = await UsuariosModel.findByPk(id, {
          attributes: { exclude: ["senha"] },
        });
        if (!usuario) {
          throw new ErroNaoEncontrado("Usuário não encontrado");
        }
        return usuario;
      },
      { ttl: 600, namespace: "usuarios" }
    );
  }

  async criar(dados: CriarUsuarioDTO): Promise<any> {
    const { nome, email, senha, cpf } = dados;

    if (!validarEmail(email)) {
      throw new ErroValidacao("Email inválido");
    }

    if (!validarCPF(cpf)) {
      throw new ErroValidacao("CPF inválido");
    }

    if (!validarSenhaForte(senha)) {
      throw new ErroValidacao(
        "Senha deve ter pelo menos 6 caracteres, uma letra maiúscula e um número"
      );
    }

    const emailExistente = await UsuariosModel.findOne({ where: { email } });
    if (emailExistente) {
      throw new ErroValidacao("Email já está em uso");
    }

    const cpfExistente = await UsuariosModel.findOne({ where: { cpf } });
    if (cpfExistente) {
      throw new ErroValidacao("CPF já está em uso");
    }

    const novoUsuario = await UsuariosModel.create({
      nome,
      email,
      senha,
      cpf,
      status: "pendente",
      cargo: null,
      unidade_id: null,
    });

    await publicadorEventos.publicar(
      EventosTipo.USUARIO_CRIADO,
      { id: novoUsuario.id, email: novoUsuario.email, nome: novoUsuario.nome },
      "usuarios-service"
    );

    await cacheService.invalidarPorPadrao("*", "usuarios");

    enviarEmail(
      novoUsuario.email,
      "Bem-vindo ao Sistema Estoque Raiz",
      `Olá ${novoUsuario.nome},\n\nSua conta foi criada com sucesso!\n\nAguarde a aprovação do gerente.\n\nEmail: ${email}`
    ).catch((erro) => logger.error("Erro ao enviar email:", erro));

    logger.info(`Usuário criado: ${email}`);

    return novoUsuario.toJSON();
  }

  async atualizar(id: number, dados: AtualizarUsuarioDTO): Promise<any> {
    const usuario = await UsuariosModel.findByPk(id);
    if (!usuario) {
      throw new ErroNaoEncontrado("Usuário não encontrado");
    }

    await usuario.update(dados);

    await publicadorEventos.publicar(
      EventosTipo.USUARIO_ATUALIZADO,
      { id: usuario.id, email: usuario.email },
      "usuarios-service"
    );

    await cacheService.invalidarPorPadrao("*", "usuarios");
    await cacheService.invalidar(`email:${usuario.email}`, "usuarios");

    logger.info(`Usuário atualizado: ID ${id}`);

    return usuario.toJSON();
  }

  async deletar(id: number): Promise<void> {
    const usuario = await UsuariosModel.findByPk(id);
    if (!usuario) {
      throw new ErroNaoEncontrado("Usuário não encontrado");
    }

    await usuario.destroy();

    await publicadorEventos.publicar(
      EventosTipo.USUARIO_DELETADO,
      { id, email: usuario.email },
      "usuarios-service"
    );

    await cacheService.invalidarPorPadrao("*", "usuarios");
    await cacheService.invalidar(`email:${usuario.email}`, "usuarios");

    logger.info(`Usuário deletado: ID ${id}`);
  }

  async listarPendentes(): Promise<any[]> {
    return await UsuariosModel.findAll({
      where: { status: "pendente" },
      attributes: { exclude: ["senha"] },
    });
  }

  async aprovar(id: number, dados: AprovarUsuarioDTO): Promise<any> {
    const usuario = await UsuariosModel.findByPk(id);
    if (!usuario) {
      throw new ErroNaoEncontrado("Usuário não encontrado");
    }

    if (usuario.status !== "pendente") {
      throw new ErroValidacao("Usuário já foi processado");
    }

    await usuario.update({
      status: "aprovado",
      cargo: dados.cargo,
      unidade_id: dados.unidade_id,
    });

    await publicadorEventos.publicar(
      EventosTipo.USUARIO_APROVADO,
      { id: usuario.id, email: usuario.email, cargo: dados.cargo },
      "usuarios-service"
    );

    await cacheService.invalidarPorPadrao("*", "usuarios");

    enviarEmail(
      usuario.email,
      "Conta Aprovada - Estoque Raiz",
      `Olá ${usuario.nome},\n\nSua conta foi aprovada!\n\nCargo: ${dados.cargo}\n\nVocê já pode fazer login no sistema.`
    ).catch((erro) => logger.error("Erro ao enviar email:", erro));

    logger.info(`Usuário aprovado: ID ${id}`);

    return usuario.toJSON();
  }

  async rejeitar(id: number): Promise<any> {
    const usuario = await UsuariosModel.findByPk(id);
    if (!usuario) {
      throw new ErroNaoEncontrado("Usuário não encontrado");
    }

    if (usuario.status !== "pendente") {
      throw new ErroValidacao("Usuário já foi processado");
    }

    await usuario.update({ status: "rejeitado" });

    await publicadorEventos.publicar(
      EventosTipo.USUARIO_REJEITADO,
      { id: usuario.id, email: usuario.email },
      "usuarios-service"
    );

    await cacheService.invalidarPorPadrao("*", "usuarios");

    enviarEmail(
      usuario.email,
      "Conta Rejeitada - Estoque Raiz",
      `Olá ${usuario.nome},\n\nInfelizmente sua conta não foi aprovada.\n\nEntre em contato com o suporte para mais informações.`
    ).catch((erro) => logger.error("Erro ao enviar email:", erro));

    logger.info(`Usuário rejeitado: ID ${id}`);

    return usuario.toJSON();
  }

  async alterarCargo(
    id: number,
    dados: AlterarCargoDTO,
    usuarioLogadoId: number
  ): Promise<any> {
    const usuario = await UsuariosModel.findByPk(id);
    if (!usuario) {
      throw new ErroNaoEncontrado("Usuário não encontrado");
    }

    if (usuario.status !== "aprovado") {
      throw new ErroValidacao(
        "Apenas usuários aprovados podem ter cargo alterado"
      );
    }

    if (id === usuarioLogadoId && dados.cargo !== "gerente") {
      throw new ErroValidacao(
        "Gerente não pode remover seu próprio cargo de gerente"
      );
    }

    const cargoAnterior = usuario.cargo;
    await usuario.update({ cargo: dados.cargo });

    await publicadorEventos.publicar(
      EventosTipo.USUARIO_ATUALIZADO,
      {
        id: usuario.id,
        email: usuario.email,
        cargo_anterior: cargoAnterior,
        cargo_novo: dados.cargo,
      },
      "usuarios-service"
    );

    await cacheService.invalidarPorPadrao("*", "usuarios");

    logger.info(
      `Cargo alterado: usuário ${id} de ${cargoAnterior} para ${dados.cargo}`
    );

    return usuario.toJSON();
  }
}

export const usuariosService = new UsuariosService();
