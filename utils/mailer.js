// utils/mailer.js
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { google } from "googleapis";

dotenv.config();

const MS = 1000;

// Environment-configurable values (set these in Railway environment)
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || ""; // app password if using simple SMTP
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || `"No Reply" <no-reply@example.com>`;

const USE_GMAIL_OAUTH2 = (process.env.MAIL_USE_GMAIL_OAUTH2 || "false").toLowerCase() === "true";
// For OAuth2 (if USE_GMAIL_OAUTH2 === true)
const GMAIL_OAUTH_CLIENT_ID = process.env.GMAIL_OAUTH_CLIENT_ID || "";
const GMAIL_OAUTH_CLIENT_SECRET = process.env.GMAIL_OAUTH_CLIENT_SECRET || "";
const GMAIL_OAUTH_REFRESH_TOKEN = process.env.GMAIL_OAUTH_REFRESH_TOKEN || "";
const GMAIL_OAUTH_USER = process.env.GMAIL_OAUTH_USER || SMTP_USER;

// Timeouts and retry controls (override via env)
const GREETING_TIMEOUT_MS = parseInt(process.env.MAIL_GREETING_TIMEOUT_MS || "10000", 10); // 10s
const CONNECTION_TIMEOUT_MS = parseInt(process.env.MAIL_CONNECTION_TIMEOUT_MS || "10000", 10); // 10s
const SOCKET_TIMEOUT_MS = parseInt(process.env.MAIL_SOCKET_TIMEOUT_MS || "30000", 10); // 30s
const DEFAULT_SEND_TIMEOUT_MS = parseInt(process.env.MAIL_SEND_TIMEOUT_MS || "30000", 10); // 30s per attempt base
const SEND_ATTEMPTS = parseInt(process.env.MAIL_SEND_ATTEMPTS || "3", 10);

let transporter = null;
let usingOAuth2 = false;

/**
 * Create OAuth2 access token using refresh token (if configured).
 * Returns access token string or throws.
 */
async function getOAuth2AccessToken() {
  if (!GMAIL_OAUTH_CLIENT_ID || !GMAIL_OAUTH_CLIENT_SECRET || !GMAIL_OAUTH_REFRESH_TOKEN) {
    throw new Error("gmail_oauth2_not_configured");
  }
  const oAuth2Client = new google.auth.OAuth2(
    GMAIL_OAUTH_CLIENT_ID,
    GMAIL_OAUTH_CLIENT_SECRET
  );
  oAuth2Client.setCredentials({ refresh_token: GMAIL_OAUTH_REFRESH_TOKEN });
  const { token } = await oAuth2Client.getAccessToken();
  if (!token) throw new Error("failed_to_get_oauth2_access_token");
  return token;
}

/**
 * Build transporter configuration:
 * - If USE_GMAIL_OAUTH2 true -> use OAuth2 config (service: 'gmail')
 * - Else if SMTP_HOST/PORT/USER/PASS present -> use standard SMTP transport
 * - Else fallback to Ethereal (development only)
 */
