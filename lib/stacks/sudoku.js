import { seededRandom } from "./rng";

const CLUES = { easy: 40, medium: 32, hard: 26 };

function shuffle(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function popcount(m) {
  let n = 0;
  while (m) {
    m &= m - 1;
    n++;
  }
  return n;
}

function candidates(g, idx) {
  const r = Math.floor(idx / 9);
  const c = idx % 9;
  let used = 0;
  for (let i = 0; i < 9; i++) {
    used |= 1 << g[r * 9 + i];
    used |= 1 << g[i * 9 + c];
  }
  const br = r - (r % 3);
  const bc = c - (c % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) used |= 1 << g[(br + i) * 9 + bc + j];
  }
  return ~used & 0x3fe;
}

function pickCell(g) {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (g[i] === 0) {
      const m = candidates(g, i);
      const n = popcount(m);
      if (n < bestCount) {
        best = i;
        bestMask = m;
        bestCount = n;
        if (n <= 1) break;
      }
    }
  }
  return { best, bestMask, bestCount };
}

function digitsOf(mask) {
  const out = [];
  for (let d = 1; d <= 9; d++) if (mask & (1 << d)) out.push(d);
  return out;
}

// Fill an empty grid with a random complete solution.
function fill(g, rnd) {
  const { best, bestMask, bestCount } = pickCell(g);
  if (best === -1) return true;
  if (bestCount === 0) return false;
  for (const d of shuffle(digitsOf(bestMask), rnd)) {
    g[best] = d;
    if (fill(g, rnd)) return true;
  }
  g[best] = 0;
  return false;
}

// Count solutions, stopping at limit.
function count(g, limit) {
  const { best, bestMask, bestCount } = pickCell(g);
  if (best === -1) return 1;
  if (bestCount === 0) return 0;
  let total = 0;
  for (const d of digitsOf(bestMask)) {
    g[best] = d;
    total += count(g, limit - total);
    g[best] = 0;
    if (total >= limit) break;
  }
  return total;
}

export function generateSudoku(difficulty, seed) {
  const rnd = seededRandom(`${seed}:${difficulty}`);
  const solution = new Array(81).fill(0);
  fill(solution, rnd);
  const puzzle = solution.slice();
  const target = CLUES[difficulty] || CLUES.medium;
  const order = shuffle([...Array(81).keys()], rnd);
  let clues = 81;
  for (const idx of order) {
    if (clues <= target) break;
    const keep = puzzle[idx];
    puzzle[idx] = 0;
    if (count(puzzle.slice(), 2) !== 1) puzzle[idx] = keep;
    else clues--;
  }
  return { puzzle, solution, clues };
}

function gridHtml(g, highlight) {
  let html =
    '<table style="border-collapse:collapse;margin:1em auto;">';
  for (let r = 0; r < 9; r++) {
    html += "<tr>";
    for (let c = 0; c < 9; c++) {
      const v = g[r * 9 + c];
      const given = highlight ? highlight[r * 9 + c] !== 0 : v !== 0;
      const style =
        "width:2em;height:2em;text-align:center;vertical-align:middle;font-size:1.3em;" +
        `font-weight:${given ? "bold" : "normal"};` +
        `border-top:${r % 3 === 0 ? 3 : 1}px solid #000;` +
        `border-left:${c % 3 === 0 ? 3 : 1}px solid #000;` +
        `border-right:${c === 8 ? 3 : 1}px solid #000;` +
        `border-bottom:${r === 8 ? 3 : 1}px solid #000;`;
      html += `<td style="${style}">${v ? v : "&#160;"}</td>`;
    }
    html += "</tr>";
  }
  return html + "</table>";
}

export function difficultyForDate(pref, dateStr) {
  if (pref === "easy" || pref === "medium" || pref === "hard") return pref;
  // "ramp": easier early in the week, harder at the weekend
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  if (day === 1 || day === 2) return "easy";
  if (day === 6 || day === 0) return "hard";
  return "medium";
}

export function sudokuStack(pref, dateStr) {
  const difficulty = difficultyForDate(pref, dateStr);
  const { puzzle, solution } = generateSudoku(difficulty, dateStr);
  const label = difficulty[0].toUpperCase() + difficulty.slice(1);
  const html =
    `<p style="text-align:center;"><em>${label} puzzle for ${dateStr}. Fill every row, column and 3x3 box with the digits 1 to 9.</em></p>` +
    gridHtml(puzzle) +
    '<p style="text-align:center;font-size:0.9em;">The solution is on the next page. No peeking.</p>' +
    '<div style="page-break-before:always;"></div>' +
    "<h2>Solution</h2>" +
    gridHtml(solution, puzzle);
  return { title: `Sudoku (${label})`, html };
}
