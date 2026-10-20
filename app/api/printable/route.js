import { createClient } from "@/utils/supabase/server";
import { buildPrintable } from "@/lib/printables/generators";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Please sign in first.", { status: 401 });

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") || "";
  const fresh = searchParams.get("fresh");
  const today = new Date().toISOString().split("T")[0];
  const seed = fresh ? `${today}:${fresh}` : today;
  const out = buildPrintable(key, seed);
  if (!out) return new Response("Unknown printable.", { status: 404 });

  return new Response(out.buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${out.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
