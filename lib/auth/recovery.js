import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
const name = "avc_password_recovery";
function secret() { return process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY; }
function sign(value) { return createHmac("sha256", secret()).update(value).digest("hex"); }
export async function grantPasswordRecovery(userId) {
  if (!secret()) return;
  const payload = Buffer.from(JSON.stringify({ userId, expires: Date.now() + 15 * 60 * 1000 })).toString("base64url");
  (await cookies()).set(name, payload + "." + sign(payload), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 900 });
}
export async function canResetPassword(userId) {
  if (!secret() || !userId) return false;
  const value = (await cookies()).get(name)?.value || "";
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  const expected = Buffer.from(sign(payload)), actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try { const data = JSON.parse(Buffer.from(payload, "base64url").toString()); return data.userId === userId && data.expires > Date.now(); }
  catch { return false; }
}
export async function clearPasswordRecovery() { (await cookies()).delete(name); }
