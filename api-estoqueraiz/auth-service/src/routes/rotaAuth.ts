import { Router } from "express";
import { login } from "../controllers/AuthController";
import { validacaoLogin } from "../middleware/validacaoLogin";

const router = Router();

router.post("/login", validacaoLogin, login);

export default router;
