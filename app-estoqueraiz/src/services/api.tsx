import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const api = axios.create({
  baseURL: "http://10.10.0.235",
  timeout: 10000,
});

// cache para respostas GET geral e de movimentações
const cache = new Map();
const CACHE_DURATION = 30000;
const MOVIMENTACOES_CACHE_DURATION = 15000;

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.method === "get") {
      // Não fazer cache de produtos pendentes (sempre buscar dados frescos)
      if (
        config.url?.includes("/produtos/pendentes") ||
        config.url?.includes("/produtos?")
      ) {
        return config;
      }

      const params = config.params || {};
      const cacheKey = `${config.url}${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);

      const cacheDuration = config.url?.includes("/movimentacoes")
        ? MOVIMENTACOES_CACHE_DURATION
        : CACHE_DURATION;

      if (cached && Date.now() - cached.timestamp < cacheDuration) {
        return Promise.reject({ cached: cached.data });
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response.config.method === "get") {
      // Não cachear produtos pendentes (sempre buscar dados frescos)
      if (
        response.config.url?.includes("/produtos/pendentes") ||
        response.config.url?.includes("/produtos?")
      ) {
        return response;
      }

      const params = response.config.params || {};
      const cacheKey = `${response.config.url}${JSON.stringify(params)}`;
      cache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
      });
    }
    return response;
  },
  (error) => {
    if (error.cached) {
      return Promise.resolve(error.cached);
    }

    if (error.code === "ECONNABORTED") {
      console.error("Request timeout - verifique sua conexão");
    }

    return Promise.reject(error);
  }
);

export const getMovimentacoesPaginadas = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  produto_id?: number;
  tipo?: string;
  unidade_id?: number;
  data_inicio?: string;
  data_fim?: string;
}) => {
  try {
    const response = await api.get("/api/movimentacoes", {
      timeout: 8000,
    });

    // Backend retorna array direto, então transformamos para o formato esperado
    const todasMovimentacoes = Array.isArray(response.data)
      ? response.data
      : [];

    // Filtragem manual no frontend
    let movimentacoesFiltradas = todasMovimentacoes;

    // Filtro por produto
    if (params?.produto_id) {
      movimentacoesFiltradas = movimentacoesFiltradas.filter(
        (m: any) => m.produto_id === params.produto_id
      );
    }

    // Filtro por tipo
    if (params?.tipo) {
      movimentacoesFiltradas = movimentacoesFiltradas.filter(
        (m: any) => m.tipo === params.tipo
      );
    }

    // Filtro por unidade
    if (params?.unidade_id) {
      movimentacoesFiltradas = movimentacoesFiltradas.filter(
        (m: any) => m.unidade_id === params.unidade_id
      );
    }

    // Filtro por pesquisa (busca no nome do produto ou descrição)
    if (params?.search && params.search.trim()) {
      const searchLower = params.search.toLowerCase();
      movimentacoesFiltradas = movimentacoesFiltradas.filter(
        (m: any) =>
          m.produto?.nome?.toLowerCase().includes(searchLower) ||
          m.observacao?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por data
    if (params?.data_inicio) {
      movimentacoesFiltradas = movimentacoesFiltradas.filter(
        (m: any) =>
          new Date(m.data_movimentacao) >= new Date(params.data_inicio!)
      );
    }
    if (params?.data_fim) {
      movimentacoesFiltradas = movimentacoesFiltradas.filter(
        (m: any) => new Date(m.data_movimentacao) <= new Date(params.data_fim!)
      );
    }

    // Paginação manual
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const movimentacoesPaginadas = movimentacoesFiltradas.slice(
      startIndex,
      endIndex
    );

    return {
      movimentacoes: movimentacoesPaginadas,
      pagination: {
        current_page: page,
        total_items: movimentacoesFiltradas.length,
        total_pages: Math.ceil(movimentacoesFiltradas.length / limit),
        per_page: limit,
      },
    };
  } catch (error) {
    console.error("Erro ao buscar movimentações paginadas:", error);
    throw error;
  }
};

export const getCurvaABCRelatorio = async (filtros?: {
  data_inicio?: string;
  data_fim?: string;
  unidade_id?: number;
}) => {
  const params = new URLSearchParams();
  if (filtros?.data_inicio) params.append("data_inicio", filtros.data_inicio);
  if (filtros?.data_fim) params.append("data_fim", filtros.data_fim);
  if (filtros?.unidade_id)
    params.append("unidade_id", filtros.unidade_id.toString());

  const response = await api.get(
    `/api/relatorios/curva-abc?${params.toString()}`
  );
  return response.data;
};

export const getProdutosPaginados = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  categoria_id?: number;
  unidade_id?: number;
  filtro_estoque?: "todos" | "baixo" | "zerado";
}) => {
  const queryParams = new URLSearchParams();

  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.search && params.search.trim())
    queryParams.append("search", params.search);
  if (params?.categoria_id)
    queryParams.append("categoria_id", params.categoria_id.toString());
  if (params?.unidade_id)
    queryParams.append("unidade_id", params.unidade_id.toString());
  if (params?.filtro_estoque && params.filtro_estoque !== "todos") {
    queryParams.append("filtro_estoque", params.filtro_estoque);
  }

  // Adicionar timestamp para evitar cache
  queryParams.append("_t", Date.now().toString());

  const response = await api.get(`/api/produtos?${queryParams.toString()}`, {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  // Backend retorna array direto, então transformamos para o formato esperado
  const todosOsProdutos = Array.isArray(response.data) ? response.data : [];

  // Filtragem manual no frontend (backend não implementa filtros)
  let produtosFiltrados = todosOsProdutos;

  // Filtro por categoria
  if (params?.categoria_id) {
    produtosFiltrados = produtosFiltrados.filter(
      (p: any) => p.categoria_id === params.categoria_id
    );
  }

  // Filtro por unidade
  if (params?.unidade_id) {
    produtosFiltrados = produtosFiltrados.filter(
      (p: any) => p.unidade_id === params.unidade_id
    );
  }

  // Filtro por estoque
  if (params?.filtro_estoque === "baixo") {
    produtosFiltrados = produtosFiltrados.filter(
      (p: any) =>
        p.quantidade_estoque > 0 &&
        p.quantidade_estoque <= (p.estoque_minimo || 10)
    );
  } else if (params?.filtro_estoque === "zerado") {
    produtosFiltrados = produtosFiltrados.filter(
      (p: any) => p.quantidade_estoque === 0
    );
  }

  // Filtro por pesquisa
  if (params?.search && params.search.trim()) {
    const searchLower = params.search.toLowerCase();
    produtosFiltrados = produtosFiltrados.filter(
      (p: any) =>
        p.nome?.toLowerCase().includes(searchLower) ||
        p.descricao?.toLowerCase().includes(searchLower)
    );
  }

  // Paginação manual
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const produtosPaginados = produtosFiltrados.slice(startIndex, endIndex);

  return {
    produtos: produtosPaginados,
    pagination: {
      currentPage: page,
      totalItems: produtosFiltrados.length,
      totalPages: Math.ceil(produtosFiltrados.length / limit),
      hasNextPage: endIndex < produtosFiltrados.length,
      hasPrevPage: page > 1,
    },
  };
};

export const getProdutosPendentesPaginados = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const queryParams = new URLSearchParams();

  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.search && params.search.trim())
    queryParams.append("search", params.search);

  // Adicionar timestamp para evitar cache
  queryParams.append("_t", Date.now().toString());

  const response = await api.get(
    `/api/produtos/pendentes?${queryParams.toString()}`,
    {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    }
  );

  // Backend retorna array direto, então transformamos para o formato esperado
  const todosPendentes = Array.isArray(response.data) ? response.data : [];

  // Filtro por pesquisa
  let produtosFiltrados = todosPendentes;
  if (params?.search && params.search.trim()) {
    const searchLower = params.search.toLowerCase();
    produtosFiltrados = produtosFiltrados.filter(
      (p: any) =>
        p.nome?.toLowerCase().includes(searchLower) ||
        p.descricao?.toLowerCase().includes(searchLower)
    );
  }

  // Paginação manual
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const produtosPaginados = produtosFiltrados.slice(startIndex, endIndex);

  return {
    produtos: produtosPaginados,
    pagination: {
      currentPage: page,
      totalItems: produtosFiltrados.length,
      totalPages: Math.ceil(produtosFiltrados.length / limit),
      hasNextPage: endIndex < produtosFiltrados.length,
      hasPrevPage: page > 1,
    },
  };
};

export const clearCache = () => {
  cache.clear();
};

export const getCargoUsuario = async (): Promise<string | null> => {
  try {
    const cargo = await AsyncStorage.getItem("cargo");
    return cargo;
  } catch (error) {
    console.error("Erro ao obter cargo do usuário:", error);
    return null;
  }
};

export const preloadMovimentacoes = async () => {
  try {
    await getMovimentacoesPaginadas({ page: 1, limit: 10 });
  } catch (error) {
    console.error("Erro ao pré-carregar movimentações:", error);
  }
};

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION * 2) {
      cache.delete(key);
    }
  }
}, CACHE_DURATION);

export default api;
