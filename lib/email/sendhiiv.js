import "server-only";

const API_BASE = "https://api.sendhiiv.com/api/v1";

export async function sendhiivMessage({ from, to, subject, text, html, replyTo }) {
  const apiKey = String(process.env.SENDHIIV_API_KEY || "").trim();
  if (!apiKey) throw new Error("Sendhiiv is not configured: set SENDHIIV_API_KEY.");
  const response = await fetch(`${API_BASE}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text, html, reply_to: replyTo }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Sendhiiv rejected the message (HTTP ${response.status}): ${detail}`);
  }
  return response.json();
}
