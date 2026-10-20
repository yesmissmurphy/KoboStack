import { createClient } from "@supabase/supabase-js";
import { DEFAULT_PREFS, makeStackCache, sendStacksForUser } from "@/lib/stacks";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const dateStr = new Date().toISOString().split("T")[0];
  const getStack = makeStackCache(dateStr);

  const { data: allPrefs, error } = await supabase.from("stack_prefs").select("*");
  if (error) {
    console.error("Could not load stack_prefs:", error);
    return Response.json({ error: "Could not load preferences" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of allPrefs || []) {
    if (row.last_sent === dateStr) {
      skipped++;
      continue;
    }
    const prefs = { ...DEFAULT_PREFS, ...row };

    const { data: connection } = await supabase
      .from("dropbox_connections")
      .select("user_id, access_token, refresh_token, access_token_expires_at, sync_folder")
      .eq("user_id", row.user_id)
      .maybeSingle();
    if (!connection) {
      skipped++;
      continue;
    }

    try {
      const n = await sendStacksForUser({ supabase, connection, prefs, dateStr, getStack });
      if (n > 0) {
        sent += n;
        await supabase.from("stack_prefs").update({ last_sent: dateStr }).eq("user_id", row.user_id);
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`Stacks failed for user ${row.user_id}:`, err);
      errors++;
    }
  }

  return Response.json({ ok: true, sent, skipped, errors, date: dateStr });
}
