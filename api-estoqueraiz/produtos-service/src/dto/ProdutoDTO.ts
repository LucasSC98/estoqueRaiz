export interface CriarProdutoDTO {
  nome: string;
  descricao?: string;
  codigo_barras?: string;
  quantidade_estoque: number;
  quantidade_minima?: number;
  data_validade?: Date;
  lote?: string;
  localizacao?: string;
  imagem_url?: string;
  categoria_id: number;
  unidade_id: number;
  usuario_id: number;
}

export interface AtualizarProdutoDTO {
  nome?: string;
  descricao?: string;
  codigo_barras?: string;
  quantidade_estoque?: number;
  quantidade_minima?: number;
  data_validade?: Date;
  lote?: string;
  localizacao?: string;
  imagem_url?: string;
  ativo?: boolean;
  categoria_id?: number;
}

export interface AprovarProdutoDTO {
  preco_custo: number;
  preco_venda: number;
}
