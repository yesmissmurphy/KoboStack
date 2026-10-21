import { createClient } from "@/utils/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { LIBRARY_BUCKET } from "@/lib/library";

export const dynamic = "force-dynamic";

// Streams one of the signed-in user's saved books. Add &download=1 to save it as a file.
export async function GET(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Please sign in first.", { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";

  // Row level security means this only finds the person's own books.
  const { data: item } = await supabase
    .from("library_items")
    .select("path, filename")
    .eq("id", id)
    .maybeSingle();
  if (!item) return new Response("Not found.", { status: 404 });

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data, error } = await admin.storage.from(LIBRARY_BUCKET).download(item.path);
  if (error || !data) return new Response("That file is no longer available.", { status: 404 });

  const headers = {
    "Content-Type": "application/epub+zip",
    "Cache-Control": "private, max-age=31536000, immutable",
  };
  if (searchParams.get("download")) {
    headers["Content-Disposition"] = 'attachment; filename="' + item.filename.replace(/"/g, "") + '"';
  }
  return new Response(await data.arrayBuffer(), { headers });
}
