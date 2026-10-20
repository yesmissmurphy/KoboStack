import { createEpub } from "@/lib/epub";
import { getValidAccessToken, uploadToDropbox } from "@/lib/dropbox";
import { sudokuStack } from "./sudoku";
import { STACKS, allowedKeys } from "./catalog";
import {
  esc,
  wordStack,
  wikipediaStack,
  onThisDayStack,
  poemStack,
  stoicStack,
  factStack,
} from "./sources";

export { STACKS };

export const DEFAULT_PREFS = {
  sudoku: false,
  sudoku_difficulty: "ramp",
  word: false,
  wikipedia: false,
  onthisday: false,
  poem: false,
  stoic: false,
  fact: false,
  digest: true,
};

function sanitize(str) {
  return str.replace(/[^a-z0-9 \-_.]/gi, "").replace(/\s+/g, " ").trim().slice(0, 80).trim();
}

async function build(key, prefs, dateStr) {
  switch (key) {
    case "sudoku": return sudokuStack(prefs.sudoku_difficulty, dateStr);
    case "word": return wordStack(dateStr);
    case "wikipedia": return wikipediaStack(dateStr);
    case "onthisday": return onThisDayStack(dateStr);
    case "poem": return poemStack(dateStr);
    case "stoic": return stoicStack(dateStr);
    case "fact": return factStack(dateStr);
    default: throw new Error(`Unknown stack ${key}`);
  }
}

export async function getEntitlements(supabase, userId) {
  const { data } = await supabase
    .from("billing")
    .select("is_pro, puzzles_unlocked")
    .eq("user_id", userId)
    .maybeSingle();
  return { pro: !!data?.is_pro, puzzles: !!data?.puzzles_unlocked };
}

// Builds today's stacks once per run and shares the result across users.
export function makeStackCache(dateStr) {
  const cache = new Map();
  return (key, prefs) => {
    const k = key === "sudoku" ? `sudoku:${prefs.sudoku_difficulty}` : key;
    if (!cache.has(k)) {
      cache.set(k, build(key, prefs, dateStr).catch((err) => {
        console.error(`Stack ${key} failed:`, err);
        return null;
      }));
    }
    return cache.get(k);
  };
}

function section(title, html) {
  return `<h2>${esc(title)}</h2>\n${html}`;
}

// Returns number of files uploaded for this user.
export async function sendStacksForUser({ supabase, connection, prefs, dateStr, getStack, entitlements }) {
  const wanted = STACKS.filter((s) => prefs[s.key]).map((s) => s.key);
  const allowed = allowedKeys(wanted, entitlements || {});
  const enabled = STACKS.filter((s) => allowed.includes(s.key));
  if (!enabled.length) return 0;

  let accessToken;
  accessToken = await getValidAccessToken(connection, supabase);
  const folder = connection.sync_folder || "/Apps/Rakuten Kobo/Substack";

  const built = [];
  for (const s of enabled) {
    const result = await getStack(s.key, prefs);
    if (result) built.push(result);
  }
  if (!built.length) return 0;

  let uploaded = 0;
  if (prefs.digest !== false && built.length > 1) {
    const content = built
      .map((b, i) => (i ? '<div style="page-break-before:always;"></div>' : "") + section(b.title, b.html))
      .join("\n");
    const epub = await createEpub({
      title: `Stackt Daily - ${dateStr}`,
      author: "Stackt",
      content,
      date: dateStr,
    });
    await uploadToDropbox(accessToken, folder, `Stackt - Daily - ${dateStr}.epub`, epub);
    uploaded = 1;
  } else {
    for (const b of built) {
      const epub = await createEpub({
        title: b.title,
        author: "Stackt",
        content: b.html,
        date: dateStr,
      });
      await uploadToDropbox(accessToken, folder, `Stackt - ${sanitize(b.title)} - ${dateStr}.epub`, epub);
      uploaded++;
    }
  }
  return uploaded;
}
