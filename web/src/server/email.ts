import "server-only";
import nodemailer from "nodemailer";
import { query } from "@/server/db";

function smtpTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;
  if (!host || !user || !pass || !from) throw new Error("SMTP is not configured. Feedback was not sent.");
  return { from, transport: nodemailer.createTransport({
    host, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass }
  }) };
}

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM);
}

export async function deliverOutbox(id: string): Promise<void> {
  const rows = await query<{id:string;recipient:string;subject:string;text_body:string;html_body:string|null;status:string}>(
    "SELECT id,recipient,subject,text_body,html_body,status FROM email_outbox WHERE id=$1", [id]);
  const message = rows[0];
  if (!message) throw new Error("Outbox message was not found.");
  if (message.status !== "pending") throw new Error(`Outbox message is not pending (${message.status}).`);
  const { from, transport } = smtpTransport();
  await query("UPDATE email_outbox SET status='sending', attempts=attempts+1 WHERE id=$1 AND status='pending'", [id]);
  try {
    await transport.sendMail({ from, to: message.recipient, subject: message.subject, text: message.text_body, html: message.html_body || undefined });
    await query("UPDATE email_outbox SET status='sent', sent_at=now(), last_error=NULL WHERE id=$1", [id]);
  } catch (error) {
    await query("UPDATE email_outbox SET status='failed', last_error=$2 WHERE id=$1", [id, String(error).slice(0, 2_000)]);
    throw error;
  }
}
