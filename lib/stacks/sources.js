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
    return { title: `Poem of the day: ${p.title}`, html };
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

// ---- World news (Wikipedia In the news, CC BY-SA) ----
function clip(t, n) {
  const s = String(t || "").replace(/ +/g, " ").trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "));
  return end > 200 ? cut.slice(0, end + 1) : cut.replace(/ [^ ]*$/, "") + "...";
}

export async function newsStack(dateStr) {
  const { y, m, d } = parts(dateStr);
  const feed = await get(`https://en.wikipedia.org/api/rest_v1/feed/featured/${y}/${m}/${d}`);
  const blocks = [];
  for (const n of (feed?.news || []).slice(0, 7)) {
    const story = decodeEntities(String(n.story || "").replace(/<[^>]+>/g, "").replace(/ +/g, " ").trim());
    if (!story) continue;
    const links = (n.links || []).filter((l) => l && l.extract);
    const nameOf = (l) => String(l.normalizedtitle || l.title || "").replace(/_/g, " ");
    const title = links[0] ? nameOf(links[0]) : clip(story, 60);
    const background = links
      .slice(0, 3)
      .map((l) => `<p><strong>${esc(nameOf(l))}.</strong> ${esc(clip(l.extract, 650))}</p>`)
      .join("");
    blocks.push(
      `<div style="page-break-before:always;"><h2 style="font-size:1.8em;line-height:1.2;margin:0 0 0.5em 0;">${esc(title)}</h2>` +
        `<p style="font-size:1.05em;line-height:1.55;">${esc(story)}</p>` +
        (background ? `<p style="font-size:0.8em;letter-spacing:0.1em;margin:1.4em 0 0.2em 0;">BACKGROUND</p>${background}` : "") +
        "</div>"
    );
  }
  if (!blocks.length) throw new Error("No news items today");
  const html =
    blocks.join("") +
    `<p style="font-size:0.8em;margin-top:2em;">Source: Wikipedia, In the news, licensed CC BY-SA 4.0 (en.wikipedia.org).</p>`;
  return { title: "World news", html };
}

// ---- Journal prompt of the day (original prompts) ----
const JOURNAL_PROMPTS = [
  "What is one small thing from this week that you would like to remember in ten years?",
  "Describe a place where you feel completely at ease. What can you see, hear and smell there?",
  "What have you been putting off, and what is the smallest first step?",
  "Write about someone who made your life easier recently. What did they do?",
  "What would a perfect ordinary Tuesday look like for you?",
  "What are you carrying around at the moment that you could put down?",
  "Describe a meal you will never forget, and who was at the table.",
  "What did you believe at twenty that you no longer believe?",
  "What is something you are quietly proud of that nobody has noticed?",
  "Write a letter to yourself a year from now. What do you hope has changed?",
  "What does rest actually look like for you, and when did you last have it?",
  "Which three things are going well right now, however small?",
  "What is a rule you follow that you have never questioned?",
  "Describe the last time you laughed until it hurt.",
  "What would you do this week if nobody were watching or judging?",
  "Which season do you feel most like yourself in, and why?",
  "What is a skill you would like to be bad at for fun?",
  "Write about a smell that takes you straight back to childhood.",
  "What are you looking forward to, even if it is tiny?",
  "Who do you miss, and what would you say to them today?",
  "What is one thing you wish people understood about you?",
  "Describe your ideal morning from the moment you wake up.",
  "What did you learn the hard way that you are grateful for now?",
  "If your mood today were weather, what would the forecast be?",
  "What is a boundary you would like to set or keep?",
  "Write about a time you were braver than you thought you could be.",
  "What is cluttering your mind, and which bit of it can wait until tomorrow?",
  "Describe a stranger you noticed recently and invent a day in their life.",
  "What makes a place feel like home to you?",
  "What is something you keep saying yes to that you would like to say no to?",
  "List ten things you can see, hear or feel right now, then pick one and write about it.",
  "What would you tell your younger self about the thing you are worrying about now?",
  "What does a good day cost, and what does a good day give back?",
  "Write about a song that matters to you and the moment it belongs to.",
  "What are you curious about at the moment?",
  "Describe a small kindness you have received that stayed with you.",
  "What is one habit you would like to start, and what would make it easy?",
  "If you could spend a day anywhere in the world, where and why?",
  "What have you outgrown lately, and what has taken its place?",
  "Write about something ordinary that you find quietly beautiful.",
];

const JOURNAL_NUDGES = [
  "Set a timer for ten minutes and keep the pen moving, even if what you write is rubbish.",
  "Start with: Right now I am noticing...",
  "Write the worst possible first sentence on purpose, then carry on from there.",
  "Answer as if you were writing to a friend who will not judge you.",
  "You do not have to finish. Three honest lines count.",
];

export async function journalStack(dateStr) {
  const n = dayOfYear(dateStr);
  const prompt = JOURNAL_PROMPTS[n % JOURNAL_PROMPTS.length];
  const nudge = JOURNAL_NUDGES[n % JOURNAL_NUDGES.length];
  const lines = Array.from({ length: 16 }, () => `<p style="border-bottom:1px solid #888;height:2.2em;margin:0;">&#160;</p>`).join("");
  const html =
    `<p style="font-size:0.85em;letter-spacing:0.12em;">TODAY IS FOR WRITING ABOUT...</p>` +
    `<h2 style="font-size:1.7em;line-height:1.3;margin:0.4em 0 1em 0;">${esc(prompt)}</h2>` +
    `<div style="margin-top:1.5em;">${lines}</div>`;
  return { title: "Journal prompt of the day", html };
}

