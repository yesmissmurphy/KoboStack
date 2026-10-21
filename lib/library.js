// Keeps a copy of every file we send, so the in-app Library can show it.
export const LIBRARY_BUCKET = "library";

// Never throws: a library hiccup must not stop the Dropbox or email delivery.
export async function saveToLibrary(supabase, { userId, kind, title, filename, buffer, dateStr, source }) {
  try {
    if (!userId || !buffer) return false;
    const path = userId + "/" + dateStr + "/" + filename;
    const up = await supabase.storage
      .from(LIBRARY_BUCKET)
      .upload(path, Buffer.from(buffer), { contentType: "application/epub+zip", upsert: true });
    if (up.error) {
      console.error("Library upload failed:", up.error.message);
      return false;
    }
    const ins = await supabase.from("library_items").upsert(
      { user_id: userId, kind, title, filename, path, source: source || null, sent_on: dateStr },
      { onConflict: "user_id,path" }
    );
    if (ins.error) {
      console.error("Library row failed:", ins.error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Library save failed:", err);
    return false;
  }
}
