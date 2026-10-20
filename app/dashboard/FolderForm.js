"use client";

import { useState, useTransition } from "react";
import { updateSyncFolder, setAutoDelete } from "./actions";

export default function FolderForm({ currentFolder, autoDelete }) {
  const [folder, setFolder] = useState(currentFolder);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [tidy, setTidy] = useState(!!autoDelete);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const formData = new FormData();
    formData.set("folder", folder);

    startTransition(async () => {
      const result = await updateSyncFolder(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <div className="field-label">Dropbox folder</div>
      <p style={{ margin: "4px 0 0" }}>Your Daily Stacks arrive in <strong>Apps / Rakuten Kobo / Stackt</strong> and your Substacks arrive in <strong>Apps / Rakuten Kobo / Substacks</strong>. They are the same for everyone, so your Kobo finds them on its own.</p>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, fontSize: 14, cursor: "pointer" }}>
  <input
    type="checkbox"
    checked={tidy}
    style={{ marginTop: 4 }}
    onChange={(e) => {
      const value = e.target.checked;
      setTidy(value);
      setError(null);
      startTransition(async () => {
        const result = await setAutoDelete(value);
        if (result?.error) {
          setTidy(!value);
          setError(result.error);
        }
      });
    }}
  />
  <span>
    <strong>Tidy up after 30 days.</strong> Deletes Stackt EPUBs from this folder once they are 30 days old.
    Your own books are left alone.
  </span>
</label>
{error && <p className="message error">{error}</p>}
      {saved && !error && <p className="message">Saved.</p>}
    </form>
  );
}
