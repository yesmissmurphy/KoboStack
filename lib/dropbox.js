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

export async function uploadToDropbox(accessToken, folder, filename, buffer) {
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
          mode: "add",
          autorename: true,
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
