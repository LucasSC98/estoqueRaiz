import { Router } from "express";
import {
  listarCategorias,
  buscarCategoria,
  criarCategoria,
  atualizarCategoria,
  deletarCategoria,
} from "../controllers/CategoriasController";
import { autenticacao, apenasGerente } from "../middleware/autorizacao";

const router = Router();

router.get("/internal/:id", buscarCategoria);

router.get("/", autenticacao, listarCategorias);
router.get("/:id", autenticacao, buscarCategoria);
router.post("/", autenticacao, apenasGerente, criarCategoria);
router.put("/:id", autenticacao, apenasGerente, atualizarCategoria);
router.delete("/:id", autenticacao, apenasGerente, deletarCategoria);

export default router;
