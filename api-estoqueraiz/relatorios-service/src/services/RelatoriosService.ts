import { logger } from "../../../shared/utils/logger";
import { cacheService } from "../../../shared/utils/cache";
import { sequelize } from "../../../shared/config/database";
import { QueryTypes, Op } from "sequelize";
import {
  CurvaABCDTO,
  ProdutoCurvaABC,
  ResumoCurvaABC,
  EstatisticasDTO,
} from "../dto/RelatorioDTO";

export class RelatoriosService {
  async gerarCurvaABC(filtros: CurvaABCDTO): Promise<any> {
    const { data_inicio, data_fim, unidade_id } = filtros;

    const cacheKey = `curvaABC:${JSON.stringify(filtros)}`;

    return await cacheService.buscarOuExecutar(
      cacheKey,
      async () => {
        const query = `
          SELECT 
            p.id as produto_id,
            p.nome,
            c.nome as categoria,
            u.nome as unidade,
            SUM(m.quantidade) as quantidade_vendida,
            p.preco_venda,
            SUM(m.quantidade * p.preco_venda) as valor_total
          FROM movimentacoes m
          INNER JOIN produtos p ON m.produto_id = p.id
          LEFT JOIN categorias c ON p.categoria_id = c.id
          LEFT JOIN unidades u ON p.unidade_id = u.id
          WHERE m.tipo = 'SAIDA'
            ${
              data_inicio && data_fim
                ? `AND m.data_movimentacao BETWEEN :data_inicio AND :data_fim`
                : ""
            }
            ${unidade_id ? `AND m.unidade_origem_id = :unidade_id` : ""}
          GROUP BY p.id, p.nome, c.nome, u.nome, p.preco_venda
          ORDER BY valor_total DESC
        `;

        const produtos: any[] = await sequelize.query(query, {
          replacements: { data_inicio, data_fim, unidade_id },
          type: QueryTypes.SELECT,
        });

        if (produtos.length === 0) {
          return {
            produtos: [],
            resumo: [],
            estatisticas: {
              total_produtos: 0,
              valor_total_geral: 0,
              periodo: { data_inicio, data_fim },
            },
          };
        }

        const valorTotalGeral = produtos.reduce(
          (total, p) => total + parseFloat(p.valor_total),
          0
        );

        let percentualAcumulado = 0;
        const produtosCurvaABC: ProdutoCurvaABC[] = produtos.map((produto) => {
          const valorTotal = parseFloat(produto.valor_total);
          const percentualParticipacao = (valorTotal / valorTotalGeral) * 100;
          percentualAcumulado += percentualParticipacao;

          let classificacao: "A" | "B" | "C";
          if (percentualAcumulado <= 80) {
            classificacao = "A";
          } else if (percentualAcumulado <= 95) {
            classificacao = "B";
          } else {
            classificacao = "C";
          }

          return {
            produto_id: produto.produto_id,
            nome: produto.nome,
            categoria: produto.categoria || "Sem categoria",
            unidade: produto.unidade || "Sem unidade",
            quantidade_vendida: parseInt(produto.quantidade_vendida),
            valor_total: valorTotal,
            percentual_participacao:
              Math.round(percentualParticipacao * 100) / 100,
            percentual_acumulado: Math.round(percentualAcumulado * 100) / 100,
            classificacao,
          };
        });

        const resumo: ResumoCurvaABC[] = ["A", "B", "C"].map((classe) => {
          const produtosDaClasse = produtosCurvaABC.filter(
            (p) => p.classificacao === classe
          );
          const valorTotalClasse = produtosDaClasse.reduce(
            (total, p) => total + p.valor_total,
            0
          );

          return {
            classe: classe as "A" | "B" | "C",
            quantidade_produtos: produtosDaClasse.length,
            valor_total: valorTotalClasse,
            percentual_valor:
              Math.round((valorTotalClasse / valorTotalGeral) * 10000) / 100,
            percentual_produtos:
              Math.round(
                (produtosDaClasse.length / produtosCurvaABC.length) * 10000
              ) / 100,
          };
        });

        logger.info(`Curva ABC gerada com ${produtosCurvaABC.length} produtos`);

        return {
          produtos: produtosCurvaABC,
          resumo,
          estatisticas: {
            total_produtos: produtosCurvaABC.length,
            valor_total_geral: valorTotalGeral,
            periodo: { data_inicio, data_fim },
            unidade_id: unidade_id || "todas",
          },
        };
      },
      { ttl: 1800, namespace: "relatorios" }
    );
  }

