export interface Usuario {
  id: number;
  nome: string;
  email: string;
  senha: string;
  nivel: "gerente" | "funcionario" | "pendente";
  unidade_id: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface TokenPayload {
  id: number;
  email: string;
  nivel: string;
  unidade_id: number;
}
