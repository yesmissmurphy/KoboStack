import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const dropboxError = searchParams.get("error");

  if (dropboxError) {
    return NextResponse.redirect(`${origin}/dashboard?dropbox_error=denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard?dropbox_error=missing_code`);
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/dropbox/callback`;

  const tokenResponse = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: process.env.NEXT_PUBLIC_DROPBOX_APP_KEY,
      client_secret: process.env.DROPBOX_APP_SECRET,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(`${origin}/dashboard?dropbox_error=exchange_failed`);
  }

  const tokenData = await tokenResponse.json();
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  await supabase.from("dropbox_connections").upsert({
    user_id: user.id,
    account_id: tokenData.account_id,
    refresh_token: tokenData.refresh_token,
    access_token: tokenData.access_token,
    access_token_expires_at: expiresAt,
  });

  return NextResponse.redirect(`${origin}/dashboard?dropbox_connected=1`);
}
