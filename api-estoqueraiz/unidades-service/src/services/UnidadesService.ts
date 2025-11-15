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
import UnidadesModel from "../models/UnidadesModel";
import { CriarUnidadeDTO, AtualizarUnidadeDTO } from "../dto/UnidadeDTO";

export class UnidadesService {
  async listarTodas(): Promise<any[]> {
    return await cacheService.buscarOuExecutar(
      "todas",
      async () => {
        return await UnidadesModel.findAll({
          order: [["nome", "ASC"]],
        });
      },
      { ttl: 600, namespace: "unidades" }
    );
  }

  async buscarPorId(id: number): Promise<any> {
    return await cacheService.buscarOuExecutar(
      `id:${id}`,
      async () => {
        const unidade = await UnidadesModel.findByPk(id);
        if (!unidade) {
          throw new ErroNaoEncontrado("Unidade não encontrada");
        }
        return unidade.toJSON();
      },
      { ttl: 600, namespace: "unidades" }
    );
  }

  async criar(dados: CriarUnidadeDTO): Promise<any> {
    const { nome, descricao, rua, numero, bairro, cidade, estado, cep } = dados;

    if (!nome || !rua || !numero || !bairro || !cidade || !estado || !cep) {
      throw new ErroValidacao("Campos obrigatórios faltando");
    }

    const novaUnidade = await UnidadesModel.create({
      nome,
      descricao,
      rua,
      numero,
      bairro,
      cidade,
      estado,
      cep,
    });

    await publicadorEventos.publicar(
      EventosTipo.UNIDADE_CRIADA,
      { id: novaUnidade.id, nome: novaUnidade.nome },
      "unidades-service"
    );

    await cacheService.invalidarPorPadrao("*", "unidades");

    logger.info(`Unidade criada: ${nome}`);

    return novaUnidade.toJSON();
  }

  async atualizar(id: number, dados: AtualizarUnidadeDTO): Promise<any> {
    const unidade = await UnidadesModel.findByPk(id);
    if (!unidade) {
      throw new ErroNaoEncontrado("Unidade não encontrada");
    }

    await unidade.update(dados);

    await publicadorEventos.publicar(
      EventosTipo.UNIDADE_ATUALIZADA,
      { id: unidade.id, nome: unidade.nome },
      "unidades-service"
    );

    await cacheService.invalidarPorPadrao("*", "unidades");
    await cacheService.invalidar(`id:${id}`, "unidades");

    logger.info(`Unidade atualizada: ID ${id}`);

    return unidade.toJSON();
  }

  async deletar(id: number): Promise<void> {
    const unidade = await UnidadesModel.findByPk(id);
    if (!unidade) {
      throw new ErroNaoEncontrado("Unidade não encontrada");
    }

    await unidade.destroy();

    await publicadorEventos.publicar(
      EventosTipo.UNIDADE_DELETADA,
      { id, nome: unidade.nome },
      "unidades-service"
    );

    await cacheService.invalidarPorPadrao("*", "unidades");
    await cacheService.invalidar(`id:${id}`, "unidades");

    logger.info(`Unidade deletada: ID ${id}`);
  }
}

export const unidadesService = new UnidadesService();
