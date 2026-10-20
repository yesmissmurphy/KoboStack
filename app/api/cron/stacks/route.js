import { createClient } from "@supabase/supabase-js";
import { DEFAULT_PREFS, getEntitlements, makeStackCache, sendStacksForUser } from "@/lib/stacks";

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

  const caches = {};
const cacheFor = (d) => (caches[d] = caches[d] || makeStackCache(d));
// Each person gets stacks dated by their own local calendar day, so a new day starts at their midnight.
const localDate = (tz) => {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Europe/London" }).format(new Date());
  } catch (e) {
    return new Date().toISOString().split("T")[0];
  }
};

  const { data: allPrefs, error } = await supabase.from("stack_prefs").select("*");
  if (error) {
    console.error("Could not load stack_prefs:", error);
    return Response.json({ error: "Could not load preferences" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of allPrefs || []) {
    const dateStr = localDate(row.timezone);
  const getStack = cacheFor(dateStr);
  const every = Math.max(1, Number(row.frequency) || 1);
    const gap = row.last_sent ? Math.round((Date.parse(dateStr) - Date.parse(row.last_sent)) / 86400000) : 999;
    if (row.last_sent === dateStr || gap < every) {
      skipped++;
      continue;
    }
    const prefs = { ...DEFAULT_PREFS, ...row };

    const { data: connection } = await supabase
      .from("dropbox_connections")
      .select("user_id, access_token, refresh_token, access_token_expires_at, sync_folder")
      .eq("user_id", row.user_id)
      .maybeSingle();
    if (!connection && !row.email_delivery) {
      skipped++;
      continue;
    }
    let email = null;
    if (row.email_delivery) {
      const { data: ud } = await supabase.auth.admin.getUserById(row.user_id);
      email = ud?.user?.email || null;
    }

    try {
      const entitlements = await getEntitlements(supabase, row.user_id);
      const n = await sendStacksForUser({ supabase, connection, email, prefs, dateStr, getStack, entitlements });
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

  return Response.json({ ok: true, sent, skipped, errors, at: new Date().toISOString() });
}
