import { Request, Response } from "express";
import { usuariosService } from "../services/UsuariosService";
import { asyncHandler } from "../../../shared/utils/tratamentoErros";
import { logger } from "../../../shared/utils/logger";

export const listarUsuarios = asyncHandler(
  async (req: Request, res: Response) => {
    logger.info("Listando todos os usuários");
    const usuarios = await usuariosService.listarTodos();
    res.json(usuarios);
  }
);

export const buscarUsuario = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Buscando usuário ID: ${id}`);
    const usuario = await usuariosService.buscarPorId(parseInt(id));
    res.json(usuario);
  }
);

export const criarUsuario = asyncHandler(
  async (req: Request, res: Response) => {
    const { nome, email, senha, cpf } = req.body;
    logger.info(`Criando usuário: ${email}`);
    const usuario = await usuariosService.criar({ nome, email, senha, cpf });
    res.status(201).json({
      message: "Usuário criado com sucesso. Aguardando aprovação.",
      usuario,
    });
  }
);

export const atualizarUsuario = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Atualizando usuário ID: ${id}`);
    const usuario = await usuariosService.atualizar(parseInt(id), req.body);
    res.json({
      message: "Usuário atualizado com sucesso",
      usuario,
    });
  }
);

export const deletarUsuario = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Deletando usuário ID: ${id}`);
    await usuariosService.deletar(parseInt(id));
    res.json({ message: "Usuário deletado com sucesso" });
  }
);

export const listarPendentes = asyncHandler(
  async (req: Request, res: Response) => {
    logger.info("Listando usuários pendentes");
    const usuarios = await usuariosService.listarPendentes();
    res.json(usuarios);
  }
);

export const aprovarUsuario = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cargo, unidade_id } = req.body;
    logger.info(`Aprovando usuário ID: ${id}`);
    const usuario = await usuariosService.aprovar(parseInt(id), {
      cargo,
      unidade_id,
    });
    res.json({
      message: "Usuário aprovado com sucesso",
      usuario,
    });
  }
);

export const rejeitarUsuario = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Rejeitando usuário ID: ${id}`);
    const usuario = await usuariosService.rejeitar(parseInt(id));
    res.json({
      message: "Usuário rejeitado",
      usuario,
    });
  }
);

export const alterarCargoUsuario = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cargo } = req.body;
    const usuarioLogadoId = (req as any).usuario?.id;

    logger.info(`Alterando cargo do usuário ID: ${id}`);
    const usuario = await usuariosService.alterarCargo(
      parseInt(id),
      { cargo },
      usuarioLogadoId
    );
    res.json({
      message: "Cargo alterado com sucesso",
      usuario,
    });
  }
);
