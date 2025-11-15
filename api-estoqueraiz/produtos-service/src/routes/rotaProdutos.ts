import { Router } from "express";
import {
  listarProdutos,
  buscarProduto,
  criarProduto,
  atualizarProduto,
  deletarProduto,
  aprovarProduto,
  rejeitarProduto,
  listarPendentes,
} from "../controllers/ProdutosController";
import {
  autenticacao,
  apenasGerente,
  financeiroOuGerente,
  apenasEstoquistaOuGerente,
  verificarAcessoUnidade,
} from "../middleware/autorizacao";

const router = Router();

router.get("/", autenticacao, listarProdutos);
router.get("/pendentes", autenticacao, financeiroOuGerente, listarPendentes);
router.get("/:id", autenticacao, buscarProduto);
router.post(
  "/",
  autenticacao,
  apenasEstoquistaOuGerente,
  verificarAcessoUnidade,
  criarProduto
);
router.put("/:id", autenticacao, atualizarProduto);
router.delete("/:id", autenticacao, apenasGerente, deletarProduto);
router.patch("/:id/aprovar", autenticacao, financeiroOuGerente, aprovarProduto);
router.patch(
  "/:id/rejeitar",
  autenticacao,
  financeiroOuGerente,
  rejeitarProduto
);

export default router;
