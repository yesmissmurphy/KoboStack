"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { STACKS } from "@/lib/stacks/catalog";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="shell">
     <div className="eyebrow">Get your favourite Substacks delivered to your Kobo automatically</div>
<h1>Sign in to Stackt</h1>
      <p className="lede">
        We'll email you a one-time link. No password to remember, nothing to lose.
      </p>

      <div className="card">
        {status === "sent" ? (
          <p style={{ margin: 0 }}>
            Check <strong>{email}</strong> for a sign-in link. You can close this tab.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <div style={{ marginTop: 18 }}>
              <button className="btn" type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send sign-in link"}
              </button>
            </div>
            {status === "error" && <p className="message error">{errorMsg}</p>}
          </form>
        )}
      </div>
        <section className="stack-teaser">
        <div className="eyebrow">Plus a cosy little corner</div>
        <h2>Daily Stacks for your Kobo</h2>
        <p>
          Small rituals that land on your Kobo each morning, on top of your Substacks. Try any one free.
          Reading stacks come with Unlimited (£4.99, once). Puzzle stacks, made for Kobos you can write
          on, are a £1 add-on.
        </p>
        <div className="stack-grid">
          {STACKS.map((s) => (
            <div key={s.key} className="stack-tile static">
              <span className="stack-emoji">{s.emoji}</span>
              <span className="stack-name">{s.label}</span>
              <span className="stack-tagline">{s.tagline}</span>
              <span className="stack-blurb">{s.blurb}</span>
              <span className={"stack-badge" + (s.kind === "puzzle" ? "" : " open")}>
                {s.kind === "puzzle" ? "£1 add-on" : "In Unlimited"}
              </span>
            </div>
          ))}
        </div>
      </section>
      <p style={{ marginTop: 32, fontSize: 13 }}><a href="/privacy">Privacy policy</a></p>
    </main>
  );
}
