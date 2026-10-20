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
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed #c4ad82" }}>
      <p style={{ marginTop: 0 }}>
        Your Substacks are sent to your Kobo automatically every day. Want them sooner? This looks back over the past 7 days and sends the latest posts (up to 3 per writer) from your chosen authors now.
      </p>
      <button className="btn" type="button" onClick={run} disabled={pending}>
        {pending ? "Checking..." : "Check for more Substacks"}
      </button>
      {message?.ok && <p className="stack-msg">{message.ok}</p>}
      {message?.error && <p className="stack-msg error">{message.error}</p>}
    </div>
  );
}
