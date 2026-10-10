import "server-only";
import { getServiceEmailSettings } from "@/lib/data/settings";
import { sendhiivMessage } from "@/lib/email/sendhiiv";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

async function senderSettings() {
  const settings = await getServiceEmailSettings();
  if (!settings.enabled) throw new Error("Email delivery is disabled.");
  if (!settings.fromEmail || !settings.recipientEmail) throw new Error("Email delivery settings are incomplete.");
  return settings;
}

function formatFrom(settings, fallbackName) {
  return `${settings.fromName || fallbackName} <${settings.fromEmail}>`;
}

export async function sendEnquiryNotification(enquiry) {
  const settings = await senderSettings();
  const lines = [
    ["Name", enquiry.name], ["Email", enquiry.email], ["Phone", enquiry.phone], ["Company", enquiry.company],
    ["Project type", enquiry.projectType], ["Budget", enquiry.budget], ["Timeline", enquiry.timeline],
  ].filter(([, value]) => value);
  const text = `${lines.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nMessage:\n${enquiry.message}`;
  const html = `<h2>New portfolio enquiry</h2>${lines.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join("")}<p><strong>Message:</strong></p><p>${escapeHtml(enquiry.message).replace(/\n/g, "<br>")}</p>`;
  return sendhiivMessage({
    from: formatFrom(settings, "Portfolio enquiry"),
    to: settings.recipientEmail,
    replyTo: enquiry.email,
    subject: `New portfolio enquiry from ${enquiry.name}`,
    text,
    html,
  });
}

export async function sendSettingsTestEmail() {
  const settings = await senderSettings();
  return sendhiivMessage({
    from: formatFrom(settings, "Portfolio"),
    to: settings.recipientEmail,
    subject: "CreativeYati email delivery test",
    text: "Your portfolio email delivery settings are working.",
    html: "<p>Your portfolio email delivery settings are working.</p>",
  });
}

export async function sendCourseConfirmation({ email, courseTitle, reference, amount, currency }) {
  const settings = await senderSettings();
  const formatted = new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(Number(amount || 0) / 100);
  const learnUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://aivideocreator.cv"}/learn`;
  return sendhiivMessage({
    from: formatFrom(settings, "CreativeYati"),
    to: email,
    subject: `Course access confirmed: ${courseTitle}`,
    text: `Your payment for ${courseTitle} has been verified.\nOrder: ${reference}\nAmount: ${formatted}\n\nOpen your learning area: ${learnUrl}`,
    html: `<h2>Course access confirmed</h2><p>Your payment for <strong>${escapeHtml(courseTitle)}</strong> has been verified.</p><p>Order: ${escapeHtml(reference)}<br>Amount: ${escapeHtml(formatted)}</p><p><a href="${escapeHtml(learnUrl)}">Open your learning area</a></p>`,
  });
}
