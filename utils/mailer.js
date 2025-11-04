// utils/mailer.js
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

// timeout in ms for sendMail operation (safety net)
const MAIL_SEND_TIMEOUT_MS = parseInt(process.env.MAIL_SEND_TIMEOUT_MS || "5000", 10);

let transporter = null;
let usingEthereal = false;

/**
 * Initialize transporter:
 * - If SMTP env vars are provided, create a transporter using them (with sensible timeouts).
 * - Otherwise create an Ethereal test account (development) and a transporter for it.
 */
const initTransporter = async () => {
  if (transporter) return transporter;

if (smtpHost && smtpPort && smtpUser && smtpPass) {
  try {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: { user: smtpUser, pass: smtpPass },
      // timeouts to avoid long blocking calls
      greetingTimeout: 5000,     // wait for server greeting
      connectionTimeout: 5000,   // socket connect timeout
      socketTimeout: 5000,       // socket inactivity timeout
      // optional pooling could be enabled for high volume:
      // pool: true,
    });
  } catch (e) {
    console.warn("Failed to create nodemailer transporter:", e?.message || e);
    transporter = null;
  }
} else {
  console.warn("SMTP is not fully configured. Emails will be logged to console.");
}

/**
 * sendMail - sends email via configured transporter, but with a safety timeout.
 * If transporter is not configured the function logs the message and resolves.
 *
 * @param {object} param0
 * @param {string} param0.to
 * @param {string} param0.subject
 * @param {string} [param0.text]
 * @param {string} [param0.html]
 * @returns {Promise<any>}
 */
export const sendMail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    // Mailer not configured: log and return resolved promise
    console.log("[MAILER-LOG] to:", to);
    console.log("[MAILER-LOG] subject:", subject);
    if (html) console.log("[MAILER-LOG] html:", html);
    else if (text) console.log("[MAILER-LOG] text:", text);
    return { ok: true, logged: true };
  }

  const mailOptions = {
    from: smtpUser,
    to,
    subject,
    text,
    html,
  };

  // Use Promise.race to enforce a timeout for sendMail operation
  const sendPromise = transporter.sendMail(mailOptions);

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("sendMail_timeout")), Math.max(1000, MAIL_SEND_TIMEOUT_MS))
  );

  try {
    const result = await Promise.race([sendPromise, timeoutPromise]);
    return result;
  } catch (err) {
    // bubble up the error to caller (caller may choose to ignore)
    console.warn("sendMail error or timeout:", err?.message || err);
    throw err;
  }
};
