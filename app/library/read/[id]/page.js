import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Reader from "./Reader";

export const dynamic = "force-dynamic";

export default async function ReadPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: item } = await supabase
    .from("library_items")
    .select("id, title, source")
    .eq("id", params.id)
    .maybeSingle();
  if (!item) notFound();

  await supabase
    .from("library_items")
    .update({ read_at: new Date().toISOString() })
    .eq("id", item.id)
    .is("read_at", null);

  return <Reader id={item.id} title={item.title} />;
}
