// Client-safe: no server imports here.
export const STACKS = [
  {
    key: "sudoku",
    kind: "puzzle",
    label: "Sudoku Stack",
    emoji: "🧩",
    tagline: "Your morning puzzle",
    blurb: "A fresh sudoku every day, with the answers tucked away on the last page. Made for Kobos you can write on.",
  },
  {
    key: "word",
    kind: "reading",
    label: "Word Stack",
    emoji: "📖",
    tagline: "A new word with your tea",
    blurb: "The word of the day, with its meaning and a little story.",
  },
  {
    key: "wikipedia",
    kind: "reading",
    label: "Wikipedia Stack",
    emoji: "🌍",
    tagline: "Today's best read",
    blurb: "Wikipedia's featured article, picked out for you each morning.",
  },
  {
    key: "onthisday",
    kind: "reading",
    label: "History Stack",
    emoji: "🕰️",
    tagline: "On this very day",
    blurb: "A handful of moments from history, all dated today.",
  },
  {
    key: "poem",
    kind: "reading",
    label: "Poem Stack",
    emoji: "🪶",
    tagline: "A poem to start the day",
    blurb: "One public domain poem, short enough to read while the kettle boils.",
  },
  {
    key: "stoic",
    kind: "reading",
    label: "Calm Stack",
    emoji: "🍵",
    tagline: "A moment of calm",
    blurb: "A short Stoic passage and a gentle thought to sit with.",
  },
  {
    key: "fact",
    kind: "reading",
    label: "Fact Stack",
    emoji: "💡",
    tagline: "Something to tell someone",
    blurb: "One surprising fact for the day.",
  },
  {
    key: "news",
    kind: "reading",
    label: "News Stack",
    emoji: "📰",
    tagline: "What the world is up to",
    blurb: "The main stories of the day, each on its own page with a little background.",
  },
  {
    key: "journal",
    kind: "reading",
    label: "Journal Stack",
    emoji: "✏️",
    tagline: "Stuck for what to write?",
    blurb: "A gentle prompt for the day, with lined space to write your answer.",
  },
  {
    key: "mushroom",
    kind: "reading",
    label: "Mushroom Stack",
    emoji: "🍄",
    tagline: "A little fungus for your morning",
    blurb: "One mushroom or fungus a day, told simply and gently. A fun little extra.",
  },
  {
    key: "recipe",
    kind: "reading",
    label: "Recipe Stack",
    emoji: "🍲",
    tagline: "Something to cook tonight",
    blurb: "One recipe a day, with ingredients and method, for when you are stuck for dinner.",
  },
  {
    key: "nature",
    kind: "reading",
    label: "Nature Stack",
    emoji: "🌿",
    tagline: "A creature or plant to notice",
    blurb: "One bird, beast or bloom, with its story, to look out for today.",
  },
  {
    key: "walk",
    kind: "reading",
    label: "Walk Stack",
    emoji: "🚶",
    tagline: "A walk with a little nudge",
    blurb: "A small prompt to take outside with you, with lines to jot down what you noticed.",
  },
  {
    key: "film",
    kind: "reading",
    label: "Cult Film Stack",
    emoji: "🎬",
    tagline: "Tonight's film, sorted",
    blurb: "A cult classic a day: the story, why people love it, its IMDb rating and where to watch.",
  },
];

// ent = { pro: boolean, puzzles: boolean }
export function isEntitled(stack, ent) {
  return stack.kind === "puzzle" ? !!ent?.puzzles : !!ent?.pro;
}

// Everyone gets one taster stack of any kind. Everything the person has
// paid for is allowed on top of that.
export function allowedKeys(selectedKeys, ent) {
  const chosen = STACKS.filter((s) => selectedKeys.includes(s.key));
  const owned = chosen.filter((s) => isEntitled(s, ent));
  const locked = chosen.filter((s) => !isEntitled(s, ent));
  return [...owned, ...locked.slice(0, 1)].map((s) => s.key);
}