// ---- Mushroom of the day (Wikipedia, CC BY-SA) ----
const FUNGI = [
  "Amanita muscaria", "Cantharellus cibarius", "Boletus edulis", "Morchella", "Hericium erinaceus",
  "Cordyceps", "Ophiocordyceps unilateralis", "Armillaria ostoyae", "Phallus impudicus", "Clathrus archeri",
  "Coprinus comatus", "Coprinopsis atramentaria", "Laetiporus sulphureus", "Fistulina hepatica", "Pleurotus ostreatus",
  "Lentinula edodes", "Agaricus bisporus", "Trametes versicolor", "Fomes fomentarius", "Piptoporus betulinus",
  "Geastrum", "Calvatia gigantea", "Lycoperdon perlatum", "Panellus stipticus", "Omphalotus olearius",
  "Hygrocybe", "Tremella fuciformis", "Auricularia auricula-judae", "Tuber melanosporum", "Sparassis crispa",
  "Russula emetica", "Lactarius deliciosus", "Hydnum repandum", "Craterellus cornucopioides", "Xylaria hypoxylon",
  "Cyathus striatus", "Coprinellus micaceus", "Aleuria aurantia", "Schizophyllum commune", "Stereum hirsutum",
  "Chlorociboria aeruginascens", "Saccharomyces cerevisiae", "Penicillium", "Lichen", "Mycorrhiza", "Mycelium",
];

export async function mushroomStack(dateStr) {
  const n = dayOfYear(dateStr);
  for (let i = 0; i < 4; i++) {
    const name = FUNGI[(n + i) % FUNGI.length];
    try {
      const data = await get(
        "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&format=json&titles=" + encodeURIComponent(name)
      );
      const page = Object.values(data?.query?.pages || {})[0];
      if (!page?.extract) continue;
      let text = page.extract;
      if (text.length > 5000) {
        const cut = text.slice(0, 5000);
        text = cut.slice(0, cut.lastIndexOf(String.fromCharCode(10)));
      }
      const html =
        `<p style="font-size:0.85em;letter-spacing:0.12em;">A LITTLE FUNGUS FOR YOUR MORNING</p>` +
        plainToHtml(text) +
        `<p style="margin-top:1.5em;"><em>A gentle note: never eat a wild mushroom unless an expert has identified it in person. Admire it, photograph it, and leave it be.</em></p>` +
        `<p style="font-size:0.8em;margin-top:2em;">Source: ${esc(page.title)}, Wikipedia, licensed CC BY-SA 4.0.</p>`;
      return { title: `Mushroom of the day: ${page.title}`, html };
    } catch (e) {
      continue;
    }
  }
  throw new Error("Could not find a fungus today");
}

