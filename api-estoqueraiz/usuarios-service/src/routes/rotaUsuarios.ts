import { Router } from "express";
import {
  listarUsuarios,
  buscarUsuario,
  criarUsuario,
  atualizarUsuario,
  deletarUsuario,
  listarPendentes,
  aprovarUsuario,
  rejeitarUsuario,
  alterarCargoUsuario,
} from "../controllers/UsuariosController";
import { autenticacao, apenasGerente } from "../middleware/autenticacao";

const router = Router();

// Rotas públicas para comunicação entre microserviços
router.get("/internal/:id", buscarUsuario); // Sem autenticação para uso interno

// Rotas com autenticação
router.post("/", criarUsuario);
router.get("/", autenticacao, listarUsuarios);
router.get("/pendentes", autenticacao, apenasGerente, listarPendentes);
router.get("/:id", autenticacao, buscarUsuario);
router.put("/:id", autenticacao, atualizarUsuario);
router.delete("/:id", autenticacao, apenasGerente, deletarUsuario);
router.patch("/:id/aprovar", autenticacao, apenasGerente, aprovarUsuario);
router.patch("/:id/rejeitar", autenticacao, apenasGerente, rejeitarUsuario);
router.put(
  "/:id/alterar-cargo",
  autenticacao,
  apenasGerente,
  alterarCargoUsuario
);

export default router;
