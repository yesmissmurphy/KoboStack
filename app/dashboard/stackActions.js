"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { DEFAULT_PREFS, STACKS, getEntitlements, makeStackCache, sendStacksForUser } from "@/lib/stacks";
import { allowedKeys } from "@/lib/stacks/catalog";

const DIFFICULTIES = ["ramp", "easy", "medium", "hard"];

export async function saveStackPrefs(prevState, formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const row = { user_id: user.id, updated_at: new Date().toISOString() };
  for (const s of STACKS) row[s.key] = formData.get(s.key) === "on";
  const diff = formData.get("sudoku_difficulty");
  row.sudoku_difficulty = DIFFICULTIES.includes(diff) ? diff : "ramp";
  row.digest = formData.get("digest") === "on";
  row.email_delivery = formData.get("email_delivery") === "on";
  const freq = Number(formData.get("frequency"));
  row.frequency = [1, 2, 3, 7].includes(freq) ? freq : 1;
  const tz = formData.get("timezone");
  if (typeof tz === "string" && tz) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      row.timezone = tz;
    } catch (e) {
      // ignore an unknown time zone and keep the previous one
    }
  }

  const chosen = STACKS.filter((s) => row[s.key]).map((s) => s.key);
  const ent = await getEntitlements(supabase, user.id);
  if (allowedKeys(chosen, ent).length < chosen.length) {
    return { error: "That is more than your plan includes. Please unlock them first." };
  }

  const { error } = await supabase.from("stack_prefs").upsert(row, { onConflict: "user_id" });
  if (error) return { error: "Could not save. Please try again." };

  revalidatePath("/dashboard");
  return { ok: "Saved." };
}

export async function sendStacksNow() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: row } = await admin
    .from("stack_prefs")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return { error: "Save your stacks first." };

  const { data: connection } = await admin
    .from("dropbox_connections")
    .select("user_id, access_token, refresh_token, access_token_expires_at, sync_folder")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!connection && !row.email_delivery) return { error: "Connect Dropbox or switch on email delivery first." };

  const dateStr = new Date().toISOString().split("T")[0];
  try {
    const n = await sendStacksForUser({
      supabase: admin,
      connection,
      email: user.email,
      prefs: { ...DEFAULT_PREFS, ...row },
      dateStr,
      getStack: makeStackCache(dateStr),
      entitlements: await getEntitlements(admin, user.id),
    });
    return n > 0
      ? { ok: `Sent ${n} file${n === 1 ? "" : "s"} to ${connection && row.email_delivery ? "your Dropbox and inbox" : connection ? "your Dropbox" : "your inbox"}.` }
      : { error: "Nothing to send. Turn on at least one stack." };
  } catch (err) {
    console.error("sendStacksNow failed:", err);
    return { error: String(err?.message || "").startsWith("Email: ") ? err.message.replace("Email: ", "") : "Something went wrong sending. Please try again." };
  }
}
