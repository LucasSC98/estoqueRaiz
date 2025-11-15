import { Router } from "express";
import {
  listarMovimentacoes,
  buscarMovimentacao,
  criarMovimentacao,
  deletarMovimentacao,
} from "../controllers/MovimentacoesController";
import {
  autenticacao,
  apenasGerente,
  verificarAcessoUnidade,
} from "../middleware/autorizacao";

const router = Router();

router.get("/", autenticacao, listarMovimentacoes);
router.get("/:id", autenticacao, buscarMovimentacao);
router.post("/", autenticacao, verificarAcessoUnidade, criarMovimentacao);
router.delete("/:id", autenticacao, apenasGerente, deletarMovimentacao);

export default router;
