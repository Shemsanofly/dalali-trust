import "server-only";
import { env } from "./env";

export type EmailMessage = { to: string; subject: string; text: string };

/**
 * Sends a transactional email. Providers:
 * - "resend": HTTPS API (requires RESEND_API_KEY and EMAIL_FROM)
 * - "console": development only — prints the message to the server log
 * - "none": email disabled; callers must not claim that a message was sent
 *
 * Returns true only if the message was actually handed to a provider.
 */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const e = env();
  if (e.EMAIL_PROVIDER === "console") {
    console.info(`[email:console] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    return true;
  }
  if (e.EMAIL_PROVIDER === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: e.EMAIL_FROM, to: [msg.to], subject: msg.subject, text: msg.text }),
    });
    if (!res.ok) {
      console.error(`[email] provider rejected message (status ${res.status})`);
      return false;
    }
    return true;
  }
  return false;
}

export function emailEnabled(): boolean {
  return env().EMAIL_PROVIDER !== "none";
}
