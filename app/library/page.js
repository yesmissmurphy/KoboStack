import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { STACKS } from "@/lib/stacks/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Library | Stackt" };

const TABS = [
  { key: "all", label: "Everything" },
  { key: "substack", label: "Substacks" },
  { key: "stack", label: "Stacks" },
];

function prettyDate(d) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function LibraryPage({ searchParams }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tab = TABS.some((t) => t.key === searchParams?.tab) ? searchParams.tab : "all";
  let query = supabase
    .from("library_items")
    .select("id, kind, title, source, sent_on, read_at")
    .order("sent_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(150);
  if (tab !== "all") query = query.eq("kind", tab);
  const { data: items } = await query;

  const stackByKey = Object.fromEntries(STACKS.map((s) => [s.key, s]));

  return (
    <main className="shell" style={{ maxWidth: 1180 }}>
      <div className="top-bar">
        <span className="mark">STACKT</span>
        <a href="/dashboard" className="btn btn-ghost" style={{ background: "transparent", color: "var(--paper)", borderColor: "var(--line)" }}>
          Settings
        </a>
      </div>

      <div className="eyebrow">Read here, or on your Kobo</div>
      <h1 style={{ marginTop: 0 }}>Your library</h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "8px 0 24px" }}>
        {TABS.map((t) => (
          <a
            key={t.key}
            href={t.key === "all" ? "/library" : "/library?tab=" + t.key}
            className="btn btn-ghost"
            style={{
              background: tab === t.key ? "var(--brass)" : "transparent",
              color: tab === t.key ? "#17302a" : "var(--paper)",
              borderColor: "var(--brass)",
            }}
          >
            {t.label}
          </a>
        ))}
      </div>

      {items && items.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 16 }}>
          {items.map((it) => {
            const stack = it.kind === "stack" ? stackByKey[it.source] : null;
            const emoji = stack ? stack.emoji : "📖";
            const label = stack ? stack.label : it.source || "Substack";
            return (
              <a
                key={it.id}
                href={"/library/read/" + it.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: "#f4ecd8",
                  color: "#17302a",
                  border: "1px solid #c4ad82",
                  borderRadius: 12,
                  padding: 14,
                  textDecoration: "none",
                  minHeight: 210,
                  position: "relative",
                }}
              >
                {!it.read_at && (
                  <span
                    title="Unread"
                    style={{ position: "absolute", top: 10, right: 10, width: 10, height: 10, borderRadius: 999, background: "#b5562f" }}
                  />
                )}
                <div style={{ fontSize: 38 }}>{emoji}</div>
                <div style={{ fontWeight: 700, lineHeight: 1.3 }}>{it.title}</div>
                <div style={{ marginTop: "auto", fontSize: 13, opacity: 0.75 }}>
                  {label}
                  <br />
                  {prettyDate(it.sent_on)}
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div style={{ background: "#f4ecd8", color: "#17302a", border: "1px dashed #c4ad82", borderRadius: 12, padding: "20px 24px", maxWidth: 640, lineHeight: 1.6 }}>
          Nothing here yet. Your next delivery will turn up on this shelf as well as on your Kobo. Books are kept for 30 days.
        </div>
      )}
    </main>
  );
}
