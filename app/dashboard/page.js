import { createClient } from "@/utils/supabase/server";
import { removeSubstack, signOut } from "./actions";
import AddForm from "./AddForm";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: substacks } = await supabase
    .from("substacks")
    .select("id, url, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="shell">
      <div className="top-bar">
        <span className="mark">SHELF</span>
        <form action={signOut}>
          <button className="btn btn-ghost" type="submit" style={{ background: "transparent", color: "var(--paper)", borderColor: "var(--line)" }}>
            Sign out
          </button>
        </form>
      </div>

      <div className="eyebrow">Signed in as {user?.email}</div>
      <h1>Your shelf</h1>
      <p className="lede">
        Add the Substacks you want tracked. New posts will be converted to EPUB and
        sent to your Kobo automatically once Dropbox sync is connected.
      </p>

      <div className="card">
        <AddForm />

        {substacks && substacks.length > 0 ? (
          <ul className="catalog-list">
            {substacks.map((entry) => (
              <li className="catalog-entry" key={entry.id}>
                <div>
                  <div className="catalog-tag">
                    ADDED {new Date(entry.created_at).toLocaleDateString()}
                  </div>
                  <div className="catalog-url">{entry.name}</div>
                </div>
                <form action={removeSubstack}>
                  <input type="hidden" name="id" value={entry.id} />
                  <button className="btn btn-ghost" type="submit">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            Your shelf is empty. Add a Substack URL above to get started.
          </div>
        )}
      </div>
    </main>
  );
}