// ---- Cult classic film of the day ----
const CULT_FILMS = [
  "The Rocky Horror Picture Show|1975|Jim Sharman|A strait-laced engaged couple break down in the rain and take shelter in the castle of Dr Frank-N-Furter, a flamboyant scientist about to unveil his latest creation.|It flopped at first, then found a devoted audience at midnight screenings where fans dress up, shout back at the screen and sing along. It has been playing in cinemas ever since.",
  "The Big Lebowski|1998|Joel and Ethan Coen|A laid-back bowler known as the Dude is mistaken for a millionaire of the same name, and gets dragged into a kidnapping plot after a thug ruins his rug.|It was a modest hit that grew through word of mouth and endlessly quotable lines. It now has its own festivals, a following that treats it like a philosophy, and costume nights worldwide.",
  "Donnie Darko|2001|Richard Kelly|A troubled teenager in a quiet suburb is visited by a figure in a sinister rabbit suit who tells him the world will end in a little under a month.|It barely registered in cinemas, then took off on DVD, where its puzzling timeline and moody soundtrack kept people arguing and rewatching for years.",
  "Withnail and I|1987|Bruce Robinson|Two out-of-work actors in grubby 1969 Camden escape to the countryside for a disastrous holiday at the cottage of a theatrical uncle with ideas of his own.|Loved for its bone-dry lines and gloomy British comedy, it became a student staple, and a drinking game that few have survived.",
  "Blade Runner|1982|Ridley Scott|In a rain-soaked future Los Angeles, a retired policeman is called back to hunt four artificial humans who have returned to Earth looking for more life.|Critics were cool and audiences stayed away at first. Its look and its questions about what makes us human went on to shape a whole genre.",
  "Office Space|1999|Mike Judge|A fed-up software worker, hypnotised into total calm, decides to stop caring about his dull job and hatches a plan with two colleagues.|It did poorly at the cinema, then became a favourite on video because anyone who has sat through a pointless meeting recognises it. The printer scene is legendary.",
  "Heathers|1988|Michael Lehmann|A clever girl who wants out of her school’s ruling clique falls for a dangerous newcomer, and the popular crowd start dying in staged accidents.|Its black humour and invented slang were too dark for some at the time. It has since become the template for sharp, stylish teen satire.",
  "Clue|1985|Jonathan Lynn|Six guests at a spooky mansion are summoned by a blackmailer, and when their host turns up dead, a butler and the guests race to work out whodunnit.|Based on the board game, it came and went at the cinema, then won people over on television. The three different endings are what everyone remembers.",
  "Monty Python and the Holy Grail|1975|Terry Gilliam and Terry Jones|King Arthur and his knights go in search of the Holy Grail, meeting killer rabbits, taunting Frenchmen and a Black Knight who simply refuses to give up.|Made on a tiny budget, with coconuts standing in for horses, it became one of the most quoted comedies of all time. Fans can recite whole scenes.",
  "Labyrinth|1986|Jim Henson|A teenager wishes her baby brother away and has thirteen hours to cross a maze and rescue him from the Goblin King.|It underperformed at first, then became a childhood favourite through television and video. David Bowie as the king and the Henson puppets keep it adored.",
  "Repo Man|1984|Alex Cox|A young punk takes a job with a car repossession firm in Los Angeles and ends up chasing a Chevy Malibu with something very odd in the boot.|A strange, low-budget blend of sci-fi and punk satire, it is loved for being gloriously unclassifiable.",
  "The Warriors|1979|Walter Hill|A New York street gang must get across the city overnight, on foot, after being wrongly blamed for the killing of a rival leader.|Controversial on release, it became a style icon, inspiring games, costumes and some of the most imitated taunts in cinema.",
  "Evil Dead II|1987|Sam Raimi|A man trapped in a remote cabin fights the possessed bodies of his friends with a chainsaw and a shotgun.|A wild mix of horror and slapstick made on a small budget, it showed what inventive filmmaking could do and made Bruce Campbell a hero to horror fans.",
  "Napoleon Dynamite|2004|Jared Hess|An awkward teenager in rural Idaho helps his friend run for class president while muddling through school and family life.|A tiny independent film that took off through word of mouth, it gave people endless quotable lines and a dance scene still copied at weddings.",
  "Harold and Maude|1971|Hal Ashby|A young man obsessed with death forms an unlikely friendship with a free-spirited woman nearly eighty.|It was largely ignored on release, but college screenings turned it into a much-loved, bittersweet oddity about living fully.",
  "This Is Spinal Tap|1984|Rob Reiner|A documentary crew follows an ageing British heavy metal band on a calamity-filled American tour.|It invented the modern mockumentary, and was so convincing that some viewers believed the band was real. Musicians still quote it.",
  "The Princess Bride|1987|Rob Reiner|A grandfather reads a story to his sick grandson about a farm boy, a princess, a pirate, a fencing master and a giant.|It did modest business at the cinema, then became adored on video and is now one of the most quoted family films ever made.",
  "Dazed and Confused|1993|Richard Linklater|On the last day of school in 1976, Texas teenagers spend the night partying, hazing and wondering what comes next.|It barely opened, then became a favourite on video and launched the careers of a remarkable number of future stars.",
  "Bill and Teds Excellent Adventure|1989|Stephen Herek|Two cheerfully clueless teenagers travel through time in a telephone box to collect historical figures for a school presentation.|A sleeper hit that spawned catchphrases, sequels and a very particular kind of air guitar.",
  "Eraserhead|1977|David Lynch|An anxious man in an industrial wasteland is left to care for his strange newborn child.|David Lynch’s first feature was made slowly on a tiny budget and became a midnight movie favourite, admired as a black-and-white waking nightmare unlike anything else.",
  "Rushmore|1998|Wes Anderson|A precocious teenager, eager to be the big man at his prep school, falls out with a friend over the affections of a teacher.|It marked the arrival of Wes Anderson’s distinctive style, and its mix of melancholy and deadpan humour gathered a loyal following.",
  "Shaun of the Dead|2004|Edgar Wright|A slacker trying to win back his girlfriend does not at first notice that zombies have taken over London.|A smart, very British comedy that gently mocks and honours horror, it built a devoted fan base and launched a trio of films with the same team.",
  "The Fifth Element|1997|Luc Besson|In twenty-third century New York, a taxi driver ends up protecting a mysterious woman who may be the key to saving the world from ultimate evil.|Colourful, camp and gloriously over the top, it has gathered fans who love its costumes by Jean Paul Gaultier and its sheer exuberance.",
  "Brazil|1985|Terry Gilliam|A minor clerk in a dystopian bureaucracy dreams of flying and gets tangled in a clerical error that ruins an innocent man.|After a battle with the studio over the ending, it found its audience through festivals and home video, and is admired as a dark comic masterpiece.",
  "Wet Hot American Summer|2001|David Wain|On the last day of a 1981 summer camp, the counsellors scramble to find love, finish the show and survive some ridiculous events.|It flopped at first, but its ridiculous humour and a cast of future stars made it a favourite, and later led to a spin-off series.",
  "Ghost World|2001|Terry Zwigoff|Two sardonic teenage friends drift apart after leaving school, one of them forming a bond with a lonely record collector.|A gentle, wry portrait of being young and out of step, it connects with anyone who has ever felt like an outsider.",
  "Time Bandits|1981|Terry Gilliam|A boy joins a gang of dwarfs who plunder history using a stolen map of holes in time.|Part fairy tale, part comedy, it is a children’s adventure with a strange and slightly dark edge that has stayed with people for decades.",
  "Phantom of the Paradise|1974|Brian De Palma|A disfigured composer haunts a rock palace after a sinister producer steals his music.|A flop in most places, it became a midnight favourite, and was a huge hit in certain cities, with its glam rock take on classic stories.",
  "The Room|2003|Tommy Wiseau|A banker is betrayed by his fiancee and his best friend, in a drama that does not quite go to plan.|Widely called one of the worst films ever made, it became a beloved so-bad-its-good phenomenon, with cinema screenings where fans throw plastic spoons.",
  "Videodrome|1983|David Cronenberg|A television executive hunting for extreme programming finds a mysterious signal that begins to blur the line between screen and reality.|Ahead of its time in imagining how media could change us, it became a cult favourite for its unsettling ideas and strange imagery.",
  "The Man Who Fell to Earth|1976|Nicolas Roeg|An alien visits Earth hoping to save his dying planet, but is slowly worn down by life among humans.|David Bowie’s first film role, in a hazy and dreamlike story, became a favourite among people who love strange, beautiful cinema.",
  "Suspiria|1977|Dario Argento|An American dancer arrives at a prestigious German ballet academy and discovers that something sinister is going on behind the scenes.|Famous for its lurid colours and pounding score by Goblin, it is a landmark of Italian horror and is studied by filmmakers to this day.",
  "Waiting for Guffman|1996|Christopher Guest|A small-town theatre troupe in Missouri stages a musical for the town’s anniversary, hoping a Broadway scout will turn up.|Gentle, improvised and affectionate, it is a mockumentary beloved by fans of very British and very American awkwardness alike.",
  "Scott Pilgrim vs. the World|2010|Edgar Wright|A slacker musician must defeat the seven evil exes of his new girlfriend, in a world that works like a video game.|It disappointed at the cinema but became a favourite on home video, with a dedicated fan base that loves its style and soundtrack.",
  "Hairspray|1988|John Waters|A cheerful plump teenager in 1960s Baltimore dances her way onto a local television show and ends up standing up for integration.|The gentlest film by the director John Waters, it is a joyful and kind comedy that later became a hit musical.",
  "Idiocracy|2006|Mike Judge|An average soldier is frozen in an experiment and wakes up five hundred years later to find that he is the smartest man alive.|The studio barely released it, but word of mouth turned its satire into a favourite that people keep saying looks more accurate every year.",
  "Local Hero|1983|Bill Forsyth|An oil company executive is sent to buy a small Scottish village and slowly falls under its spell.|A gentle, quietly funny film with a lovely soundtrack, it is cherished in Britain for its warmth and its very particular sense of place.",
  "The Wicker Man|1973|Robin Hardy|A devout policeman travels to a remote Scottish island to investigate a missing girl, and finds the islanders have their own customs.|Cut and neglected by the studio, it was rediscovered by fans and is now often named among the great British horror films, with a famous folk soundtrack.",
  "Delicatessen|1991|Jean-Pierre Jeunet and Marc Caro|In a crumbling apartment block above a butcher shop in post-apocalyptic France, a new tenant falls for the butcher’s daughter.|A darkly funny and inventive fable, its strange visual style helped to launch the careers of its two directors.",
  "Galaxy Quest|1999|Dean Parisot|The washed-up cast of a cancelled sci-fi series are mistaken by real aliens for actual heroes and must save the day.|A warm-hearted spoof loved by fans of the genre they are teasing, it is often named the best Star Trek film that is not a Star Trek film.",
  "Big Trouble in Little China|1986|John Carpenter|A swaggering lorry driver is pulled into a hidden world beneath San Francisco’s Chinatown to rescue his friend’s fiancee.|It flopped on release, then built a loyal following for its mix of martial arts, comedy and monsters.",
  "The Dark Crystal|1982|Jim Henson and Frank Oz|On a faraway world, a gentle creature sets out to find a missing shard of a crystal and restore balance.|Made entirely with puppets and no human actors, it is admired for its extraordinary craftsmanship and its eerie, beautiful world.",
  "Fight Club|1999|David Fincher|An insomniac office worker and a charismatic soap salesman start an underground fight club that grows into something much bigger than either of them intended.|It underperformed at the cinema, then became a DVD sensation, with its twisty story and sharp satire of consumer life endlessly discussed and quoted.",
  "Mulholland Drive|2001|David Lynch|An aspiring actress arrives in Los Angeles and befriends an amnesiac woman, in a story that keeps slipping out of focus.|Hypnotic and baffling, it is endlessly debated and is often named among the best films of its decade.",
  "Blue Velvet|1986|David Lynch|A young man finds a severed ear in a field and is drawn into a dark mystery beneath his seemingly perfect small town.|It shocked audiences on release and is now admired as a defining study of the strange lurking under the ordinary.",
  "Hedwig and the Angry Inch|2001|John Cameron Mitchell|A rock singer from East Berlin tells the story of her botched escape, her bandmates and her search for love and identity.|Adapted from a stage show, it won devoted fans for its glam rock songs and enormous heart.",
  "Pee-wee’s Big Adventure|1985|Tim Burton|Pee-wee Herman sets off on a cross-country quest to find his stolen bicycle.|Tim Burton’s first feature, its cheerful oddness and candy-coloured world have charmed viewers for decades.",
  "The Adventures of Buckaroo Banzai Across the 8th Dimension|1984|W. D. Richter|A neurosurgeon, physicist and rock star battles evil aliens from the eighth dimension with the help of his band.|Baffling at the box office, it was embraced by sci-fi fans for its wild, throwaway inventiveness.",
  "Barton Fink|1991|Joel and Ethan Coen|A New York playwright hired to write a wrestling picture in 1941 Hollywood struggles with writer’s block in a strange, sweltering hotel.|A dreamlike Coen film that rewards repeat viewing and has a devoted following among film lovers.",
  "Raising Arizona|1987|Joel and Ethan Coen|A petty thief and an ex-policewoman who cannot have children kidnap a baby from a local furniture magnate.|A slapstick Coen comedy packed with lines that fans still quote.",
  "The Lost Boys|1987|Joel Schumacher|Two brothers who move to a seaside Californian town discover that the local teenage gang are vampires.|A stylish, funny teen horror with a great soundtrack that became a staple of sleepovers and late-night TV.",
  "Valley Girl|1983|Martha Coolidge|A San Fernando Valley girl falls for a punk from Hollywood, to the horror of her friends.|A sweet, funny romance with a killer 1980s soundtrack that grew into a nostalgic favourite.",
  "Streets of Fire|1984|Walter Hill|A soldier of fortune returns to his old neighbourhood to rescue his ex, a rock singer kidnapped by a biker gang.|Billed as a rock and roll fable, it flopped at first and then won fans for its neon look and big-hearted songs.",
  "Strange Brew|1983|Rick Moranis and Dave Thomas|Two hoser brothers, Bob and Doug McKenzie, uncover a sinister plot at a brewery.|A beloved Canadian comedy that spawned catchphrases and an affectionate fan following on both sides of the Atlantic.",
  "Wayne’s World|1992|Penelope Spheeris|Two metalhead friends with a cable access show get a shot at the big time.|It turned a sketch into a cultural moment, and its air drumming and catchphrases are still quoted.",
  "Tampopo|1985|Juzo Itami|A truck driver helps a widow perfect the recipe for her struggling ramen shop, in a comedy about food and appetite.|Dubbed a ramen western, it is adored by food lovers who find it funny, tender and impossible to watch without getting hungry.",
  "Akira|1988|Katsuhiro Otomo|After a biker gang member gains terrifying powers in the neon sprawl of neo-Tokyo, his friend tries to stop him.|A landmark of anime that opened the genre to audiences in the West, and still dazzles with its detailed animation.",
  "Ghost in the Shell|1995|Mamoru Oshii|In a future where people can swap bodies for machines, a cyborg agent hunts a mysterious hacker.|A thoughtful, beautiful anime that influenced a generation of filmmakers, including those behind The Matrix.",
  "Perfect Blue|1997|Satoshi Kon|A pop idol who becomes an actress is haunted by a stalker while the lines between reality and performance begin to blur.|A psychological thriller in animated form, it is praised for its daring editing and its influence on later films.",
  "Kung Fu Hustle|2004|Stephen Chow|A wannabe gangster in 1940s Shanghai stumbles into a slum protected by hidden kung fu masters.|A joyful blend of slapstick and martial arts spectacle, cherished for its inventiveness and sheer energy.",
  "Run Lola Run|1998|Tom Tykwer|Lola has twenty minutes to find a hundred thousand marks to save her boyfriend, and we see three different versions of what happens.|Fast, stylish and full of throbbing techno, it became a breakout hit for German cinema and a favourite of film clubs.",
  "The City of Lost Children|1995|Jean-Pierre Jeunet and Marc Caro|A circus strongman searches for his kidnapped little brother in a surreal port city where a scientist steals children’s dreams.|A wonderfully strange fairy tale with a unique visual style, loved for its imagination.",
  "Best in Show|2000|Christopher Guest|A handful of eccentric owners and their dogs compete at a prestigious dog show.|Improvised, affectionate and endlessly rewatchable, it is a mockumentary that dog lovers cherish.",
  "A Mighty Wind|2003|Christopher Guest|Folk singers reunite for a memorial concert in a gentle comic look at the world of folk music.|Another Christopher Guest mockumentary, with songs good enough to stand on their own.",
  "Zoolander|2001|Ben Stiller|A dim-witted male model is brainwashed into becoming an assassin in a plot against a foreign leader.|A flop that grew into a quotable favourite, with a dedicated following and countless imitations of its signature look.",
  "Anchorman: The Legend of Ron Burgundy|2004|Adam McKay|A swaggering 1970s San Diego newsman sees his world upended when a woman joins the team.|A modest hit that became a phenomenon, its absurd lines are quoted constantly.",
  "Hot Fuzz|2007|Edgar Wright|A top London police officer is sent to a sleepy village where accidents are suspiciously frequent.|A very British action comedy, packed with jokes that reward a second and third viewing.",
  "Grosse Pointe Blank|1997|George Armitage|A hitman returns to his home town for his high school reunion while a rival closes in.|A smart, dark comedy with a great 1980s soundtrack that people continue to rediscover.",
  "Defending Your Life|1991|Albert Brooks|A man dies and arrives in a waiting-room afterlife where he must defend his life in a courtroom.|A gentle, funny film about fear and courage that has become a quiet favourite.",
  "Pi|1998|Darren Aronofsky|A reclusive mathematician becomes obsessed with finding a pattern in numbers, and attracts unwelcome attention.|Shot in grainy black and white for very little money, it was Aronofsky’s striking debut and a Sundance sensation.",
  "Primer|2004|Shane Carruth|Two engineers accidentally build something in a garage that changes how they think about time.|Made for a few thousand dollars, it is famous for being so intricate that fans create flow charts to follow it.",
  "Moon|2009|Duncan Jones|A lone astronaut nearing the end of a three-year shift on a lunar base begins to suspect he is not alone.|A quiet, clever sci-fi film that Sam Rockwell carries almost entirely by himself, loved for its ideas.",
  "Dark City|1998|Alex Proyas|A man wakes with no memory in a city where it is always night and strangers can change reality.|A moody sci-fi noir that predated The Matrix, it has built up a devoted following.",
  "Tron|1982|Steven Lisberger|A computer programmer is pulled inside a digital world where programs fight in gladiatorial games.|A pioneer of computer imagery, with a look that was like nothing else at the time.",
  "Flash Gordon|1980|Mike Hodges|A football star and a journalist are swept into space to save Earth from the villainous Ming the Merciless.|Gloriously camp, with a thundering score by Queen, it is a beloved so-bad-it-is-brilliant adventure.",
  "Escape from New York|1981|John Carpenter|In a future where Manhattan is a prison island, a hardened ex-soldier has a day to rescue the President.|A gritty, stylish action film that made Snake Plissken a hero for cult cinema fans.",
  "They Live|1988|John Carpenter|A drifter finds a pair of sunglasses that reveal aliens controlling society through advertising and the media.|Part action film, part satire of consumer culture, it has become more talked about with every passing decade.",
  "The Thing|1982|John Carpenter|Researchers in Antarctica encounter a shape-shifting alien that can imitate any living thing.|A box office disappointment that is now regarded as one of the greatest horror films ever made.",
  "Night of the Living Dead|1968|George A. Romero|A group of strangers barricade themselves in a farmhouse as the recently dead begin to rise.|Made on a tiny budget, it created the modern zombie film and became a midnight movie classic.",
  "Carnival of Souls|1962|Herk Harvey|A woman who survives a car accident is haunted by a ghostly figure and drawn to an abandoned carnival.|A low-budget eerie chiller, ignored at first, that went on to influence generations of horror filmmakers.",
  "Plan 9 from Outer Space|1959|Ed Wood|Aliens raise the dead to stop humans from building a doomsday weapon.|Often called the worst film ever made, it is loved for its wobbly sets, odd dialogue and cheerful sincerity.",
  "The Blues Brothers|1980|John Landis|Two brothers put their band back together to raise money for the orphanage where they grew up.|A chaotic mix of music, car chases and cameos from legends of soul and blues that has filled cinemas for decades.",
  "Caddyshack|1980|Harold Ramis|The staff and members of a snobbish golf club clash, and a rogue gopher causes mayhem.|A loose, anarchic comedy that became a favourite on video and a source of endless quotes.",
  "Airplane!|1980|Jim Abrahams, David Zucker and Jerry Zucker|A nervous former pilot must land a plane when the crew falls ill.|A relentless barrage of gags that changed the shape of film comedy.",
  "Spaceballs|1987|Mel Brooks|A parody of space adventures in which a hapless crew try to save a princess from an evil, air-sucking planet.|Silly, quotable and affectionate, it found its audience on television and video.",
  "Young Frankenstein|1974|Mel Brooks|A doctor inherits his grandfather’s castle and finds he cannot resist the family experiments.|Shot in black and white as a tribute to classic horror, it is a warm and very funny favourite.",
  "Being There|1979|Hal Ashby|A simple gardener who knows only what he has seen on television becomes an unlikely adviser to the powerful.|Peter Sellers’ gentle, deadpan final great role, it is praised for its quiet wit and warmth.",
  "Ed Wood|1994|Tim Burton|The story of the endearingly hopeless film-maker Ed Wood and his band of misfit collaborators.|A black-and-white love letter to people who make things with more enthusiasm than skill, that fans of cult cinema adore.",
  "Pump Up the Volume|1990|Allan Moyle|A shy teenager runs a pirate radio show from his bedroom and becomes a voice for his lonely classmates.|A teen classic with a great soundtrack that spoke to a generation of misfits.",
  "Empire Records|1995|Allan Moyle|One day in the life of the staff at an independent record store that is about to be sold to a chain.|A flop that became a cult comfort film, thanks to its soundtrack and its ensemble cast.",
  "High Fidelity|2000|Stephen Frears|A record shop owner revisits his top five break-ups in a bid to understand why love keeps going wrong.|Funny and music-obsessed, it speaks to anyone who has ever made a list in order to feel in control.",
  "Clerks|1994|Kevin Smith|A day in the lives of two bored convenience store workers, who argue about movies and life.|Shot for a few thousand dollars in black and white, it launched Kevin Smith and the independent film boom of the 1990s.",
  "Sneakers|1992|Phil Alden Robinson|A team of security experts who test the defences of companies are blackmailed into stealing a mysterious box.|A smart, witty heist film that has become a beloved favourite among those who find it on TV.",
  "WarGames|1983|John Badham|A teenage hacker accidentally connects to a military computer and nearly starts a nuclear war.|A tense and thoughtful thriller that shaped how a generation saw computers.",
  "Real Genius|1985|Martha Coolidge|Gifted students at a university discover that their laser project is being used for a weapon.|A cheerful nerd comedy loved for its jokes and its warmth, with a final scene that fans never forget.",
  "Weird Science|1985|John Hughes|Two teenage boys create their dream woman on a computer and get more than they bargained for.|A silly and sweet John Hughes comedy which became a defining film for 1980s teenagers.",
  "The Last Dragon|1985|Michael Schultz|A young martial artist in New York searches for the final level of mastery and ends up fighting a villain.|A cheerful mix of kung fu, music and comedy that fans adore for its pure fun.",
  "Tremors|1990|Ron Underwood|Two handymen in a remote Nevada town find themselves battling giant creatures that burst up from the ground.|A funny, scary B-movie that bombed in cinemas, then became one of the great cult hits of home video.",
  "Gremlins|1984|Joe Dante|A boy is given a strange pet with three rules, and when the rules are broken, chaos descends on his small town.|A cheeky mix of festive cheer and horror that has become a Christmas tradition for fans.",
].map((line) => {
  const [title, year, director, synopsis, why] = line.split("|");
  return { title, year, director, synopsis, why };
});

