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
    `<p><em>Stuck? ${esc(nudge)}</em></p>` +
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

export async function filmStack(dateStr) {
  const f = CULT_FILMS[dayOfYear(dateStr) % CULT_FILMS.length];
  const [rating, where] = await Promise.all([filmRating(f), filmWhere(f)]);
  const html =
    "<h2 style=\"font-size:1.8em;margin-bottom:0;\">" + esc(f.title) + " (" + esc(f.year) + ")</h2>" +
    "<p><em>Directed by " + esc(f.director) + "</em></p>" +
    "<h3>The story</h3><p>" + esc(f.synopsis) + "</p>" +
    "<h3>Why it is a cult classic</h3><p>" + esc(f.why) + "</p>" +
    (rating ? "<h3>IMDb rating</h3><p>" + esc(rating) + " out of 10</p>" : "") +
    "<h3>Where to watch</h3><p>" + (where ? esc(where) : "Search the title on JustWatch to see where it is streaming near you.") + "</p>" +
    "<p style=\"font-size:0.8em;margin-top:2em;\">" + (rating ? "Ratings from IMDb via OMDb. " : "") + (where ? "Streaming data from JustWatch via TMDB. Availability changes often." : "") + "</p>";
  return { title: "Cult film of the day: " + f.title, html };
}
