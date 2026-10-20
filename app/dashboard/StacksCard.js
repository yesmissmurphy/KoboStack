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
  const fallbackFreq = String(prefs.frequency || 1);
  const [freqs, setFreqs] = useState(() => {
    const o = {};
    for (const s of stacks) o[s.key] = String((prefs.stack_freq || {})[s.key] || fallbackFreq);
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
    ["Puzzles", ["sudoku"]],
  ];
  const placed = new Set(GROUPS.flatMap((g) => g[1]));
  const leftover = stacks.filter((s) => !placed.has(s.key)).map((s) => s.key);
  const groups = GROUPS.map((g) => [g[0], g[1].map((k) => stacks.find((s) => s.key === k)).filter(Boolean)]);
  if (leftover.length) groups.push(["More", leftover.map((k) => stacks.find((s) => s.key === k))]);

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="field-label" style={{ marginBottom: 12 }}>Daily Stacks</div>
      <h2 style={{ marginBottom: 6 }}>A cosy corner for your Kobo</h2>
      <p style={{ marginTop: 0 }}>
        Little rituals that turn up with your morning. Switch on the ones you like and leave the rest.
      </p>
      {!allEntitled && (
        <p className="stack-fineprint" style={{ marginTop: 0 }}>
          Try one stack free. Reading stacks come with Unlimited (£4.99, once). Puzzle stacks, made for
          Kobos you can write on, are a £1 add-on.
        </p>
      )}

      <div>
        <div style={{ textAlign: "right", marginTop: 6 }}><button type="button" className="btn btn-ghost" onClick={toggleAll}>{stacks.every((s) => selected[s.key]) ? "Clear all" : "Select all"}</button></div>
        {groups.filter((g) => g[1].length).map((g) => (
          <div key={g[0]} style={{ marginBottom: 14 }}>
            <div className="field-label" style={{ margin: "16px 0 10px" }}>{g[0]}</div>
            {g[1].map((s) => {
              const on = !!selected[s.key];
              const entitled = isEntitled(s, ent);
              const locked = !entitled && !on && tasterUsed;
              const b = badge(s);
              return (
                <label key={s.key} title={s.blurb} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", marginBottom: 10, borderRadius: 12, border: on ? "2px solid rgba(150,110,35,0.9)" : "1.5px solid rgba(150,110,35,0.5)", background: on ? "rgba(150,110,35,0.14)" : "rgba(255,252,244,0.6)", boxShadow: on ? "0 3px 0 rgba(150,110,35,0.45), 0 6px 14px rgba(60,40,10,0.16)" : "0 2px 0 rgba(150,110,35,0.25), 0 4px 10px rgba(60,40,10,0.08)", opacity: locked ? 0.6 : 1, cursor: "pointer" }}>
                  <input type="checkbox" checked={on} onChange={() => toggle(s)} />
                  <span style={{ fontSize: 22 }}>{locked ? "🔒" : s.emoji}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong>{s.label}</strong>
                    <span style={{ display: "block", fontSize: 13, opacity: 0.75 }}>{s.tagline}</span>
                    {on && (<select className="stack-select" value={freqs[s.key] || "1"} onChange={(e) => setFreqs({ ...freqs, [s.key]: e.target.value })} style={{ marginTop: 6, fontSize: 13 }}><option value="1">Every day</option><option value="2">Every two days</option><option value="3">Every three days</option><option value="7">Once a week</option></select>)}
                  </span>
                  <span style={{ fontSize: 12, whiteSpace: "nowrap", fontWeight: b.open ? 700 : 400, padding: "3px 9px", borderRadius: 999, border: "1px solid rgba(150,110,35,0.5)" }}>{b.text}</span>
                </label>
              );
            })}
          </div>
        ))}
      </div>

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
                Reading stacks come with Unlimited (£4.99, once), which also lifts the 3 Substack limit.
                You can still try one stack of any kind free.
              </p>
              <UpgradeButton />
            </>
          )}
        </div>
      )}

      {selected.sudoku && (
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
  );
}
