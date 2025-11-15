import nodemailer from "nodemailer";
import { logger } from "../../../shared/utils/logger";

const EMAIL_SERVICE = process.env.EMAIL_SERVICE || "gmail";
const EMAIL_USER = process.env.EMAIL_USER || "";
const EMAIL_PASS = process.env.EMAIL_PASS || "";

const transporter = nodemailer.createTransport({
  service: EMAIL_SERVICE,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

export const enviarEmail = async (
  destinatario: string,
  assunto: string,
  mensagem: string
): Promise<void> => {
  try {
    await transporter.sendMail({
      from: EMAIL_USER,
      to: destinatario,
      subject: assunto,
      text: mensagem,
    });
    logger.info(`Email enviado para: ${destinatario}`);
  } catch (erro) {
    logger.error(`Erro ao enviar email para ${destinatario}:`, erro);
    throw erro;
  }
};
