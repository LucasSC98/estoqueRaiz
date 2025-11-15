import axios from "axios";
import { logger } from "../../../shared/utils/logger";

export interface DadosCEP {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function buscarCEP(cep: string): Promise<DadosCEP | null> {
  try {
    const cepLimpo = cep.replace(/\D/g, "");

    if (cepLimpo.length !== 8) {
      logger.warn(`CEP inválido: ${cep}`);
      return null;
    }

    const response = await axios.get<DadosCEP>(
      `https://viacep.com.br/ws/${cepLimpo}/json/`,
      { timeout: 5000 }
    );

    if (response.data.erro) {
      logger.warn(`CEP não encontrado: ${cep}`);
      return null;
    }

    logger.info(`CEP encontrado: ${cep}`);
    return response.data;
  } catch (erro) {
    logger.error(`Erro ao buscar CEP ${cep}:`, erro);
    return null;
  }
}
