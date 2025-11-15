export interface LoginDTO {
  email: string;
  senha: string;
}

export interface LoginRespostaDTO {
  token: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
    cargo: string;
    unidade_id: number;
    status: string;
  };
}