const buildAndVerifyTransporter = async () => {
  if (transporter) return transporter; // cached

  // If user explicitly requests Gmail OAuth2
  if (USE_GMAIL_OAUTH2) {
    if (!GMAIL_OAUTH_USER) throw new Error("GMAIL_OAUTH_USER is required for OAuth2 mode");

    // Create transporter using OAuth2. We will fetch an access token at send-time and set it in auth.
    const config = {
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: GMAIL_OAUTH_USER,
        clientId: GMAIL_OAUTH_CLIENT_ID,
        clientSecret: GMAIL_OAUTH_CLIENT_SECRET,
        refreshToken: GMAIL_OAUTH_REFRESH_TOKEN,
        accessToken: undefined, // will be set later
      },
      greetingTimeout: GREETING_TIMEOUT_MS,
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      socketTimeout: SOCKET_TIMEOUT_MS,
      logger: true,
      debug: true,
    };

    // Verify transporter by verifying with a fresh access token
    try {
      const accessToken = await getOAuth2AccessToken();
      config.auth.accessToken = accessToken;
      const t = nodemailer.createTransport(config);
      await t.verify();
      transporter = t;
      usingOAuth2 = true;
      console.log("[MAILER] Verified Gmail OAuth2 transporter.");
      return transporter;
    } catch (err) {
      console.warn("[MAILER] Gmail OAuth2 transporter verification failed:", err?.message || err);
      transporter = null;
      usingOAuth2 = false;
      throw err;
    }
  }

  // Otherwise attempt plain SMTP using provided SMTP_HOST/PORT/USER/PASS
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    const conf = {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      greetingTimeout: GREETING_TIMEOUT_MS,
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      socketTimeout: SOCKET_TIMEOUT_MS,
      logger: true,
      debug: true,
      // If you are debugging TLS issues on Railway, you can set ALLOW_INSECURE_TLS=true in env temporarily.
      tls: process.env.ALLOW_INSECURE_TLS === "true" ? { rejectUnauthorized: false } : undefined,
    };

    const attempts = 3;
    for (let i = 0; i < attempts; i++) {
      try {
        const t = nodemailer.createTransport(conf);
        await t.verify();
        transporter = t;
        usingOAuth2 = false;
        console.log("[MAILER] Verified SMTP transporter (host: %s port: %s secure:%s).", SMTP_HOST, SMTP_PORT, conf.secure);
        return transporter;
      } catch (err) {
        console.warn(`[MAILER] SMTP verify attempt ${i + 1} failed:`, err?.message || err);
        // small backoff
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
    }

    // if we fell through, transporter remains null and we'll throw below
    transporter = null;
  }

  // Fallback to Ethereal in case nothing configured (development only)
  try {
    const testAccount = await nodemailer.createTestAccount();
    const t = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
      greetingTimeout: GREETING_TIMEOUT_MS,
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      socketTimeout: SOCKET_TIMEOUT_MS,
    });
    await t.verify();
    transporter = t;
    usingOAuth2 = false;
    console.log("[MAILER] Using Ethereal test account (development). Preview URLs will appear in logs.");
    return transporter;
  } catch (err) {
    console.error("[MAILER] Failed to create any transporter:", err?.message || err);
    transporter = null;
    throw new Error("no_mail_transporter_available");
  }
};

/**
 * sendMail - robust send:
 * - obtains OAuth2 token per-send if necessary,
 * - performs multiple attempts (SEND_ATTEMPTS) with exponential backoff,
 * - uses per-attempt timeout to avoid long hangs.
 *
 * returns { ok: true, info, previewUrl? } or throws.
 */
export const sendMail = async ({ to, subject, text, html, from }) => {
  // build and verify transporter (throws if none)
  let t;
  try {
    t = await buildAndVerifyTransporter();
  } catch (err) {
    console.error("[MAILER] build/verify transporter error:", err?.message || err);
    throw err;
  }

  // prepare mail options
  const mailOptions = {
    from: from || SMTP_FROM,
    to,
    subject,
    text,
    html,
  };

  let lastError = null;
  for (let attempt = 1; attempt <= Math.max(1, SEND_ATTEMPTS); attempt++) {
    try {
      // If using OAuth2, refresh access token just before sending
      if (usingOAuth2) {
        try {
          const accessToken = await getOAuth2AccessToken();
          // Set access token on transporter auth - driver will use it
          if (t && t.options && t.options.auth) {
            t.options.auth.accessToken = accessToken;
          }
        } catch (e) {
          console.warn("[MAILER] Unable to obtain OAuth2 access token:", e?.message || e);
          throw e;
        }
      }

      // send with a per-attempt timeout race
      const sendPromise = t.sendMail(mailOptions);
      const timeoutMs = DEFAULT_SEND_TIMEOUT_MS * attempt; // give slightly more time on subsequent attempts
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("sendMail_timeout")), timeoutMs));

      const info = await Promise.race([sendPromise, timeoutPromise]);

      // If Ethereal or test account, supply preview url
      let previewUrl = null;
      try {
        previewUrl = nodemailer.getTestMessageUrl(info) || null;
      } catch (e) {
        previewUrl = null;
      }

      if (previewUrl) console.log("[MAILER] Preview URL:", previewUrl);

      return { ok: true, info, previewUrl };
    } catch (err) {
      lastError = err;
      console.warn(`[MAILER] sendMail attempt ${attempt} failed:`, err?.message || err);

      // If auth fail, break immediately (bad creds)
      const m = (err && err.message) ? err.message.toLowerCase() : "";
      if (m.includes("authentication") || m.includes("invalid login") || m.includes("invalid credentials") || m.includes("535")) {
        console.error("[MAILER] Authentication failure detected. Do not retry. Check SMTP_USER/SMTP_PASS or OAuth2 credentials.");
        break;
      }

      // small exponential backoff before retry
      const backoff = 500 * attempt;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  console.error("[MAILER] All send attempts failed. Last error:", lastError?.message || lastError);
  throw lastError || new Error("sendMail_failed");
};
export default sendMail;