  async obterEstatisticasGerais(filtros: EstatisticasDTO): Promise<any> {
    const { unidade_id } = filtros;

    const cacheKey = `estatisticas:${unidade_id || "todas"}`;

    return await cacheService.buscarOuExecutar(
      cacheKey,
      async () => {
        const whereClause: any = {};

        if (unidade_id) {
          whereClause.unidade_origem_id = unidade_id;
        }

        const query = `
          SELECT 
            COUNT(*) as total_movimentacoes,
            SUM(CASE WHEN tipo = 'SAIDA' THEN 1 ELSE 0 END) as total_saidas,
            SUM(CASE WHEN tipo = 'ENTRADA' THEN 1 ELSE 0 END) as total_entradas,
            SUM(CASE WHEN tipo = 'TRANSFERENCIA' THEN 1 ELSE 0 END) as total_transferencias,
            SUM(CASE WHEN tipo = 'AJUSTE' THEN 1 ELSE 0 END) as total_ajustes
          FROM movimentacoes
          ${unidade_id ? `WHERE unidade_origem_id = :unidade_id` : ""}
        `;

        const [estatisticas]: any = await sequelize.query(query, {
          replacements: { unidade_id },
          type: QueryTypes.SELECT,
        });

        const seiseMesesAtras = new Date();
        seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);

        const queryMensal = `
          SELECT 
            DATE_TRUNC('month', data_movimentacao) as mes,
            tipo,
            COUNT(*) as total
          FROM movimentacoes
          WHERE data_movimentacao >= :data_inicio
            ${unidade_id ? `AND unidade_origem_id = :unidade_id` : ""}
          GROUP BY mes, tipo
          ORDER BY mes ASC
        `;

        const movimentacoesPorMes = await sequelize.query(queryMensal, {
          replacements: { data_inicio: seiseMesesAtras, unidade_id },
          type: QueryTypes.SELECT,
        });

        const queryProdutos = `
          SELECT 
            COUNT(*) as total_produtos,
            SUM(CASE WHEN ativo = true AND "statusProduto" = 'aprovado' THEN 1 ELSE 0 END) as total_produtos_ativos,
            SUM(CASE WHEN quantidade_estoque < quantidade_minima AND ativo = true THEN 1 ELSE 0 END) as produtos_estoque_baixo,
            SUM(CASE WHEN data_validade BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND ativo = true THEN 1 ELSE 0 END) as produtos_vencendo,
            SUM(quantidade_estoque * preco_custo) as valor_total_estoque
          FROM produtos
          ${unidade_id ? `WHERE unidade_id = :unidade_id` : ""}
        `;

        const [estatisticasProdutos]: any = await sequelize.query(
          queryProdutos,
          {
            replacements: { unidade_id },
            type: QueryTypes.SELECT,
          }
        );

        const queryCategorias = `
          SELECT COUNT(*) as total_categorias FROM categorias
        `;

        const [estatisticasCategorias]: any = await sequelize.query(
          queryCategorias,
          {
            type: QueryTypes.SELECT,
          }
        );

        const queryUsuarios = `
          SELECT COUNT(*) as total_usuarios FROM usuarios WHERE status = 'aprovado'
          ${unidade_id ? `AND unidade_id = :unidade_id` : ""}
        `;

        const [estatisticasUsuarios]: any = await sequelize.query(
          queryUsuarios,
          {
            replacements: { unidade_id },
            type: QueryTypes.SELECT,
          }
        );

        const queryUnidades = `
          SELECT COUNT(*) as total_unidades FROM unidades
        `;

        const [estatisticasUnidades]: any = await sequelize.query(
          queryUnidades,
          {
            type: QueryTypes.SELECT,
          }
        );

        logger.info(`Estatísticas gerais obtidas`);

        return {
          estatisticas_gerais: {
            total_movimentacoes: parseInt(estatisticas.total_movimentacoes),
            total_saidas: parseInt(estatisticas.total_saidas),
            total_entradas: parseInt(estatisticas.total_entradas),
            total_transferencias: parseInt(estatisticas.total_transferencias),
            total_ajustes: parseInt(estatisticas.total_ajustes),
            total_produtos: parseInt(estatisticasProdutos.total_produtos),
            total_produtos_ativos: parseInt(
              estatisticasProdutos.total_produtos_ativos
            ),
            total_categorias: parseInt(estatisticasCategorias.total_categorias),
            total_usuarios: parseInt(estatisticasUsuarios.total_usuarios),
            total_unidades: parseInt(estatisticasUnidades.total_unidades),
            produtos_estoque_baixo: parseInt(
              estatisticasProdutos.produtos_estoque_baixo
            ),
            produtos_vencendo: parseInt(estatisticasProdutos.produtos_vencendo),
            valor_total_estoque:
              parseFloat(estatisticasProdutos.valor_total_estoque) || 0,
          },
          movimentacoes_por_mes: movimentacoesPorMes,
        };
      },
      { ttl: 900, namespace: "relatorios" }
    );
  }
}

export const relatoriosService = new RelatoriosService();
