import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync("app/student-actions.js", "utf8");
const update = source.slice(source.indexOf("export async function updateStudentPassword"), source.indexOf("export async function updateStudentProfile")).replace("export async", "async");
const confirm = source.slice(source.indexOf("export async function confirmPasswordRecovery"), source.indexOf("export async function updateStudentPassword")).replace("export async", "async");
async function scenario({ mfa = false, code = "123456", error = null, mfaError = null, recovery = true, factorId = "factor-1" } = {}) {
  let updates = 0, challenges = 0, cleared = 0, signedOut = 0;
  const client = { auth: {
    mfa: {
      getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal1", nextLevel: mfa ? "aal2" : "aal1" } }),
      listFactors: async () => ({ data: { totp: [{ id: "factor-1", status: "verified" }] } }),
      challengeAndVerify: async () => { challenges++; return { error: mfaError }; },
    },
    updateUser: async () => { updates++; return { error }; },
    signOut: async () => { signedOut++; return {}; },
  } };
  const redirect = url => { throw new Error(url); };
  const action = new Function("createSupabaseAuthClient", "getStudentUser", "canResetPassword", "clearPasswordRecovery", "safeNext", "redirect", "console", update + ";return updateStudentPassword;")(
    async () => client, async () => ({ id: "user-1" }), async () => recovery, async () => { cleared++; }, () => "/learn", redirect, { error() {} });
  const form = new FormData();
  for (const [key, value] of Object.entries({ password: "new-password-123456!", confirmPassword: "new-password-123456!", authenticatorCode: code, factorId })) form.set(key, value);
  let destination;
  try { await action(form); } catch (error) { destination = new URL(error.message, "https://example.com"); }
  return { updates, challenges, cleared, signedOut, destination };
}
for (const mfa of [false, true]) {
  const result = await scenario({ mfa });
  assert.equal(result.destination.pathname, "/reset-password/success");
  assert.equal(result.updates, 1); assert.equal(result.challenges, mfa ? 1 : 0);
  assert.equal(result.cleared, 1); assert.equal(result.signedOut, 1);
}
for (const options of [{ code: "" }, { factorId: "not-owned" }, { mfaError: { code: "mfa_verification_failed" } }]) {
  const result = await scenario({ mfa: true, ...options });
  assert.equal(result.updates, 0); assert.equal(result.cleared, 0);
  assert.equal(result.destination.pathname, "/reset-password/update");
}
const denied = await scenario({ recovery: false });
assert.equal(denied.updates, 0); assert.equal(denied.destination.pathname, "/reset-password");
for (const [code, text] of [["same_password", "different"], ["weak_password", "stronger"], ["insufficient_aal", "authenticator"], ["session_expired", "expired"]]) {
  const result = await scenario({ error: { code } });
  assert.ok(result.destination.searchParams.get("error").includes(text));
  assert.equal(result.cleared, 0); assert.equal(result.signedOut, 0);
}
for (const valid of [true, false]) {
  let grants = 0;
  const action = new Function("createSupabaseAuthClient", "safeNext", "grantPasswordRecovery", "redirect", "console", confirm + ";return confirmPasswordRecovery;")(
    async () => ({ auth: { verifyOtp: async args => { assert.equal(args.type, "recovery"); return valid ? { data: { user: { id: "u" } } } : { error: { code: "otp_expired" } }; } } }),
    () => "/learn", async () => { grants++; }, url => { throw new Error(url); }, { error() {} });
  const form = new FormData(); form.set("token_hash", "test-token");
  await assert.rejects(action(form), error => error.message.startsWith(valid ? "/reset-password/update?" : "/reset-password?error="));
  assert.equal(grants, valid ? 1 : 0);
}
console.log("PASS password recovery verification, MFA enforcement, validation errors and session cleanup");
