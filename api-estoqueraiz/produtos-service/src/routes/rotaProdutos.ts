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
import { upload, handleMulterError } from "../utils/uploadImagem";

const router = Router();

router.get("/", autenticacao, listarProdutos);
router.get("/pendentes", autenticacao, financeiroOuGerente, listarPendentes);
router.get("/:id", autenticacao, buscarProduto);
router.post(
  "/",
  autenticacao,
  apenasEstoquistaOuGerente,
  verificarAcessoUnidade,
  upload.single("imagem"),
  handleMulterError,
  criarProduto
);
router.put(
  "/:id",
  autenticacao,
  upload.single("imagem"),
  handleMulterError,
  atualizarProduto
);
router.delete("/:id", autenticacao, apenasGerente, deletarProduto);
router.patch("/:id/aprovar", autenticacao, financeiroOuGerente, aprovarProduto);
router.patch(
  "/:id/rejeitar",
  autenticacao,
  financeiroOuGerente,
  rejeitarProduto
);

export default router;
