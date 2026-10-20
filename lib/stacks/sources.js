const UA = "Stackt/1.0 (https://www.kostackt.com; hello@kostackt.com)";

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

async function get(url, asText) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: asText ? "text/*, application/xml, application/atom+xml" : "application/json" },
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return asText ? res.text() : res.json();
}

function dayOfYear(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
}

function parts(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return { y, m, d };
}

// Returns the first complete top-level ordered list, so nested lists stay balanced.
function firstList(html) {
  const s = html.indexOf("<ol");
  if (s < 0) return "";
  const re = /<(\/?)ol\b[^>]*>/g;
  re.lastIndex = s;
  let depth = 0;
  let m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(s, m.index + m[0].length);
  }
  return "";
}

// ---- Word of the day (Wiktionary, CC BY-SA) ----
export async function wordStack(dateStr) {
  const xml = await get(
    "https://en.wiktionary.org/w/api.php?action=featuredfeed&feed=wotd&feedformat=atom",
    true
  );
  const entries = xml.split("<entry>").slice(1);
  if (!entries.length) throw new Error("No WOTD entries");
  const entry =
    entries.find((e) => e.includes(`<updated>${dateStr}`)) ||
    entries[entries.length - 1];
  const summary = decodeEntities(
    (entry.match(/<summary type="html">([\s\S]*?)<\/summary>/) || [])[1] || ""
  );
  const word = (summary.match(/id="WOTD-rss-title">([^<]*)</) || [])[1];
  if (!word) throw new Error("Could not read WOTD word");
  const pos = (summary.match(/WOTD-rss-title[\s\S]*?<\/b>\s*<i>([^<]*)<\/i>/) || [])[1];
  const startMarker = '<div id="WOTD-rss-description">';
  const start = summary.indexOf(startMarker);
  let desc = start >= 0 ? summary.slice(start + startMarker.length) : "";
  desc = desc.replace(/<style[\s\S]*?<\/style>/g, "");
  const defs = firstList(desc);
  if (defs) {
    desc = defs;
  } else {
    const end = desc.indexOf("</div> </td></tr>");
    if (end >= 0) desc = desc.slice(0, end);
  }
  desc = desc
    .replace(/<audio[\s\S]*?<\/audio>/g, "")
    .replace(/<img[^>]*>/g, "")
    .replace(/<\/?a\b[^>]*>/g, "")
    .replace(/<\/?span[^>]*>/g, "")
    .replace(/<\/?(style|div|table|tbody|tr|td)[^>]*>/g, "")
    .replace(/<(li|ol|ul|p|i|b)\b[^>]*>/g, "<$1>")
    .replace(/\s+/g, " ")
    .trim();
  const html =
    `<h2 style="font-size:2em;margin-bottom:0;">${esc(word)}</h2>` +
    (pos ? `<p><em>${esc(pos)}</em></p>` : "") +
    desc +
    '<p style="font-size:0.8em;margin-top:2em;">Source: Wiktionary, licensed CC BY-SA 4.0 (en.wiktionary.org).</p>';
  return { title: `Word of the day: ${word}`, html };
}

// ---- Wikipedia today's featured article (CC BY-SA) ----
function plainToHtml(text) {
  const out = [];
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const h = line.match(/^(=+)\s*(.*?)\s*=+$/);
    if (h) {
      const level = Math.min(h[1].length + 1, 4);
      if (/^(References|External links|Notes|Further reading|See also|Bibliography|Sources|Citations)$/i.test(h[2]))
        break;
      out.push(`<h${level}>${esc(h[2])}</h${level}>`);
    } else {
      out.push(`<p>${esc(line)}</p>`);
    }
  }
  return out.join("\n");
}

export async function wikipediaStack(dateStr) {
  const { y, m, d } = parts(dateStr);
  const feed = await get(
    `https://en.wikipedia.org/api/rest_v1/feed/featured/${y}/${m}/${d}`
  );
  const title = feed?.tfa?.title;
  if (!title) throw new Error("No featured article today");
  const data = await get(
    "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&format=json&titles=" +
      encodeURIComponent(title)
  );
  const page = Object.values(data?.query?.pages || {})[0];
  if (!page?.extract) throw new Error("No article text");
  const shown = (feed.tfa.normalizedtitle || title).replace(/_/g, " ");
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
  const html =
    plainToHtml(page.extract) +
    `<p style="font-size:0.8em;margin-top:2em;">Source: <em>${esc(shown)}</em>, Wikipedia, licensed CC BY-SA 4.0. Full article and authors: ${esc(url)}</p>`;
  return { title: `Wikipedia: ${shown}`, html };
}

