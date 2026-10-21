import { STACKT_FOLDER } from "@/lib/dropbox";
import { ImageResponse } from "next/og";
import { createEpub } from "@/lib/epub";
import { sendEpubEmail } from "@/lib/mail";
import { getValidAccessToken, uploadToDropbox } from "@/lib/dropbox";
import { sudokuStack } from "./sudoku";
import { crosswordStack } from "./crosswordStack";
import { saveToLibrary } from "@/lib/library";
import { STACKS, allowedKeys } from "./catalog";
import {
  esc,
  wordStack,
  wikipediaStack,
  onThisDayStack,
  poemStack,
  stoicStack,
  factStack,
  newsStack,
  journalStack,
  mushroomStack,
  filmStack,
  natureStack,
  walkStack,
  recipeStack,
} from "./sources";

export { STACKS };

// One file per stack by default. Flip to true to allow the old bundled digest.
const BUNDLE_STACKS = false;

function h(type, style, ...children) {
  return { type, props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children } };
}

// A cosy greyscale cover so each stack looks like a little book in the Kobo library.
async function makeCover({ emoji, label, dateStr }) {
  try {
    const pretty = new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    });
    const ink = "#2b2b2b";
    const tree = h("div", { width: "100%", height: "100%", background: "#f4ecd8", padding: 34 },
      h("div", { flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", border: `6px solid ${ink}`, padding: 12 },
        h("div", { flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", border: `2px solid ${ink}`, padding: 24 },
          h("div", { fontSize: 26, letterSpacing: 8, color: "#555" }, "GOOD MORNING"),
          h("div", { fontSize: 150, marginTop: 44 }, emoji),
          h("div", { fontSize: 62, fontWeight: 700, marginTop: 30, color: "#1a1a1a", textAlign: "center", justifyContent: "center" }, label),
          h("div", { width: 170, borderTop: "3px dashed #555", margin: "30px 0" }),
          h("div", { fontSize: 30, color: "#555" }, pretty),
          h("div", { fontSize: 22, letterSpacing: 10, marginTop: 70, color: "#777" }, "STACKT")
        )
      )
    );
    const img = new ImageResponse(tree, { width: 600, height: 900 });
    return Buffer.from(await img.arrayBuffer());
  } catch (err) {
    console.error("Cover failed:", err);
    return null;
  }
}

export const DEFAULT_PREFS = {
  sudoku: false,
  sudoku_difficulty: "ramp",
  crossword: false,
  kidscrossword: false,
  word: false,
  wikipedia: false,
  onthisday: false,
  poem: false,
  stoic: false,
  fact: false,
  news: false,
  journal: false,
  mushroom: false,
  email_delivery: false,
  film: false,
  recipe: false,
  nature: false,
  walk: false,
  digest: true,
};

function sanitize(str) {
  return str.replace(/[^a-z0-9 \-_.]/gi, "").replace(/\s+/g, " ").trim().slice(0, 80).trim();
}

