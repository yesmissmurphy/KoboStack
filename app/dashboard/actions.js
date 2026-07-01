"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

function normalizeSubstackUrl(raw) {
  let value = raw.trim();
  if (!value) return null;

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  try {
    const parsed = new URL(value);
    parsed.pathname = "/";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function addSubstack(formData) {
  const rawUrl = formData.get("url");
  const normalized = normalizeSubstackUrl(String(rawUrl || ""));

  if (!normalized) {
    return { error: "That doesn't look like a valid URL." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

 if (!user) {
    return { error: "Your session expired. Please sign in again." };
  }

  const { data: billing } = await supabase
    .from("billing")
    .select("is_pro")
    .eq("user_id", user.id)
    .maybeSingle();

  const isPro = billing?.is_pro || false;

  if (!isPro) {
    const { count } = await supabase
      .from("substacks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count || 0) >= 3) {
      return {
        error: "Free plan is limited to 3 Substacks. Upgrade to add more.",
        limitReached: true,
      };
    }
  }

  const hostname = new URL(normalized).hostname.replace(/^www\./, "");

 const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("substacks").insert({
    user_id: user.id,
    url: normalized,
    name: hostname,
    last_checked_at: sevenDaysAgo,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That feed is already on your shelf." };
    }
    return { error: "Couldn't save that — please try again." };
  }

  revalidatePath("/dashboard");
  return { error: null };
}

export async function removeSubstack(formData) {
  const id = formData.get("id");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !id) return;

  await supabase.from("substacks").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard");
}function normalizeFolderPath(raw) {
  let value = raw.trim();
if (!value) return "/Apps/Rakuten Kobo/Substack";
  if (!value.startsWith("/")) value = `/${value}`;
  value = value.replace(/\/+$/, "");
  return value || "/";
}

export async function updateSyncFolder(formData) {
  const folder = normalizeFolderPath(String(formData.get("folder") || ""));

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Your session expired. Please sign in again." };

  const { error } = await supabase
    .from("dropbox_connections")
    .update({ sync_folder: folder })
    .eq("user_id", user.id);

  if (error) return { error: "Couldn't save that folder — please try again." };

  revalidatePath("/dashboard");
  return { error: null };
}
export async function disconnectDropbox() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("dropbox_connections").delete().eq("user_id", user.id);
  revalidatePath("/dashboard");
}
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}
