import { createClient } from "@/utils/supabase/server";
import { removeSubstack, signOut, disconnectDropbox } from "./actions";
import AddForm from "./AddForm";
import FolderForm from "./FolderForm";
import UpgradeButton from "./UpgradeButton";
import StacksCard from "./StacksCard";
import GetSubstacksButton from "./GetSubstacksButton";
import PrintablesCard from "./PrintablesCard";
import ThemePicker from "@/app/ThemePicker";
import { PRINTABLES, PRINTABLE_GROUPS } from "@/lib/printables/generators";
import { STACKS, DEFAULT_PREFS } from "@/lib/stacks";

export const maxDuration = 60;

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
    .select("account_id, sync_folder, auto_delete")
    .maybeSingle();

  const { data: billing } = await supabase
    .from("billing")
    .select("is_pro, puzzles_unlocked")
    .maybeSingle();

  const { data: stackPrefsRow } = await supabase
    .from("stack_prefs")
    .select("*")
    .maybeSingle();
  const stackPrefs = { ...DEFAULT_PREFS, ...(stackPrefsRow || {}) };

  const isPro = billing?.is_pro || false;
  const entitlements = { pro: !!billing?.is_pro, puzzles: !!billing?.puzzles_unlocked };
  const substackCount = substacks?.length || 0;

  const dropboxAuthUrl =
    `https://www.dropbox.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DROPBOX_APP_KEY}` +
    `&response_type=code&token_access_type=offline` +
    `&redirect_uri=${encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL}/api/dropbox/callback`)}`;

  const twoCol = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, alignItems: "start" };

  return (
    <main className="shell" style={{ maxWidth: 1180 }}>
      <div className="top-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}><span className="mark">STACKT</span><a href="/library" style={{ color: "var(--paper)", textDecoration: "underline" }}>Library</a><ThemePicker /></div>
        <form action={signOut}>
          <button className="btn btn-ghost" type="submit" style={{ background: "transparent", color: "var(--paper)", borderColor: "var(--line)" }}>
            Sign out
          </button>
        </form>
      </div>

      <div className="eyebrow">Signed in as {user?.email}</div>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Your Stackt</h1>
        <span style={{ background: isPro ? "var(--brass)" : "transparent", color: isPro ? "#17302a" : "var(--paper)", border: "1px solid var(--brass)", borderRadius: 999, padding: "4px 14px", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }}>{isPro ? "Plan: Unlimited" : "Plan: Free"}</span>
      </div>

      <div style={{ background: "#f7f0e1", color: "#17302a", border: "1px dashed #c4ad82", borderRadius: 14, padding: "20px 24px", margin: "8px 0 28px", maxWidth: 760 }}>
        <div className="field-label" style={{ marginBottom: 8 }}>About Stackt</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          Stackt was made because I wanted a slower, more analogue morning without giving up my screen. Some days you don't fancy a whole book, so there are small things instead: a poem, a recipe, a puzzle, a mushroom. If there is a stack you would like that is not here yet, tell me at <a href="mailto:hello@kostackt.com">hello@kostackt.com</a>.
        </p>
      </div>

      <div style={{ ...twoCol, marginBottom: 24 }}>
        <div className="card" style={{ display: isPro ? "none" : "block" }}>
          <div className="field-label" style={{ marginBottom: 12 }}>Plan</div>
          {isPro ? (
            <p style={{ margin: 0 }}>✓ Unlimited. Thank you for keeping Stackt going!</p>
          ) : (
            <div>
              <p style={{ marginTop: 0 }}>You are on the free plan: {substackCount} of 3 Substacks used, plus one stack to try.</p>
              <p style={{ marginTop: 0 }}>Want more? <strong>Unlimited is £12 a year</strong> (under £1 a month) for as many Substacks and stacks as you like. Stackt is made by one person, so it genuinely helps.</p>
              <UpgradeButton />
            </div>
          )}
        </div>

        <div className="card">
          <div className="field-label" style={{ marginBottom: 12 }}>Dropbox</div>
          {dropboxConnection ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <p style={{ margin: 0 }}>✓ Connected</p>
                <form action={disconnectDropbox}>
                  <button className="btn btn-ghost" type="submit">Disconnect</button>
                </form>
              </div>
              <FolderForm
                currentFolder={"/Apps/Rakuten Kobo/Stackt"}
                autoDelete={!!dropboxConnection.auto_delete}
              />
            </div>
          ) : (
            <div>
              <p style={{ marginTop: 0 }}>Not connected yet. Connect Dropbox and your reading will turn up on your Kobo.</p>
              <a className="btn" href={dropboxAuthUrl}>Connect Dropbox</a>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
        <div className="card" style={{ background: "#fbf6ea" }}>
          <div className="field-label" style={{ marginBottom: 12 }}>Substacks</div>
          <h2 style={{ marginBottom: 6 }}>Your little shelf of reading</h2>
          <p style={{ marginTop: 0 }}>
            Add the writers you love. Their new posts get turned into books and sent to your Kobo each day.
          </p>

          <AddForm />

          {substacks && substacks.length > 0 ? (
            <ul className="catalog-list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12, padding: 0, listStyle: "none" }}>
              {substacks.map((entry) => (
                <li className="catalog-entry" key={entry.id}>
                  <div>
                    <div className="catalog-tag">ADDED {new Date(entry.created_at).toLocaleDateString()}</div>
                    <div className="catalog-url">{entry.name}</div>
                  </div>
                  <form action={removeSubstack}>
                    <input type="hidden" name="id" value={entry.id} />
                    <button className="btn btn-ghost" type="submit">Remove</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">Nothing on your shelf yet. Paste a Substack link above to get started.</div>
          )}

          <GetSubstacksButton />
        </div>

        <StacksCard stacks={STACKS} prefs={stackPrefs} ent={entitlements} />
        <PrintablesCard items={PRINTABLES.map(({ build, ...rest }) => rest)} groups={PRINTABLE_GROUPS} />
      </div>

      <p style={{ marginTop: 32, fontSize: 13 }}><a href="/privacy">Privacy policy</a></p>
    </main>
  );
}
