import { Router } from "express";
import {
  listarUnidades,
  buscarUnidade,
  criarUnidade,
  atualizarUnidade,
  deletarUnidade,
  buscarEnderecoCEP,
} from "../controllers/UnidadesController";
import {
  autenticacao,
  apenasGerente,
  verificarAcessoUnidade,
} from "../middleware/autorizacao";

const router = Router();

router.get("/internal/:id", buscarUnidade);

router.get("/", autenticacao, listarUnidades);
router.get("/cep/:cep", autenticacao, buscarEnderecoCEP);
router.get("/:id", autenticacao, verificarAcessoUnidade, buscarUnidade);
router.post("/", autenticacao, apenasGerente, criarUnidade);
router.put("/:id", autenticacao, apenasGerente, atualizarUnidade);
router.delete("/:id", autenticacao, apenasGerente, deletarUnidade);

export default router;
