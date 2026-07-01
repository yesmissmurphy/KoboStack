export async function fetchFeed(substackUrl) {
  const base = substackUrl.replace(/\/$/, "");
  const feedUrl = `${base}/feed`;

  const response = await fetch(feedUrl, {
    headers: { "User-Agent": "Shelf/1.0 (Kobo EPUB sync)" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${feedUrl} (${response.status})`);
  }

  const xml = await response.text();

  const items = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

  for (const match of itemMatches) {
    const block = match[1];

    const title = decode(extract(block, "title"));
    const link = extract(block, "link") || extract(block, "guid");
    const pubDateStr = extract(block, "pubDate") || extract(block, "dc:date");
    const content =
      extractCdata(block, "content:encoded") ||
      extractCdata(block, "description") ||
      extract(block, "description") ||
      "";
    const author =
      extract(block, "dc:creator") ||
      extract(block, "author") ||
      "";

    if (!title || !link) continue;

    items.push({
      title,
      link,
      pubDate: pubDateStr ? new Date(pubDateStr) : new Date(),
      content,
      author,
    });
  }

  const feedTitle = decode(extract(xml, "title")) || "Substack";

  return items.map((item) => ({
    ...item,
    author: item.author || feedTitle,
    feedTitle,
  }));
}

function extract(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
return m ? decode(m[1].trim()) : "";
}

function extractCdata(xml, tag) {
  const m = xml.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i")
  );
  return m ? m[1].trim() : "";
}

function decode(str) {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
