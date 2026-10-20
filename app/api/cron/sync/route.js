import { STACKT_FOLDER, SUBSTACKS_FOLDER } from "@/lib/dropbox";
import { createClient } from "@supabase/supabase-js";
import { fetchFeed } from "@/lib/rss";
import { createEpub } from "@/lib/epub";
import { getValidAccessToken, uploadToDropbox, deleteOldFiles } from "@/lib/dropbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sanitizeFilename(str) {
  return str
    .replace(/[^a-z0-9 \-_.]/gi, "")
    .trim()
    .slice(0, 80)
    .trim();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const onlyUser = searchParams.get("user");
  const force = searchParams.get("force") === "1";
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let { data: connections } = await supabase
    .from("dropbox_connections")
    .select(
      "user_id, access_token, refresh_token, access_token_expires_at, sync_folder, auto_delete"
    );

  if (onlyUser && connections) connections = connections.filter((c) => c.user_id === onlyUser);
  if (!connections?.length) {
    return Response.json({ message: "No Dropbox connections found" });
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;
const errorDetails = [];

  for (const connection of connections) {
    const { data: substacks } = await supabase
      .from("substacks")
      .select("id, url, name, last_checked_at")
      .eq("user_id", connection.user_id);

    if (!substacks?.length) continue;

    let accessToken;
    try {
      accessToken = await getValidAccessToken(connection, supabase);
    } catch (err) {
      console.error(`Token refresh failed for user ${connection.user_id}:`, err);
errorDetails.push(`token: ${String(err?.message || err).slice(0, 200)}`);
errors++;
      continue;
    }

    for (const substack of substacks) {
      let items;
      try {
        items = await fetchFeed(substack.url);
      } catch (err) {
        console.error(`Feed fetch failed for ${substack.url}:`, err);
errorDetails.push(`feed ${substack.url}: ${String(err?.message || err).slice(0, 200)}`);
errors++;
        continue;
      }

   const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
const lastChecked = force ? new Date(0) : new Date(Math.max(substack.last_checked_at ? new Date(substack.last_checked_at).getTime() : 0, weekAgo));

      const newItems = items.filter((item) => item.pubDate > lastChecked).sort((a, b) => b.pubDate - a.pubDate).slice(0, 3);

      if (!newItems.length) {
skipped++;
await supabase.from("substacks").update({ last_checked_at: new Date().toISOString() }).eq("id", substack.id);
continue;
}

      for (const item of newItems) {
        try {
          const epub = await createEpub({
            title: item.title,
            author: item.author || item.feedTitle,
            content: item.content,
            date: item.pubDate.toISOString().split("T")[0],
          });

         const dateStr = item.pubDate.toISOString().split("T")[0];
const filename = `${sanitizeFilename(item.author)} - ${sanitizeFilename(item.title)} - ${dateStr}.epub`;
const folder = SUBSTACKS_FOLDER;
          
          await uploadToDropbox(accessToken, folder, filename, epub, force);
          processed++;
        } catch (err) {
          console.error(`Failed to process "${item.title}":`, err);
errorDetails.push(`item ${String(item.title).slice(0, 60)}: ${String(err?.message || err).slice(0, 200)}`);
errors++;
        }
      }

      await supabase
        .from("substacks")
        .update({ last_checked_at: new Date().toISOString() })
        .eq("id", substack.id);
    }
  }

  // Optional tidy-up: remove Stackt EPUBs older than 30 days for people who ticked the box.
let cleaned = 0;
for (const connection of connections) {
  if (!connection.auto_delete) continue;
  try {
    const token = await getValidAccessToken(connection, supabase);
    cleaned += await deleteOldFiles(token, STACKT_FOLDER, 30);
      cleaned += await deleteOldFiles(token, SUBSTACKS_FOLDER, 30);
  } catch (err) {
    console.error(`Cleanup failed for user ${connection.user_id}:`, err);
    errorDetails.push(`cleanup: ${String(err?.message || err).slice(0, 200)}`);
    errors++;
  }
}

return Response.json({ ok: true,
    processed,
    skipped,
    errors,
errorDetails, cleaned, timestamp: new Date().toISOString(),
  });
}
