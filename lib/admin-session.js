import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "creativeyati_admin";
const MAX_AGE = 60 * 60 * 24 * 30;

function signingSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function safeEqual(left, right) {
  const first = Buffer.from(String(left));
  const second = Buffer.from(String(right));
  return first.length === second.length && timingSafeEqual(first, second);
}

function signature(payload) {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function hasDirectAdminAuth() {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && signingSecret());
}

export function verifyDirectAdminCredentials(email, password) {
  if (!hasDirectAdminAuth()) return false;
  return safeEqual(String(email).trim().toLowerCase(), process.env.ADMIN_EMAIL.trim().toLowerCase())
    && safeEqual(password, process.env.ADMIN_PASSWORD);
}

export async function createDirectAdminSession(email) {
  const expiresAt = Date.now() + (MAX_AGE * 1000);
  const payload = Buffer.from(JSON.stringify({ email: String(email).trim().toLowerCase(), expiresAt })).toString("base64url");
  const token = `${payload}.${signature(payload)}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE });
}

export async function getDirectAdminSession() {
  if (!hasDirectAdminAuth()) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, receivedSignature] = token.split(".");
  if (!payload || !receivedSignature || !safeEqual(receivedSignature, signature(payload))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (session.expiresAt <= Date.now()) return null;
    if (!safeEqual(session.email, process.env.ADMIN_EMAIL.trim().toLowerCase())) return null;
    return { id: "direct-admin", email: session.email, role: "admin" };
  } catch {
    return null;
  }
}

export async function clearDirectAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
