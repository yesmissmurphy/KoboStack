"use client";

import { useEffect, useRef, useState } from "react";

const JSZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
const EPUBJS = "https://cdnjs.cloudflare.com/ajax/libs/epub.js/0.3.93/epub.min.js";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="' + src + '"]')) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load " + src));
    document.head.appendChild(s);
  });
}

const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {
      // storage can be blocked, reading still works without it
    }
  },
};

export default function Reader({ id, title }) {
  const viewer = useRef(null);
  const rendition = useRef(null);
  const [status, setStatus] = useState("loading");
  const [size, setSize] = useState(() => Number(store.get("stackt-font")) || 110);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        await loadScript(JSZIP);
        await loadScript(EPUBJS);
        const res = await fetch("/api/library/file?id=" + id);
        if (!res.ok) throw new Error("not available");
        const buf = await res.arrayBuffer();
        if (dead) return;
        const book = window.ePub(buf, { openAs: "binary" });
        const r = book.renderTo(viewer.current, { width: "100%", height: "100%", flow: "paginated", spread: "none" });
        r.themes.default({
          body: { "font-family": "Georgia, serif", "line-height": "1.65", color: "#1d1d1d" },
          img: { "max-width": "100%" },
        });
        r.themes.fontSize(size + "%");
        rendition.current = r;
        r.on("relocated", (loc) => {
          if (loc && loc.start) store.set("stackt-loc-" + id, loc.start.cfi);
        });
        const onKey = (e) => {
          if (e.key === "ArrowRight") r.next();
          if (e.key === "ArrowLeft") r.prev();
        };
        r.on("keyup", onKey);
        document.addEventListener("keyup", onKey);
        await r.display(store.get("stackt-loc-" + id) || undefined);
        if (!dead) setStatus("ready");
      } catch (err) {
        if (!dead) setStatus("error");
      }
    })();
    return () => {
      dead = true;
      try {
        if (rendition.current) rendition.current.destroy();
      } catch (e) {
        // nothing to tidy up
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function bump(delta) {
    const next = Math.max(80, Math.min(200, size + delta));
    setSize(next);
    store.set("stackt-font", String(next));
    if (rendition.current) rendition.current.themes.fontSize(next + "%");
  }

  const bar = { display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#17302a", color: "#f4ead5" };
  const btn = { background: "transparent", color: "#f4ead5", border: "1px solid #c4ad82", borderRadius: 8, padding: "6px 12px", fontSize: 16, cursor: "pointer", textDecoration: "none" };
  const edge = { position: "absolute", top: "50%", transform: "translateY(-50%)", width: 44, height: 72, border: "none", borderRadius: 10, background: "rgba(23,48,42,0.55)", color: "#f4ead5", fontSize: 28, cursor: "pointer", zIndex: 2 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", background: "#fbf6ea" }}>
      <div style={bar}>
        <a href="/library" style={btn}>Back</a>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <button type="button" style={btn} onClick={() => bump(-10)} aria-label="Smaller text">A-</button>
        <button type="button" style={btn} onClick={() => bump(10)} aria-label="Bigger text">A+</button>
        <a href={"/api/library/file?id=" + id + "&download=1"} style={btn}>Save</a>
      </div>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {status === "loading" && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#17302a" }}>Opening your book...</div>}
        {status === "error" && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24, textAlign: "center", color: "#17302a" }}>
            This one would not open. If you are offline, books you have already opened once are saved for later, but new ones need a connection.
          </div>
        )}
        <button type="button" style={{ ...edge, left: 6 }} onClick={() => rendition.current && rendition.current.prev()} aria-label="Previous page">&#8249;</button>
        <button type="button" style={{ ...edge, right: 6 }} onClick={() => rendition.current && rendition.current.next()} aria-label="Next page">&#8250;</button>
        <div ref={viewer} style={{ position: "absolute", inset: "0 60px" }} />
      </div>
    </div>
  );
}