async function filmRating(f) {
  const key = process.env.OMDB_API_KEY;
  if (!key) return null;
  try {
    const d = await get("https://www.omdbapi.com/?t=" + encodeURIComponent(f.title) + "&y=" + f.year + "&apikey=" + key);
    return d && d.imdbRating && d.imdbRating !== "N/A" ? d.imdbRating : null;
  } catch (e) {
    return null;
  }
}

async function filmWhere(f) {
  const token = process.env.TMDB_TOKEN;
  if (!token) return null;
  try {
    const headers = { Authorization: "Bearer " + token, Accept: "application/json", "User-Agent": UA };
    const sres = await fetch("https://api.themoviedb.org/3/search/movie?query=" + encodeURIComponent(f.title) + "&year=" + f.year, { headers, signal: AbortSignal.timeout(9000), cache: "no-store" });
    const found = (await sres.json()).results || [];
    if (!found.length) return null;
    const pres = await fetch("https://api.themoviedb.org/3/movie/" + found[0].id + "/watch/providers", { headers, signal: AbortSignal.timeout(9000), cache: "no-store" });
    const gb = ((await pres.json()).results || {}).GB;
    if (!gb) return null;
    const names = (list) => (list || []).map((p) => p.provider_name).slice(0, 6).join(", ");
    const bits = [];
    if (names(gb.flatrate)) bits.push("Streaming on " + names(gb.flatrate));
    if (names(gb.rent)) bits.push("To rent: " + names(gb.rent));
    if (names(gb.buy) && !names(gb.rent)) bits.push("To buy: " + names(gb.buy));
    return bits.length ? bits.join(". ") + "." : null;
  } catch (e) {
    return null;
  }
}

