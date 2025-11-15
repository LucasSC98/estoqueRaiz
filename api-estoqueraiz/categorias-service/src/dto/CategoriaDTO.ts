export interface CriarCategoriaDTO {
  nome: string;
  descricao?: string;
}

export interface AtualizarCategoriaDTO {
  nome?: string;
  descricao?: string;
}
