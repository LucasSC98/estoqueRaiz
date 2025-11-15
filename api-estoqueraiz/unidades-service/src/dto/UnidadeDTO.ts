export interface CriarUnidadeDTO {
  nome: string;
  descricao?: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface AtualizarUnidadeDTO {
  nome?: string;
  descricao?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}