function sectionsOf(text) {
  const secs = {};
  let cur = "intro";
  secs[cur] = [];
  for (const raw of text.split(/\n/)) {
    const h = raw.match(/^=+\s*(.*?)\s*=+$/);
    if (h) {
      cur = h[1].toLowerCase();
      secs[cur] = secs[cur] || [];
    } else if (raw.trim()) {
      secs[cur].push(raw.trim());
    }
  }
  return secs;
}

function findSection(secs, names) {
  for (const n of names) {
    const k = Object.keys(secs).find((key) => key === n) || Object.keys(secs).find((key) => key.includes(n));
    if (k && secs[k].length) return secs[k];
  }
  return null;
}

function clipParas(lines, max) {
  const out = [];
  let total = 0;
  for (const l of lines) {
    if (total + l.length > max) break;
    out.push(l);
    total += l.length;
  }
  if (!out.length && lines.length) out.push(lines[0].slice(0, max));
  return out;
}

async function filmWiki(f) {
  try {
    const sr = await get("https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=1&srsearch=" + encodeURIComponent(f.title + " " + f.year + " film"));
    const t = sr && sr.query && sr.query.search && sr.query.search[0] && sr.query.search[0].title;
    if (!t) return null;
    const data = await get("https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&format=json&titles=" + encodeURIComponent(t));
    const page = Object.values((data && data.query && data.query.pages) || {})[0];
    const text = page && page.extract;
    if (!text || !text.includes(String(f.year))) return null;
    const secs = sectionsOf(text);
    const plot = findSection(secs, ["plot", "synopsis"]);
    const cast = findSection(secs, ["cast"]);
    const rec = findSection(secs, ["cult following", "cult status", "legacy", "critical reception", "reception"]);
    return {
      plot: plot ? clipParas(plot, 2400) : [],
      cast: cast ? cast.slice(0, 10).map((c) => c.slice(0, 150)) : [],
      reception: rec ? clipParas(rec, 1500) : [],
      title: t,
    };
  } catch (e) {
    return null;
  }
}

