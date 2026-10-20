export async function getValidAccessToken(connection, supabase) {
  const now = new Date();
  const expiresAt = new Date(connection.access_token_expires_at);
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresAt > new Date(now.getTime() + fiveMinutes)) {
    return connection.access_token;
  }

  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
      client_id: process.env.NEXT_PUBLIC_DROPBOX_APP_KEY,
      client_secret: process.env.DROPBOX_APP_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  const newExpiresAt = new Date(
    Date.now() + data.expires_in * 1000
  ).toISOString();

  await supabase
    .from("dropbox_connections")
    .update({
      access_token: data.access_token,
      access_token_expires_at: newExpiresAt,
    })
    .eq("user_id", connection.user_id);

  return data.access_token;
}

export async function uploadToDropbox(accessToken, folder, filename, buffer, overwrite = false) {
  const path = `${folder}/${filename}`.replace(/\/\//g, "/");

  const response = await fetch(
    "https://content.dropboxapi.com/2/files/upload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path,
          mode: overwrite ? "overwrite" : "add",
          autorename: !overwrite,
          mute: false,
        }),
      },
      body: buffer,
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Dropbox upload failed: ${err}`);
  }

  return await response.json();
}

// Deletes Stackt-style EPUBs ("Something - 2026-10-20.epub") older than `days` from one folder.
// Anything not named like that (your own books) is never touched.
export async function deleteOldFiles(accessToken, folder, days = 30) {
  if (!folder || folder === "/") return 0;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  const ours = /\s-\s\d{4}-\d{2}-\d{2}( \(\d+\))?\.epub$/i;

  let res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers,
    body: JSON.stringify({ path: folder, recursive: false, limit: 500 }),
  });
  if (!res.ok) throw new Error(`Dropbox list failed: ${res.status}`);
  let data = await res.json();
  const entries = [...data.entries];
  while (data.has_more) {
    res = await fetch("https://api.dropboxapi.com/2/files/list_folder/continue", {
      method: "POST",
      headers,
      body: JSON.stringify({ cursor: data.cursor }),
    });
    if (!res.ok) break;
    data = await res.json();
    entries.push(...data.entries);
  }

  let deleted = 0;
  for (const e of entries) {
    if (e[".tag"] !== "file" || !ours.test(e.name)) continue;
    if (new Date(e.server_modified).getTime() > cutoff) continue;
    const del = await fetch("https://api.dropboxapi.com/2/files/delete_v2", {
      method: "POST",
      headers,
      body: JSON.stringify({ path: e.path_lower }),
    });
    if (del.ok) deleted++;
  }
  return deleted;
}
