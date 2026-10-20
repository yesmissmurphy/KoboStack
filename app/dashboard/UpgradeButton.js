"use client";

import { useState } from "react";

export default function UpgradeButton({ product, label }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: product || "unlimited" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (e) {
      // fall through to the message below
    }
    setLoading(false);
    alert("Something went wrong starting checkout. Please try again.");
  }

  return (
    <button className="btn" type="button" onClick={handleClick} disabled={loading}>
      {loading ? "Redirecting…" : label || "Go Unlimited, £12 a year"}
    </button>
  );
}