export async function filmStack(dateStr) {
  const f = CULT_FILMS[dayOfYear(dateStr) % CULT_FILMS.length];
  const [rating, where, wiki] = await Promise.all([filmRating(f), filmWhere(f), filmWiki(f)]);
  const h3 = (t) => "<h3>" + t + "</h3>";
  const paras = (arr) => arr.map((p) => "<p>" + esc(p) + "</p>").join("");
  let html =
    "<h2 style=\"font-size:1.8em;margin-bottom:0;\">" + esc(f.title) + " (" + esc(f.year) + ")</h2>" +
    "<p><em>Directed by " + esc(f.director) + "</em></p>" +
    h3("The story") + "<p>" + esc(f.synopsis) + "</p>";
  if (wiki && wiki.cast.length) html += h3("Starring") + "<ul>" + wiki.cast.map((c) => "<li>" + esc(c) + "</li>").join("") + "</ul>";
  html += h3("Why it is a cult classic") + "<p>" + esc(f.why) + "</p>";
  if (wiki && wiki.reception.length) html += h3("How it was received") + paras(wiki.reception);
  if (rating) html += h3("IMDb rating") + "<p>" + esc(rating) + " out of 10</p>";
  html += h3("Where to watch") + "<p>" + (where ? esc(where) : "Search the title on JustWatch to see where it is streaming near you.") + "</p>";
  if (wiki && wiki.plot.length) html += "<div style=\"page-break-before:always;\"></div>" + h3("The full plot (spoilers ahead)") + paras(wiki.plot);
  const credits = [];
  if (wiki) credits.push("Cast, reception and plot from Wikipedia, licensed CC BY-SA 4.0.");
  if (rating) credits.push("Ratings from IMDb via OMDb.");
  if (where) credits.push("Streaming data from JustWatch via TMDB. Availability changes often.");
  if (credits.length) html += "<p style=\"font-size:0.8em;margin-top:2em;\">" + esc(credits.join(" ")) + "</p>";
  return { title: "Cult film of the day: " + f.title, html };
}