// ---- On this day (Wikipedia, CC BY-SA) ----
export async function onThisDayStack(dateStr) {
  const { m, d } = parts(dateStr);
  const data = await get(
    `https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${m}/${d}`
  );
  const items = (data?.selected || [])
    .filter((e) => e?.text && e?.year != null)
    .sort((a, b) => a.year - b.year)
    .slice(0, 12);
  if (!items.length) throw new Error("No on-this-day events");
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const label = `${Number(d)} ${months[Number(m) - 1]}`;
  const html =
    `<p><em>What happened on ${esc(label)} in years gone by.</em></p>` +
    items.map((e) => `<p><strong>${esc(e.year)}</strong>. ${esc(e.text)}</p>`).join("\n") +
    '<p style="font-size:0.8em;margin-top:2em;">Source: Wikipedia, licensed CC BY-SA 4.0.</p>';
  return { title: `On this day: ${label}`, html };
}

// ---- Poem of the day (PoetryDB, public domain poems) ----
export async function poemStack(dateStr) {
  for (let i = 0; i < 6; i++) {
    const data = await get("https://poetrydb.org/random/1");
    const p = Array.isArray(data) ? data[0] : null;
    if (!p?.lines?.length) continue;
    if (p.lines.length > 70) continue;
    const body = p.lines
      .map((l) => (l.trim() ? esc(l) : "&#160;"))
      .join("<br/>\n");
    const html =
      `<p style="line-height:1.6;">${body}</p>` +
      `<p style="text-align:right;"><em>${esc(p.author)}</em></p>`;
    return { title: `Poem: ${p.title}`, html };
  }
  throw new Error("Could not find a suitable poem");
}

// ---- Stoic passage (Marcus Aurelius, Meditations, George Long translation, public domain) ----
const PROMPTS = [
  "Sit with this for a minute. Where does it apply to today?",
  "Read it once slowly. What is one small thing you could do differently because of it?",
  "Breathe in for four, out for six, and read it again.",
  "What would the calmest version of you do with this?",
];

export async function stoicStack(dateStr) {
  const text = await get("https://www.gutenberg.org/cache/epub/2680/pg2680.txt", true);
  const startIdx = text.indexOf("THE FIRST BOOK");
  const endIdx = text.indexOf("*** END OF");
  if (startIdx < 0) throw new Error("Meditations text not found");
  const body = text.slice(startIdx, endIdx > 0 ? endIdx : undefined);
  const paras = body
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.split(/\r?\n/).map((l) => l.trim()).join(" ").trim())
    .filter((p) => /^\d+\.\s/.test(p) && p.length > 180 && p.length < 1100);
  if (!paras.length) throw new Error("No passages parsed");
  const n = dayOfYear(dateStr);
  const para = paras[n % paras.length];
  const html =
    `<p style="font-size:1.1em;line-height:1.6;">${esc(para.replace(/^\d+\.\s/, ""))}</p>` +
    `<p style="text-align:right;"><em>Marcus Aurelius, Meditations</em></p>` +
    `<p style="margin-top:2em;">${esc(PROMPTS[n % PROMPTS.length])}</p>` +
    '<p style="font-size:0.8em;margin-top:2em;">Translation by George Long, public domain (Project Gutenberg).</p>';
  return { title: "Stoic thought for the day", html };
}

// ---- Daily fact ----
export async function factStack(dateStr) {
  const data = await get("https://uselessfacts.jsph.pl/api/v2/facts/today?language=en");
  const fact = data?.text;
  if (!fact) throw new Error("No fact returned");
  const html =
    `<p style="font-size:1.3em;line-height:1.6;">${esc(fact)}</p>` +
    '<p style="font-size:0.8em;margin-top:2em;">Source: uselessfacts.jsph.pl</p>';
  return { title: "Fact of the day", html };
}
