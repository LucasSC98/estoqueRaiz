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
import CategoriasModel from "../models/CategoriasModel";
import { CriarCategoriaDTO, AtualizarCategoriaDTO } from "../dto/CategoriaDTO";

export class CategoriasService {
  async listarTodas(): Promise<any[]> {
    return await cacheService.buscarOuExecutar(
      "todas",
      async () => {
        return await CategoriasModel.findAll({
          order: [["nome", "ASC"]],
        });
      },
      { ttl: 600, namespace: "categorias" }
    );
  }

  async buscarPorId(id: number): Promise<any> {
    return await cacheService.buscarOuExecutar(
      `id:${id}`,
      async () => {
        const categoria = await CategoriasModel.findByPk(id);
        if (!categoria) {
          throw new ErroNaoEncontrado("Categoria não encontrada");
        }
        return categoria.toJSON();
      },
      { ttl: 600, namespace: "categorias" }
    );
  }

  async criar(dados: CriarCategoriaDTO): Promise<any> {
    const { nome, descricao } = dados;

    if (!nome) {
      throw new ErroValidacao("Nome é obrigatório");
    }

    const novaCategoria = await CategoriasModel.create({
      nome,
      descricao,
    });

    await publicadorEventos.publicar(
      EventosTipo.CATEGORIA_CRIADA,
      { id: novaCategoria.id, nome: novaCategoria.nome },
      "categorias-service"
    );

    await cacheService.invalidarPorPadrao("*", "categorias");

    logger.info(`Categoria criada: ${nome}`);

    return novaCategoria.toJSON();
  }

  async atualizar(id: number, dados: AtualizarCategoriaDTO): Promise<any> {
    const categoria = await CategoriasModel.findByPk(id);
    if (!categoria) {
      throw new ErroNaoEncontrado("Categoria não encontrada");
    }

    await categoria.update(dados);

    await publicadorEventos.publicar(
      EventosTipo.CATEGORIA_ATUALIZADA,
      { id: categoria.id, nome: categoria.nome },
      "categorias-service"
    );

    await cacheService.invalidarPorPadrao("*", "categorias");
    await cacheService.invalidar(`id:${id}`, "categorias");

    logger.info(`Categoria atualizada: ID ${id}`);

    return categoria.toJSON();
  }

  async deletar(id: number): Promise<void> {
    const categoria = await CategoriasModel.findByPk(id);
    if (!categoria) {
      throw new ErroNaoEncontrado("Categoria não encontrada");
    }

    await categoria.destroy();

    await publicadorEventos.publicar(
      EventosTipo.CATEGORIA_DELETADA,
      { id, nome: categoria.nome },
      "categorias-service"
    );

    await cacheService.invalidarPorPadrao("*", "categorias");
    await cacheService.invalidar(`id:${id}`, "categorias");

    logger.info(`Categoria deletada: ID ${id}`);
  }
}

export const categoriasService = new CategoriasService();
