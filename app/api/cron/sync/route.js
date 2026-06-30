import { createClient } from "@supabase/supabase-js";
import { fetchFeed } from "@/lib/rss";
import { createEpub } from "@/lib/epub";
import { getValidAccessToken, uploadToDropbox } from "@/lib/dropbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sanitizeFilename(str) {
  return str
    .replace(/[^a-z0-9 \-_.]/gi, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80)
    .replace(/_+$/, "");
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: connections } = await supabase
    .from("dropbox_connections")
    .select(
      "user_id, access_token, refresh_token, access_token_expires_at, sync_folder"
    );

  if (!connections?.length) {
    return Response.json({ message: "No Dropbox connections found" });
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;

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
      errors++;
      continue;
    }

    for (const substack of substacks) {
      let items;
      try {
        items = await fetchFeed(substack.url);
      } catch (err) {
        console.error(`Feed fetch failed for ${substack.url}:`, err);
        errors++;
        continue;
      }

   const lastChecked = substack.last_checked_at
  ? new Date(substack.last_checked_at)
  : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const newItems = items.filter((item) => item.pubDate > lastChecked);

      if (!newItems.length) {
        skipped++;
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
const folder = connection.sync_folder || "/Apps/Rakuten Kobo/Substack";
          
          await uploadToDropbox(accessToken, folder, filename, epub);
          processed++;
        } catch (err) {
          console.error(`Failed to process "${item.title}":`, err);
          errors++;
        }
      }

      await supabase
        .from("substacks")
        .update({ last_checked_at: new Date().toISOString() })
        .eq("id", substack.id);
    }
  }

  return Response.json({
    ok: true,
    processed,
    skipped,
    errors,
    timestamp: new Date().toISOString(),
  });
}
