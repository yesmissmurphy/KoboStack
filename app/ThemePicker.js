"use client";

import { useEffect, useState } from "react";

export const THEMES = [
  { key: "forest", label: "Forest", swatch: ["#17302a", "#c99a40"] },
  { key: "plum", label: "Plum", swatch: ["#3a2342", "#d08a5c"] },
  { key: "rain", label: "Rainy day", swatch: ["#1d3b4f", "#d4a24c"] },
  { key: "lamp", label: "Lamplight", swatch: ["#2b2330", "#e0a458"] },
  { key: "ink", label: "Ink and paper", swatch: ["#1b1b1b", "#9a9a9a"] },
];

export default function ThemePicker() {
  const [theme, setTheme] = useState("forest");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) setTheme(t);
  }, []);

  function pick(key) {
    setTheme(key);
    document.documentElement.setAttribute("data-theme", key);
    try {
      document.cookie = "stackt_theme=" + key + "; path=/; max-age=31536000; samesite=lax";
    } catch (e) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    const t = THEMES.find((x) => x.key === key);
    if (meta && t) meta.setAttribute("content", t.swatch[0]);
    setOpen(false);
  }

  return (
    <div className="theme-picker">
      <button type="button" className="theme-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        Colours
      </button>
      {open && (
        <div className="theme-menu" role="menu">
          {THEMES.map((t) => (
            <button key={t.key} type="button" role="menuitemradio" aria-checked={theme === t.key} className={"theme-opt" + (theme === t.key ? " on" : "")} onClick={() => pick(t.key)}>
              <span className="theme-swatch" style={{ background: "linear-gradient(90deg," + t.swatch[0] + " 50%," + t.swatch[1] + " 50%)" }} />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
