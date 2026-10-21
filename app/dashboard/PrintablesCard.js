"use client";

import { useState } from "react";
import { sendPrintable } from "./printableActions";

export default function PrintablesCard({ items, groups }) {
  const [msg, setMsg] = useState({});
  const [busy, setBusy] = useState("");
  const [fresh, setFresh] = useState({});

  async function send(key, dest) {
    setBusy(key + dest);
    setMsg((m) => ({ ...m, [key]: "" }));
    const res = await sendPrintable(key, dest, fresh[key] || "");
    setMsg((m) => ({ ...m, [key]: res.ok || res.error }));
    setBusy("");
  }

  const another = (key) => setFresh((f) => ({ ...f, [key]: String(Date.now()) }));
  const href = (key) => `/api/printable?key=${key}${fresh[key] ? `&fresh=${fresh[key]}` : ""}`;

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="field-label" style={{ marginBottom: 12 }}>Printables</div>
      <h2 style={{ marginBottom: 6 }}>Pencil, paper or stylus</h2>
      <p style={{ marginTop: 0 }}>
        Puzzles, colouring and pages to write on. Open one to print it, or send it to your Kobo or inbox and use a stylus.
      </p>
      <p className="stack-fineprint" style={{ marginTop: 0 }}>
        We call them printables, but we do care about the planet. If you can, use a screen and a stylus instead of paper.
      </p>
      {groups.map(([gk, title]) => {
        const list = items.filter((p) => p.audience === gk);
        if (!list.length) return null;
        return (
          <div key={gk} style={{ marginBottom: 14 }}>
            <div className="field-label" style={{ margin: "16px 0 10px" }}>{title}</div>
            <div className="stack-tiles">
              {list.map((p) => (
                <div key={p.key} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, padding: "16px 16px 14px", minHeight: 190, borderRadius: 14, border: "1.5px solid rgba(150,110,35,0.5)", background: "rgba(255,252,244,0.7)", boxShadow: "0 2px 0 rgba(150,110,35,0.25), 0 4px 10px rgba(60,40,10,0.08)" }}>
                  <span style={{ fontSize: 34, lineHeight: 1 }}>{p.emoji}</span>
                  <strong style={{ fontSize: 17 }}>{p.label}</strong>
                  <span style={{ fontSize: 13, fontStyle: "italic", opacity: 0.8 }}>{p.tagline}</span>
                  <span style={{ fontSize: 13, opacity: 0.75, flex: 1 }}>{p.blurb}</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <a className="btn btn-ghost" href={href(p.key)} target="_blank" rel="noreferrer" style={{ padding: "6px 12px", fontSize: 13 }}>Open</a>
                    <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={() => send(p.key, "kobo")} style={{ padding: "6px 12px", fontSize: 13 }}>{busy === p.key + "kobo" ? "Sending..." : "To Kobo"}</button>
                    <button type="button" className="btn btn-ghost" disabled={!!busy} onClick={() => send(p.key, "email")} style={{ padding: "6px 12px", fontSize: 13 }}>{busy === p.key + "email" ? "Sending..." : "Email me"}</button>
                  </div>
                  <button type="button" onClick={() => another(p.key)} style={{ background: "none", border: "none", padding: 0, fontSize: 12, textDecoration: "underline", cursor: "pointer", opacity: 0.7 }}>
                    {fresh[p.key] ? "Another one made" : "Give me a different one"}
                  </button>
                  {msg[p.key] && <span style={{ fontSize: 12 }}>{msg[p.key]}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
