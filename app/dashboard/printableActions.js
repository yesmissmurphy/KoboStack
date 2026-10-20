"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { buildPrintable } from "@/lib/printables/generators";
import { getValidAccessToken, uploadToDropbox, STACKT_FOLDER } from "@/lib/dropbox";
import { sendEpubEmail } from "@/lib/mail";

export async function sendPrintable(key, dest, fresh) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const today = new Date().toISOString().split("T")[0];
  const out = buildPrintable(key, fresh ? `${today}:${fresh}` : today);
  if (!out) return { error: "Unknown printable." };

  if (dest === "email") {
    const sent = await sendEpubEmail({
      to: user.email,
      subject: `Your Stackt printable: ${out.label}`,
      text: "Your printable is attached. On an iPad, open it in Files, GoodNotes or Notability and write on it with a stylus. If you do print it, thank you for using paper kindly. Stackt",
      attachments: [{ filename: out.filename, content: out.buffer.toString("base64") }],
    });
    return sent.ok ? { ok: "Sent to your inbox." } : { error: sent.error };
  }

  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: connection } = await admin
    .from("dropbox_connections")
    .select("user_id, access_token, refresh_token, access_token_expires_at, sync_folder")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!connection) return { error: "Connect Dropbox first." };
  try {
    const token = await getValidAccessToken(connection, admin);
    await uploadToDropbox(token, STACKT_FOLDER, out.filename, out.buffer, true);
    return { ok: "Sent to your Kobo folder." };
  } catch (err) {
    console.error("sendPrintable failed:", err);
    return { error: "Could not reach Dropbox. Please try again." };
  }
}
