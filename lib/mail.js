// Sends EPUBs by email using Resend (https://resend.com). Needs RESEND_API_KEY in the environment.
// MAIL_FROM is optional, e.g. Stackt <hello@kostackt.com>. The sending domain must be verified in Resend.
export async function sendEpubEmail({ to, subject, text, attachments }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "Email delivery is not set up yet." };
  const from = process.env.MAIL_FROM || "Stackt <hello@kostackt.com>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text, attachments }),
    });
    if (!res.ok) {
      console.error("Resend failed", res.status, await res.text());
      return { ok: false, error: "Email delivery failed." };
    }
    return { ok: true };
  } catch (err) {
    console.error("Resend error", err);
    return { ok: false, error: "Email delivery failed." };
  }
}
