import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey() {
  const encoded = process.env.SMTP_ENCRYPTION_KEY;
  if (!encoded) throw new Error("SMTP encryption is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("SMTP encryption key must be 32 bytes.");
  return key;
}

export function canEncryptSmtp() {
  try { encryptionKey(); return true; } catch { return false; }
}

export const canEncryptSecrets = canEncryptSmtp;

export function encryptSmtpPassword(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}

export function decryptSmtpPassword(value) {
  if (!value?.ciphertext || !value?.iv || !value?.tag) return "";
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export function encryptSmtpSettings(value) {
  return encryptSmtpPassword(JSON.stringify(value));
}

export function decryptSmtpSettings(value) {
  return JSON.parse(decryptSmtpPassword(value));
}

// The deployment already has one server-only 256-bit encryption key. Reuse the
// same authenticated encryption primitive for other dashboard-managed secrets
// while retaining the SMTP exports for backwards compatibility.
export const encryptSecretSettings = encryptSmtpSettings;
export const decryptSecretSettings = decryptSmtpSettings;
