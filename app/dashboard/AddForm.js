"use client";

import { useState, useTransition } from "react";
import { addSubstack } from "./actions";

export default function AddForm() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("url", url);

    startTransition(async () => {
      const result = await addSubstack(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setUrl("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div>
          <label className="field-label" htmlFor="url">
            Substack URL
          </label>
          <input
            id="url"
            name="url"
            type="text"
            placeholder="yourwriter.substack.com"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <button className="btn" type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add to shelf"}
        </button>
      </div>
      {error && <p className="message error">{error}</p>}
    </form>
  );
}
