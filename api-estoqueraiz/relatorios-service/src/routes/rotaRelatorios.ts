import { Router } from "express";
import {
  gerarCurvaABC,
  obterEstatisticas,
} from "../controllers/RelatoriosController";
import { autenticacao } from "../middleware/autorizacao";

const router = Router();

router.get("/curva-abc", autenticacao, gerarCurvaABC);
router.get("/estatisticas", autenticacao, obterEstatisticas);

export default router;
