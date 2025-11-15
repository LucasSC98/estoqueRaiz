export interface CurvaABCDTO {
  data_inicio?: string;
  data_fim?: string;
  unidade_id?: number;
}

export interface ProdutoCurvaABC {
  produto_id: number;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade_vendida: number;
  valor_total: number;
  percentual_participacao: number;
  percentual_acumulado: number;
  classificacao: "A" | "B" | "C";
}

export interface ResumoCurvaABC {
  classe: "A" | "B" | "C";
  quantidade_produtos: number;
  valor_total: number;
  percentual_valor: number;
  percentual_produtos: number;
}

export interface EstatisticasDTO {
  unidade_id?: number;
}
