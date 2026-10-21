// Client-safe: no server imports here.
export const STACKS = [
  {
    key: "sudoku",
    kind: "puzzle",
    label: "Sudoku Stack",
    emoji: "🧩",
    tagline: "Your morning puzzle",
    blurb: "A fresh sudoku each day, answers on the last page. Best on a Kobo or iPad you can write on.",
  },
  {
    key: "word",
    kind: "reading",
    label: "Word Stack",
    emoji: "📖",
    tagline: "A new word with your tea",
    blurb: "A word a day, what it means and where it came from.",
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
    blurb: "A few things that happened on today's date.",
  },
  {
    key: "poem",
    kind: "reading",
    label: "Poem Stack",
    emoji: "🪶",
    tagline: "A poem to start the day",
    blurb: "One poem, short enough to read before the kettle has boiled.",
  },
  {
    key: "stoic",
    kind: "reading",
    label: "Calm Stack",
    emoji: "🍵",
    tagline: "A moment of calm",
    blurb: "Something Stoic for people who try to take on all the world's problems.",
  },
  {
    key: "fact",
    kind: "reading",
    label: "Fact Stack",
    emoji: "💡",
    tagline: "Something to tell someone",
    blurb: "One surprising fact, for dropping into conversation.",
  },
  {
    key: "news",
    kind: "reading",
    label: "News Stack",
    emoji: "📰",
    tagline: "What the world is up to",
    blurb: "The day's main stories, one per page, with a bit of background.",
  },
  {
    key: "journal",
    kind: "reading",
    label: "Journal Stack",
    emoji: "✏️",
    tagline: "Stuck for what to write?",
    blurb: "A prompt for the day with lined space to write your answer.",
  },
  {
    key: "mushroom",
    kind: "reading",
    label: "Mushroom Stack",
    emoji: "🍄",
    tagline: "A little fungus for your morning",
    blurb: "One mushroom or fungus a day, told simply. Entirely unnecessary, and everyone loves it.",
  },
  {
    key: "recipe",
    kind: "reading",
    label: "Recipe Stack",
    emoji: "🍲",
    tagline: "Something to cook tonight",
    blurb: "One recipe a day, ingredients and method, for when you cannot think what is for dinner.",
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
    blurb: "A small prompt to take outside, with lines to jot down what you spotted.",
  },
  {
    key: "film",
    kind: "reading",
    label: "Cult Film Stack",
    emoji: "🎬",
    tagline: "Tonight's film, sorted",
    blurb: "A cult classic a day: the story, why people love it, its IMDb rating and where to watch it.",
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
