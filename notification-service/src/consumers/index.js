import { consume } from "../config/rabbitmq.js";
import {
  sendWelcomeEmail,
  sendInvoiceSentEmail,
  sendPaymentReceivedEmail,
  sendOverdueReminderEmail,
  sendPasswordResetEmail,
} from "../utils/email.utils.js";

// ── Register all consumers ────────────────────────────────────────────────────
// Each consumer subscribes to one routing key on the invoicehive exchange
// If processing fails, the message goes to the dead-letter queue (not lost)

export const registerConsumers = async () => {

  // ── user.registered → welcome email ──────────────────
  await consume("user.registered", async (data) => {
    const { email, name } = data;
    if (!email || !name) throw new Error("Missing email or name in user.registered event");
    await sendWelcomeEmail({ email, name });
  });

  // ── user.password_reset → reset email ────────────────
  await consume("user.password_reset", async (data) => {
    const { email, name, resetToken } = data;
    if (!email || !resetToken) throw new Error("Missing email or resetToken");
    await sendPasswordResetEmail({ email, name, resetToken });
  });

  // ── invoice.sent → email client with PDF + Pay Now ───
  await consume("invoice.sent", async (data) => {
    // Validate required fields
    if (!data.clientEmail) throw new Error("Missing clientEmail in invoice.sent event");
    if (!data.invoiceNumber) throw new Error("Missing invoiceNumber");
    await sendInvoiceSentEmail(data);
  });

  // ── invoice.paid → notify freelancer of payment ──────
  await consume("invoice.paid", async (data) => {
    // The invoice.paid event from Payment Service doesn't always
    // include the freelancer's email — we'd normally fetch it from
    // Auth Service here. For now we expect it in the event payload
    // (Invoice Service should enrich events with this data).
    await sendPaymentReceivedEmail(data);
  });

  // ── invoice.overdue → send reminder to client ────────
  await consume("invoice.overdue", async (data) => {
    if (!data.clientEmail) {
      console.warn("⚠️  invoice.overdue event missing clientEmail — skipping");
      return; // Don't throw — just skip this one
    }
    await sendOverdueReminderEmail(data);
  });

  // ── invoice.cancelled → optional notification ─────────
  await consume("invoice.cancelled", async (data) => {
    console.log(`📋 Invoice cancelled: ${data.invoiceId} — no email needed`);
    // Could notify client here if needed — left as extension point
  });

  console.log("✅ All notification consumers registered");
};