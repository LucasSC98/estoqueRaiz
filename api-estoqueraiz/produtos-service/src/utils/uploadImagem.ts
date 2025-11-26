import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { Request } from "express";
import { ErroValidacao } from "../../../shared/utils/tratamentoErros";

const EXTENSOES_PERMITIDAS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

const uploadsDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const hash = crypto.randomBytes(16).toString("hex");
    const extensao = path.extname(file.originalname).toLowerCase();
    const nomeUnico = `${Date.now()}-${hash}${extensao}`;
    cb(null, nomeUnico);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const extensao = path.extname(file.originalname).toLowerCase();

  if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
    return cb(
      new ErroValidacao(
        `Extensão de arquivo não permitida. Use: ${EXTENSOES_PERMITIDAS.join(
          ", "
        )}`
      )
    );
  }

  const mimetypesPermitidos = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (!mimetypesPermitidos.includes(file.mimetype)) {
    return cb(
      new ErroValidacao("Tipo de arquivo não permitido. Envie apenas imagens.")
    );
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: TAMANHO_MAXIMO,
  },
});

export const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        erro: true,
        message: `Arquivo muito grande. Tamanho máximo: ${
          TAMANHO_MAXIMO / 1024 / 1024
        }MB`,
      });
    }
    return res.status(400).json({
      erro: true,
      message: `Erro no upload: ${err.message}`,
    });
  }
  next(err);
};
