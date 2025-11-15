export interface CriarUsuarioDTO {
  nome: string;
  email: string;
  senha: string;
  cpf: string;
}

export interface AtualizarUsuarioDTO {
  nome?: string;
  email?: string;
  senha?: string;
  cargo?: "gerente" | "estoquista" | "financeiro";
  unidade_id?: number;
}

export interface AlterarCargoDTO {
  cargo: "gerente" | "estoquista" | "financeiro";
}

export interface AprovarUsuarioDTO {
  cargo: "gerente" | "estoquista" | "financeiro";
  unidade_id: number;
}
