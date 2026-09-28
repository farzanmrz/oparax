import "server-only";

import nodemailer from "nodemailer";
import { z } from "zod";

const header = z.string().transform((value) => value.replace(/[\r\n]/g, ""));
const mailSchema = z.object({
  to: header.pipe(z.email()),
  replyTo: header.pipe(z.email()).optional(),
  subject: header,
  text: z.string(),
});
export const MAIL_UNCERTAIN = "mail outcome unknown; check before resending";

export function mailConfigured(): boolean {
  return !!process.env.SMTP_USER && !!process.env.SMTP_PASSWORD;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<{ ok: true } | { ok: false; error: string; configured: boolean }> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!user || !pass) return { ok: false, error: "mail not configured", configured: false };
  const mail = mailSchema.safeParse(input);
  const sender = header.pipe(z.email()).safeParse(user);
  if (!mail.success || !sender.success) {
    return { ok: false, error: "invalid mail headers", configured: true };
  }
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    dnsTimeout: 10_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    const result = await transport.sendMail({ from: sender.data, ...mail.data });
    return result.accepted.length > 0
      ? { ok: true }
      : { ok: false, error: "mail not accepted", configured: true };
  } catch (error) {
    const rejection = z.object({ responseCode: z.number().min(400).max(599) }).safeParse(error);
    return {
      ok: false,
      error: rejection.success ? `mail rejected (${rejection.data.responseCode})` : MAIL_UNCERTAIN,
      configured: true,
    };
  } finally {
    transport.close();
  }
}
