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
     <div className="eyebrow">Your favourite Substacks, on your Kobo, without lifting a finger</div>
<h1>Sign in to Stackt</h1>
      <p className="lede">
        We'll email you a link to sign in. No password, so there is nothing to forget.
      </p>

      <div className="card">
        {status === "sent" ? (
          <p style={{ margin: 0 }}>
            Check <strong>{email}</strong> for your link. It might be in junk, it often is. You can close this tab.
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
                {status === "sending" ? "Sending…" : "Send me a link"}
              </button>
            </div>
            {status === "error" && <p className="message error">{errorMsg}</p>}
          </form>
        )}
      </div>
        <section className="stack-teaser">
        <div className="eyebrow">Plus a cosy little corner</div>
        <h2>Little extras for your morning</h2>
        <p>
          Poems, recipes, puzzles and a daily mushroom, turning up on your Kobo (or in your inbox if you read on an iPad or phone). Pick the ones you like and how often. Free gets you 3 Substacks and one stack to try. Unlimited is £12 a year for the lot, which is under £1 a month. Puzzle stacks, made for Kobos you can write on, are a £1 add-on.
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
