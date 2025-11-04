// utils/mailer.js
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

// Safety timeouts (ms)
const DEFAULT_SEND_TIMEOUT_MS = parseInt(process.env.MAIL_SEND_TIMEOUT_MS || "20000", 10); // 20s

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
    // Use configured SMTP
    try {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: { user: smtpUser, pass: smtpPass },
        // Add timeouts to avoid long hangs
        greetingTimeout: 10000,
        connectionTimeout: 10000,
        socketTimeout: 10000,
      });
      usingEthereal = false;
      return transporter;
    } catch (e) {
      console.warn("Failed to create SMTP transporter, falling back to Ethereal:", e?.message || e);
      transporter = null;
    }
  }

  // Fallback: create ethereal test account for local development
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
      greetingTimeout: 10000,
      connectionTimeout: 10000,
      socketTimeout: 10000,
    });
    usingEthereal = true;
    console.log("[MAILER] Using Ethereal test account (development). Preview URLs will appear in server logs.");
    return transporter;
  } catch (err) {
    console.error("Failed to create Ethereal test account:", err?.message || err);
    transporter = null;
    usingEthereal = false;
    return null;
  }
};

/**
 * sendMail - sends email via configured transporter, with a safety timeout.
 * Returns an object: { ok: true, info, previewUrl? } on success.
 * Throws on failure.
 */
export const sendMail = async ({ to, subject, text, html, from }) => {
  const t = await initTransporter();

  if (!t) {
    // no transporter available: log the message and throw so caller knows
    console.warn("[MAILER] No transporter available. Email not sent. Logging message:");
    console.log({ to, subject, text, html });
    throw new Error("no_mail_transporter");
  }

  const mailOptions = {
    from: from || (process.env.SMTP_FROM || (usingEthereal ? `"No Reply" <no-reply@ethereal.test>` : process.env.SMTP_USER)),
    to,
    subject,
    text,
    html,
  };

  // sendMail promise
  const sendPromise = t.sendMail(mailOptions);

  // safety timeout
  const timeoutMs = DEFAULT_SEND_TIMEOUT_MS;
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("sendMail_timeout")), timeoutMs));

  try {
    const info = await Promise.race([sendPromise, timeoutPromise]);

    // If using Ethereal, get preview URL
    let previewUrl = null;
    try {
      previewUrl = nodemailer.getTestMessageUrl(info) || null;
    } catch (e) {
      previewUrl = null;
    }

    if (usingEthereal && previewUrl) {
      console.log("[MAILER] Ethereal preview URL:", previewUrl);
    }

    return { ok: true, info, previewUrl };
  } catch (err) {
    console.warn("[MAILER] sendMail error:", err?.message || err);
    throw err;
  }
};
