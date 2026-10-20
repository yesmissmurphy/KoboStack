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

  function save() {
    const fd = new FormData();
    for (const s of stacks) if (selected[s.key]) fd.set(s.key, "on");
    fd.set("sudoku_difficulty", difficulty);
    try {
      fd.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (emailDelivery) fd.set("email_delivery", "on");
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

      <div className="stack-grid">
        {stacks.map((s) => {
          const on = !!selected[s.key];
          const entitled = isEntitled(s, ent);
          const locked = !entitled && !on && tasterUsed;
          const b = badge(s);
          return (
            <label key={s.key} className={`stack-tile${on ? " on" : ""}${locked ? " locked" : ""}`}>
              <input type="checkbox" checked={on} onChange={() => toggle(s)} />
              <span className="stack-emoji">{locked ? "🔒" : s.emoji}</span>
              <span className="stack-name">{s.label}</span>
              <span className="stack-tagline">{s.tagline}</span>
              <span className="stack-blurb">{s.blurb}</span>
              <span className={`stack-badge${b.open ? " open" : ""}`}>{b.text}</span>
            </label>
          );
        })}
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
