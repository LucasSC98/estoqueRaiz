import { Router } from "express";
import { login } from "../controllers/AuthController";
import { validacaoLogin } from "../middleware/validacaoLogin";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "auth" });
});

router.post("/login", validacaoLogin, login);

export default router;
