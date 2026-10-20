"use client";

import { useState, useTransition } from "react";
import { saveStackPrefs, sendStacksNow } from "./stackActions";

export default function StacksCard({ stacks, prefs }) {
  const [message, setMessage] = useState(null);
  const [pending, startTransition] = useTransition();

  function onSave(e) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveStackPrefs(null, formData);
      setMessage(res);
    });
  }

  function onSendNow() {
    startTransition(async () => {
      const res = await sendStacksNow();
      setMessage(res);
    });
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="field-label" style={{ marginBottom: 12 }}>Daily Stacks</div>
      <p style={{ marginTop: 0 }}>
        Little extras for your Kobo, delivered each morning with your Substacks. All off by default.
      </p>
      <form onSubmit={onSave}>
        {stacks.map((s) => (
          <label key={s.key} style={{ display: "block", margin: "10px 0" }}>
            <input type="checkbox" name={s.key} defaultChecked={!!prefs[s.key]} style={{ marginRight: 10 }} />
            <strong>{s.label}</strong>
            <span style={{ display: "block", marginLeft: 26, fontSize: 14, opacity: 0.8 }}>{s.blurb}</span>
            {s.key === "sudoku" && (
              <span style={{ display: "block", marginLeft: 26, marginTop: 6, fontSize: 14 }}>
                Difficulty:{" "}
                <select name="sudoku_difficulty" defaultValue={prefs.sudoku_difficulty || "ramp"}>
                  <option value="ramp">Gets harder through the week</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </span>
            )}
          </label>
        ))}
        <label style={{ display: "block", margin: "18px 0 10px" }}>
          <input type="checkbox" name="digest" defaultChecked={prefs.digest !== false} style={{ marginRight: 10 }} />
          <strong>Combine into one daily file</strong>
          <span style={{ display: "block", marginLeft: 26, fontSize: 14, opacity: 0.8 }}>
            Keeps your Kobo library tidy.
          </span>
        </label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Working…" : "Save"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onSendNow} disabled={pending}>
            Send today&apos;s now
          </button>
        </div>
        {message?.ok && <p className="message">{message.ok}</p>}
        {message?.error && <p className="message error">{message.error}</p>}
      </form>
    </div>
  );
}
