"use client";

import { useState, useTransition } from "react";
import { saveStackPrefs, sendStacksNow } from "./stackActions";
import UpgradeButton from "./UpgradeButton";
import { allowedKeys, isEntitled } from "@/lib/stacks/catalog";

export default function StacksCard({ stacks, prefs, ent }) {
  const initial = {};
  for (const s of stacks) initial[s.key] = !!prefs[s.key];

  const [selected, setSelected] = useState(initial);
  const [emailDelivery, setEmailDelivery] = useState(!!prefs.email_delivery);
  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
  const [freqs, setFreqs] = useState(() => {
    const o = {};
    for (const s of stacks) {
      const v = (prefs.stack_freq || {})[s.key];
      o[s.key] = Array.isArray(v) && v.length ? v : Number(v) === 7 ? [1] : ALL_DAYS;
    }
    return o;
  });
  const [digest, setDigest] = useState(prefs.digest !== false);
  const [difficulty, setDifficulty] = useState(prefs.sudoku_difficulty || "ramp");
  const [blocked, setBlocked] = useState(null);
  const [message, setMessage] = useState(null);
  const [pending, startTransition] = useTransition();

  const allEntitled = stacks.every((s) => isEntitled(s, ent));
  const tasterUsed = stacks.some((s) => selected[s.key] && !isEntitled(s, ent));

  function toggle(stack) {
    const next = { ...selected, [stack.key]: !selected[stack.key] };
    if (next[stack.key]) {
      const keys = stacks.filter((s) => next[s.key]).map((s) => s.key);
      if (allowedKeys(keys, ent).length < keys.length) {
        setBlocked(stack.kind);
        return;
      }
    }
    setBlocked(null);
    setMessage(null);
    setSelected(next);
  }

  const FREQ_LIST = [["all", "Every day", [0, 1, 2, 3, 4, 5, 6]], ["weekdays", "Weekdays", [1, 2, 3, 4, 5]], ["weekends", "Weekends", [0, 6]], ["mon", "Mondays", [1]], ["tue", "Tuesdays", [2]], ["wed", "Wednesdays", [3]], ["thu", "Thursdays", [4]], ["fri", "Fridays", [5]], ["sat", "Saturdays", [6]], ["sun", "Sundays", [0]]];
  const FREQ_OPTIONS = Object.fromEntries(FREQ_LIST.map((o) => [o[0], o[2]]));
  function freqKey(days) {
    const k = [...(days || ALL_DAYS)].sort().join(",");
    const hit = FREQ_LIST.find((o) => [...o[2]].sort().join(",") === k);
    return hit ? hit[0] : "custom";
  }

  function toggleAll() {
    if (stacks.every((s) => selected[s.key])) {
      setSelected({});
      setBlocked(null);
      return;
    }
    const next = { ...selected };
    for (const s of stacks) if (isEntitled(s, ent)) next[s.key] = true;
    setSelected(next);
    setMessage(null);
    const first = stacks.find((s) => !isEntitled(s, ent));
    setBlocked(first ? first.kind : null);
  }

  function save() {
    const fd = new FormData();
    for (const s of stacks) if (selected[s.key]) fd.set(s.key, "on");
    fd.set("sudoku_difficulty", difficulty);
    try {
      fd.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (emailDelivery) fd.set("email_delivery", "on");
    fd.set("stack_freq", JSON.stringify(freqs));
    } catch (e) {
      // no time zone available, the server falls back to UK time
    }
    if (digest) fd.set("digest", "on");
    startTransition(async () => {
      setMessage(await saveStackPrefs(null, fd));
    });
  }

  function sendNow() {
    startTransition(async () => {
      setMessage(await sendStacksNow());
    });
  }

  function badge(stack) {
    if (isEntitled(stack, ent)) {
      return { text: stack.kind === "puzzle" ? "Unlocked" : "In your Unlimited", open: false };
    }
    if (!tasterUsed || selected[stack.key]) return { text: "Try one free", open: true };
    return { text: stack.kind === "puzzle" ? "£1 add-on" : "Unlimited", open: false };
  }

  const GROUPS = [
    ["Reading", ["wikipedia", "onthisday", "news", "film", "word", "poem", "stoic", "fact"]],
    ["Everyday extras", ["recipe", "nature", "walk", "journal", "mushroom"]],
    ["Puzzles", ["sudoku", "crossword", "kidscrossword"]],
  ];
  const GROUP_BLURBS = {
Reading: "Something to read with your morning cup of tea.",
"Everyday extras": "Small bits of the day: what to cook, what to notice, a walk to take and a page to write on.",
Puzzles: "Made for a Kobo or iPad you can write on.",
};
const placed = new Set(GROUPS.flatMap((g) => g[1]));
  const leftover = stacks.filter((s) => !placed.has(s.key)).map((s) => s.key);
  const groups = GROUPS.map((g) => [g[0], g[1].map((k) => stacks.find((s) => s.key === k)).filter(Boolean)]);
  if (leftover.length) groups.push(["More", leftover.map((k) => stacks.find((s) => s.key === k))]);

  return (
    <>
<div className="card">
<div className="field-label" style={{ marginBottom: 12 }}>Daily Stacks</div>
<h2 style={{ fontSize: 38, marginBottom: 6 }}>A cosy corner for your Kobo</h2>
      <p style={{ marginTop: 0 }}>
        Little things that turn up with your morning. Switch on the ones you like, pick how often, and ignore the rest.
      </p>
      {!allEntitled && (
        <p className="stack-fineprint" style={{ marginTop: 0 }}>
          Free gets you one stack to try. Unlimited is £12 a year (under £1 a month) and covers every reading stack. Puzzle stacks are a £1 add-on.
        </p>
      )}

      <div style={{ textAlign: "right", marginTop: 6 }}><button type="button" className="btn btn-ghost" onClick={toggleAll}>{stacks.every((s) => selected[s.key]) ? "Clear all" : "Select all"}</button></div>
</div>
{groups.filter((g) => g[1].length).map((g) => (
          <div key={g[0]} className="card">
<h2 style={{ fontSize: 32, margin: "0 0 6px" }}>{g[0]}</h2>
<p style={{ marginTop: 0 }}>{GROUP_BLURBS[g[0]]}</p>
            <div className="stack-tiles">
            {g[1].map((s) => {
              const on = !!selected[s.key];
              const entitled = isEntitled(s, ent);
              const locked = !entitled && !on && tasterUsed;
              const b = badge(s);
              return (
                <label key={s.key} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, position: "relative", padding: "16px 16px 14px", minHeight: 190, borderRadius: 14, border: on ? "2px solid rgba(150,110,35,0.9)" : "1.5px solid rgba(150,110,35,0.5)", background: on ? "rgba(150,110,35,0.14)" : "rgba(255,252,244,0.7)", boxShadow: on ? "0 3px 0 rgba(150,110,35,0.45), 0 6px 14px rgba(60,40,10,0.16)" : "0 2px 0 rgba(150,110,35,0.25), 0 4px 10px rgba(60,40,10,0.08)", opacity: locked ? 0.6 : 1, cursor: "pointer" }}>
                  <input type="checkbox" checked={on} onChange={() => toggle(s)} style={{ position: "absolute", top: 12, right: 12 }} />
                  <span style={{ fontSize: 34, lineHeight: 1 }}>{locked ? "🔒" : s.emoji}</span>
                  <strong style={{ fontSize: 17 }}>{s.label}</strong>
                  <span style={{ fontSize: 13, fontStyle: "italic", opacity: 0.8 }}>{s.tagline}</span>
                  <span style={{ fontSize: 13, opacity: 0.75, flex: 1 }}>{s.blurb}</span>
                  {on && (
                    <select className="stack-select" value={freqKey(freqs[s.key])} onChange={(e) => setFreqs({ ...freqs, [s.key]: FREQ_OPTIONS[e.target.value] || ALL_DAYS })} style={{ fontSize: 13, maxWidth: "100%", margin: 0 }}>
                      {FREQ_LIST.map((o) => (<option key={o[0]} value={o[0]}>{o[1]}</option>))}
                      {freqKey(freqs[s.key]) === "custom" && <option value="custom">Your own days</option>}
                    </select>
                  )}
                  <span style={{ fontSize: 12, whiteSpace: "nowrap", fontWeight: b.open ? 700 : 400, padding: "3px 9px", borderRadius: 999, border: "1px solid rgba(150,110,35,0.5)" }}>{b.text}</span>
                </label>
              );
            })}
            </div>
{g[0] === "Puzzles" && selected.sudoku && (
        <div className="stack-toggle">
          <span>
            Sudoku difficulty
            <select className="stack-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="ramp">Gets harder through the week</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </span>
        </div>
      )}
</div>
))}
<div className="card">
{blocked && (
        <div className="stack-notice">
          {blocked === "puzzle" ? (
            <>
              <p>
                Puzzle stacks, made for Kobos you can write on, are a £1 add-on. You can still try one
                stack of any kind free.
              </p>
              <UpgradeButton product="puzzles" label="Add the Puzzle Pack, £1 once" />
            </>
          ) : (
            <>
              <p>
                Unlimited is £12 a year (under £1 a month) and gives you more than 3 Substacks and every reading stack you like.
                You can still try one stack of any kind free.
              </p>
              <UpgradeButton />
            </>
          )}
        </div>
      )}

      

      

      <label className="stack-toggle">
        <input type="checkbox" checked={emailDelivery} onChange={(e) => setEmailDelivery(e.target.checked)} />
        <span>
          <strong>Reading on an iPad or phone?</strong> Email my stacks to me each morning as attachments. Tap one, then Share, then Books.
        </span>
      </label>

      <div className="stacks-actions">
        <button className="btn" type="button" onClick={save} disabled={pending}>
          {pending ? "Working…" : "Save my stacks"}
        </button>
        <button className="btn btn-ghost" type="button" onClick={sendNow} disabled={pending}>
          Send today&apos;s now
        </button>
      </div>
      {message?.ok && <p className="stack-msg">{message.ok}</p>}
      {message?.error && <p className="stack-msg error">{message.error}</p>}
</div>
</>
);
}