// ---- Nature note (Wikipedia, CC BY-SA) ----
const NATURE = ["European robin","Eurasian blue tit","European hedgehog","Red fox","Barn owl","English oak","Common hawthorn","Red admiral","European badger","Common kingfisher","Common frog","Buff-tailed bumblebee","Silver birch","Common blackbird","Eurasian wren","Red squirrel","Common swift","Eurasian otter","Common holly","Hedera helix","Common starling","Song thrush","Peacock butterfly","Common pipistrelle","Eurasian jay","Snowdrop","Primula vulgaris","Foxglove","European beech","Rowan","Mallard","Mute swan","Grey heron","Great tit","House sparrow","European goldfinch","Common wood pigeon","Eurasian magpie","Common buzzard","Peregrine falcon","Eurasian skylark","Atlantic puffin","Grey seal","Red deer","Common toad","Slow worm","Seven-spot ladybird","Stag beetle","Common daisy","Dandelion"];
export async function natureStack(dateStr) {
  const n = dayOfYear(dateStr);
  const title = NATURE[n % NATURE.length];
  const data = await get("https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&format=json&titles=" + encodeURIComponent(title));
  const page = Object.values(data?.query?.pages || {})[0];
  if (!page?.extract) throw new Error("No nature text");
  const lines = page.extract.split(String.fromCharCode(10)).filter(Boolean);
  const keep = [];
  let len = 0;
  for (const l of lines) { if (len > 3000) break; keep.push(l); len += l.length; }
  const html = plainToHtml(keep.join(String.fromCharCode(10))) + "<p><em>Today, see if you can spot one, or something like it, on your travels.</em></p>" + "<p><small>Source: Wikipedia, licensed CC BY-SA 4.0.</small></p>";
  return { title: "Nature note: " + (page.title || title), html };
}

