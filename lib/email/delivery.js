import "server-only";
import nodemailer from "nodemailer";
import { getServiceEmailSettings } from "@/lib/data/settings";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

async function transportAndSettings() {
  const settings = await getServiceEmailSettings();
  if (!settings.enabled) throw new Error("Email delivery is disabled.");
  if (!settings.host || !settings.port || !settings.fromEmail || !settings.recipientEmail) throw new Error("Email delivery settings are incomplete.");
  const auth = settings.username ? { user: settings.username, pass: settings.password || "" } : undefined;
  return {
    settings,
    transport: nodemailer.createTransport({ host: settings.host, port: Number(settings.port), secure: Boolean(settings.secure), auth }),
  };
}

export async function sendEnquiryNotification(enquiry) {
  const { settings, transport } = await transportAndSettings();
  const lines = [
    ["Name", enquiry.name], ["Email", enquiry.email], ["Phone", enquiry.phone], ["Company", enquiry.company],
    ["Project type", enquiry.projectType], ["Budget", enquiry.budget], ["Timeline", enquiry.timeline],
  ].filter(([, value]) => value);
  const text = `${lines.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nMessage:\n${enquiry.message}`;
  const html = `<h2>New portfolio enquiry</h2>${lines.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join("")}<p><strong>Message:</strong></p><p>${escapeHtml(enquiry.message).replace(/\n/g, "<br>")}</p>`;
  return transport.sendMail({
    to: settings.recipientEmail,
    from: { name: settings.fromName || "Portfolio enquiry", address: settings.fromEmail },
    replyTo: enquiry.email,
    subject: `New portfolio enquiry from ${enquiry.name}`,
    text,
    html,
  });
}

export async function sendSettingsTestEmail() {
  const { settings, transport } = await transportAndSettings();
  return transport.sendMail({
    to: settings.recipientEmail,
    from: { name: settings.fromName || "Portfolio", address: settings.fromEmail },
    subject: "CreativeYati email delivery test",
    text: "Your portfolio email delivery settings are working.",
    html: "<p>Your portfolio email delivery settings are working.</p>",
  });
}
