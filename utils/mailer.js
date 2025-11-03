// utils/mailer.js
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

let transporter = null;

if (smtpHost && smtpPort && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465,
    auth: { user: smtpUser, pass: smtpPass }
  });
} else {
  console.warn("SMTP is not configured. Emails will be logged to console.");
}

export const sendMail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    console.log("[MAILER-LOG] to:", to);
    console.log("[MAILER-LOG] subject:", subject);
    console.log("[MAILER-LOG] html:", html || text);
    return { ok: true, logged: true };
  }
  const info = await transporter.sendMail({
    from: smtpUser,
    to,
    subject,
    text,
    html
  });
  return info;
};
