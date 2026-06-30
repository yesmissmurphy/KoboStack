export async function fetchFeed(substackUrl) {
  const base = substackUrl.replace(/\/$/, "");
  const feedUrl = `${base}/feed`;

  const response = await fetch(feedUrl, {
    headers: { "User-Agent": "Shelf/1.0 (Kobo EPUB sync)" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${feedUrl} (${response.status})`);
  }

  const
