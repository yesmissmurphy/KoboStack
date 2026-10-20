import { STACKT_FOLDER } from "@/lib/dropbox";
import { ImageResponse } from "next/og";
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
  newsStack,
  journalStack,
  mushroomStack,
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
  word: false,
  wikipedia: false,
  onthisday: false,
  poem: false,
  stoic: false,
  fact: false,
  news: false,
  journal: false,
  mushroom: false,
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
    case "news": return newsStack(dateStr);
    case "journal": return journalStack(dateStr);
    case "mushroom": return mushroomStack(dateStr);
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
  const folder = STACKT_FOLDER;

  const built = [];
  for (const s of enabled) {
    const result = await getStack(s.key, prefs);
    if (result) built.push({ ...result, stack: s });
  }
  if (!built.length) return 0;

  let uploaded = 0;
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
      await uploadToDropbox(accessToken, folder, `${sanitize(b.title.replace(": ", " - ")).slice(0, 60)} - ${longDate(dateStr)}.epub`, epub, true);
      uploaded++;
    }
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