// ---- Walk prompt ----
const WALKS = ["Walk with no destination. Turn left, then right, then left again, and see where you end up.","Spot five different shades of green on your walk.","Count how many different doors you pass. Which one would you most like to knock on?","Walk a route you have never taken, even if it only changes one street.","Listen for three separate sounds you normally tune out.","Look up. What is on the rooftops and in the trees that you have never noticed?","Find something small and beautiful on the ground, and leave it where it is.","Walk slowly enough that you notice your own footsteps.","Say hello to one person or one dog you pass.","Notice every colour that is red. Count them.","Take a photo of one thing that makes you smile, then keep walking.","Follow the sun, or the shade, for a whole street.","Notice the smells today. Bread, rain, leaves, woodsmoke?","Walk without your phone in your hand.","Find a bench you have never sat on, and sit for two minutes.","Look for the oldest thing you can see on your route.","Pay attention to the sky for the whole walk. What is it doing?","Pick a letter and find something beginning with it on every street.","Walk to somewhere you can see water, even a puddle.","Notice which windows have lights on, and imagine one small story behind each.","Walk like you are late for nothing at all.","Look for patterns: bricks, railings, leaves, cracks in the pavement.","Stop at the highest point you can reach and take three slow breaths.","Notice the weather on your face rather than complaining about it."];
export async function walkStack(dateStr) {
  const n = dayOfYear(dateStr);
  const html = "<p style=\"font-size:1.3em;line-height:1.6;\">" + esc(WALKS[n % WALKS.length]) + "</p>" + "<p>Go for ten minutes, or an hour. Then jot down what you noticed.</p>" + "<p>______________________________________</p>" + "<p>______________________________________</p>" + "<p>______________________________________</p>";
  return { title: "A walk for today", html };
}

// ---- Recipe (TheMealDB) ----
export async function recipeStack(dateStr) {
  const data = await get("https://www.themealdb.com/api/json/v1/1/random.php");
  const m = data?.meals?.[0];
  if (!m) throw new Error("No recipe returned");
  const ing = [];
  for (let i = 1; i <= 20; i++) {
    const a = (m["strIngredient" + i] || "").trim();
    if (a) ing.push("<li>" + esc(((m["strMeasure" + i] || "").trim() + " " + a).trim()) + "</li>");
  }
  const steps = (m.strInstructions || "").split(String.fromCharCode(10)).map((x) => x.trim()).filter((x) => x.length > 2);
  const html = "<p><em>" + esc(m.strCategory || "") + (m.strArea ? ", " + esc(m.strArea) : "") + "</em></p>" + "<h3>Ingredients</h3><ul>" + ing.join("") + "</ul>" + "<h3>Method</h3>" + steps.map((x) => "<p>" + esc(x) + "</p>").join("") + "<p><small>Source: TheMealDB (themealdb.com)</small></p>";
  return { title: "Recipe: " + m.strMeal, html };
}
