"use client";

import { useState, useTransition } from "react";
import { updateSyncFolder } from "./actions";

export default function FolderForm({ currentFolder }) {
  const [folder, setFolder] = useState(currentFolder);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
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
      <label className="field-label" htmlFor="folder">
        Dropbox folder for your books
      </label>
      <div className="form-row">
        <div>
          <input
            id="folder"
            type="text"
            value={folder}
            onChange={(e) => {
              setFolder(e.target.value);
              setSaved(false);
            }}
           placeholder="/Apps/Rakuten Kobo/Shelf"
          />
        </div>
        <button className="btn btn-ghost" type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="message error">{error}</p>}
      {saved && !error && <p className="message">Saved.</p>}
    </form>
  );
}
