import { createClient } from "@/utils/supabase/server";
import { removeSubstack, signOut, disconnectDropbox } from "./actions";
import AddForm from "./AddForm";
import FolderForm from "./FolderForm";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: substacks } = await supabase
    .from("substacks")
    .select("id, url, name, created_at")
    .order("created_at", { ascending: false });

  const { data: dropboxConnection } = await supabase
    .from("dropbox_connections")
    .select("account_id, sync_folder")
    .maybeSingle();

  const dropboxAuthUrl =
    `https://www.dropbox.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DROPBOX_APP_KEY}` +
    `&response_type=code&token_access_type=offline` +
    `&redirect_uri=${encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL}/api/dropbox/callback`)}`;

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

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="field-label" style={{ marginBottom: 12 }}>Dropbox</div>
        {dropboxConnection ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <p style={{ margin: 0 }}>✓ Connected</p>
              <form action={disconnectDropbox}>
                <button className="btn btn-ghost" type="submit">Disconnect</button>
              </form>
            </div>
            <FolderForm currentFolder={dropboxConnection.sync_folder || "/Kobo Books"} />
          </div>
        ) : (
          <div>
            <p style={{ marginTop: 0 }}>Not connected yet.</p>
            <a className="btn" href={dropboxAuthUrl}>Connect Dropbox</a>
          </div>
        )}
      </div>

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
