"use client";

import { useState, useTransition } from "react";
import { getMySubstacks } from "./actions";

export default function GetSubstacksButton() {
  const [message, setMessage] = useState(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setMessage(null);
    startTransition(async () => {
      setMessage(await getMySubstacks());
    });
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="field-label" style={{ marginBottom: 8 }}>Substacks</div>
      <p style={{ marginTop: 0 }}>
        Not seeing your latest posts? Fetch the newest from each of your Substacks right now.
      </p>
      <button className="btn" type="button" onClick={run} disabled={pending}>
        {pending ? "Fetching..." : "Get my Substacks"}
      </button>
      {message?.ok && <p className="stack-msg">{message.ok}</p>}
      {message?.error && <p className="stack-msg error">{message.error}</p>}
    </div>
  );
}