async function build(key, prefs, dateStr) {
  switch (key) {
    case "sudoku": return sudokuStack(prefs.sudoku_difficulty, dateStr);
    case "crossword": return crosswordStack(dateStr, false);
    case "kidscrossword": return crosswordStack(dateStr, true);
    case "word": return wordStack(dateStr);
    case "wikipedia": return wikipediaStack(dateStr);
    case "onthisday": return onThisDayStack(dateStr);
    case "poem": return poemStack(dateStr);
    case "stoic": return stoicStack(dateStr);
    case "fact": return factStack(dateStr);
    case "news": return newsStack(dateStr);
    case "journal": return journalStack(dateStr);
    case "mushroom": return mushroomStack(dateStr);
    case "film": return filmStack(dateStr);
    case "nature": return natureStack(dateStr);
    case "walk": return walkStack(dateStr);
    case "recipe": return recipeStack(dateStr);
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
export async function sendStacksForUser({ supabase, connection, email, prefs, dateStr, getStack, entitlements, force }) {
  const wanted = STACKS.filter((s) => prefs[s.key]).map((s) => s.key);
  const allowed = allowedKeys(wanted, entitlements || {});
  const dueToday = (s) => {
    if (force) return true;
    const dv = (prefs.stack_freq || {})[s.key];
    if (Array.isArray(dv) && dv.length) {
      const wd = new Date(dateStr + "T00:00:00Z").getUTCDay();
      return dv.includes(wd) && (prefs.stack_sent || {})[s.key] !== dateStr;
    }
    const every = Number((prefs.stack_freq || {})[s.key]) || Number(prefs.frequency) || 1;
    const last = (prefs.stack_sent || {})[s.key];
    if (!last) return true;
    const gap = Math.round((Date.parse(dateStr) - Date.parse(last)) / 86400000);
    return gap >= every;
  };
  const enabled = STACKS.filter((s) => allowed.includes(s.key) && dueToday(s));
  if (!enabled.length) return 0;

  let accessToken = null;
  if (connection) accessToken = await getValidAccessToken(connection, supabase);
  const folder = STACKT_FOLDER;

  const built = [];
  for (const s of enabled) {
    const result = await getStack(s.key, prefs);
    if (result) built.push({ ...result, stack: s });
  }
  if (!built.length) return 0;

  let uploaded = 0;
  const attachments = [];
  if (BUNDLE_STACKS && prefs.digest !== false && built.length > 1) {
    const content = built
      .map((b, i) => (i ? '<div style="page-break-before:always;"></div>' : "") + section(b.title, b.html))
      .join("\n");
    const epub = await createEpub({
      title: `Stackt Daily - ${dateStr}`,
      author: "Stackt",
      content,
      date: dateStr,
    });
    await uploadToDropbox(accessToken, folder, `Stackt - Daily - ${dateStr}.epub`, epub, true);
    uploaded = 1;
  } else {
    for (const b of built) {
      const cover = await makeCover({ emoji: b.stack.emoji, label: b.stack.label, dateStr });
const epub = await createEpub({
title: b.title,
author: "Stackt",
content: b.html,
date: dateStr,
variant: "stack",
kicker: `Good morning \u00b7 ${b.stack.label}`,
cover,
});
      const filename = `${sanitize(b.title.replace(": ", " - ")).slice(0, 60)} - ${longDate(dateStr)}.epub`;
      if (accessToken) await uploadToDropbox(accessToken, folder, filename, epub, true);
    await saveToLibrary(supabase, { userId: prefs.user_id, kind: "stack", title: b.title, filename, buffer: epub, dateStr, source: b.stack.key });
      if (prefs.email_delivery && email) attachments.push({ filename, content: Buffer.from(epub).toString("base64") });
      uploaded++;
    }
  }
  if (attachments.length) {
    const sent = await sendEpubEmail({
      to: email,
      subject: `Your Stackt for ${longDate(dateStr)}`,
      text: "Good morning. Your stacks for today are attached. On an iPad or iPhone, tap an attachment, then Share, then Books. Stackt",
      attachments,
    });
    if (!sent.ok && !accessToken) throw new Error("Email: " + sent.error);
  }
  if (prefs.user_id) {
    const sentMap = { ...(prefs.stack_sent || {}) };
    for (const b of built) sentMap[b.stack.key] = dateStr;
    await supabase.from("stack_prefs").update({ stack_sent: sentMap }).eq("user_id", prefs.user_id);
  }
  return uploaded;
}


function longDate(d) {
  const [y, m, day] = d.split("-").map(Number);
  const n = day % 100;
  const suf = n >= 11 && n <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" })[day % 10] || "th";
  const mon = ["January","February","March","April","May","June","July","August","September","October","November","December"][m - 1];
  return `${day}${suf} ${mon} ${y}`;
}
