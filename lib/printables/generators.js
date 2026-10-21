import { Pdf } from "./pdf";
import { seededRandom } from "../stacks/rng";
import { generateSudoku } from "../stacks/sudoku";
import { makeCrossword, KIDS_WORDS } from "./crossword";

const GREEN = "#17302a";
const RUST = "#b4532a";
const GREY = 0.55;
const PALE = "#f1d9c4";

const ECO =
  "Whilst we say printable, we care a lot about the planet. Please use a digital format and a stylus where you can.";

function pick(rnd, arr) {
  return arr[Math.floor(rnd() * arr.length)];
}

function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function footer(pdf) {
  pdf.text("Stackt  |  kostackt.com", 105, 286, { size: 8, font: "sans", align: "center", color: GREY });
  pdf.text(ECO, 105, 290.5, { size: 6.5, font: "italic", align: "center", color: GREY });
}

function header(pdf, title, subtitle, opts) {
  const o = opts || {};
  pdf.text(title, 20, 24, { size: 26, font: "serifBold", color: GREEN });
  if (subtitle) pdf.text(subtitle, 20, 32, { size: 11, font: "serifItalic", color: 0.3 });
  pdf.line(20, 36, 190, 36, { stroke: RUST, lw: 0.6 });
  if (o.name) {
    pdf.text("Name", 130, 24, { size: 10, color: 0.3 });
    pdf.line(145, 24.5, 190, 24.5, { stroke: 0.5, lw: 0.3 });
  }
  footer(pdf);
}

function fmtDate(seed) {
  const d = new Date(`${String(seed).slice(0, 10)}T00:00:00Z`);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

// ---------- shared drawing helpers ----------

function star(pdf, cx, cy, r, opts) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  pdf.poly(pts, true, opts);
}

function petalPath(cx, cy, a, r0, r1, w) {
  // lens-shaped petal from radius r0 to r1 along angle a
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const px = -sa;
  const py = ca;
  const bx = cx + r0 * ca;
  const by = cy + r0 * sa;
  const tx = cx + r1 * ca;
  const ty = cy + r1 * sa;
  const mx = cx + ((r0 + r1) / 2) * ca;
  const my = cy + ((r0 + r1) / 2) * sa;
  return [
    ["M", bx, by],
    ["C", mx + px * w, my + py * w, mx + px * w, my + py * w, tx, ty],
    ["C", mx - px * w, my - py * w, mx - px * w, my - py * w, bx, by],
    ["Z"],
  ];
}

const LINE = { stroke: 0, lw: 0.6 };
const THICK = { stroke: 0, lw: 1 };

// ---------- adult: sudoku ----------

function sudokuGrid(pdf, grid, givens, x0, y0, cell, solved) {
  for (let i = 0; i <= 9; i++) {
    const thick = i % 3 === 0;
    pdf.line(x0 + i * cell, y0, x0 + i * cell, y0 + 9 * cell, { stroke: 0, lw: thick ? 0.9 : 0.25 });
    pdf.line(x0, y0 + i * cell, x0 + 9 * cell, y0 + i * cell, { stroke: 0, lw: thick ? 0.9 : 0.25 });
  }
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r * 9 + c];
      if (!v) continue;
      const given = givens ? givens[r * 9 + c] !== 0 : true;
      pdf.text(String(v), x0 + c * cell + cell / 2, y0 + r * cell + cell * 0.7, {
        size: cell * 1.45,
        font: given ? "bold" : "sans",
        align: "center",
        color: solved && !given ? RUST : 0,
      });
    }
  }
}

function sudoku(seed, level) {
  const { puzzle, solution } = generateSudoku(level, seed);
  const pdf = new Pdf(`Sudoku (${level})`);
  pdf.addPage();
  header(pdf, "Sudoku", `${level[0].toUpperCase() + level.slice(1)} puzzle. ${fmtDate(seed)}`);
  sudokuGrid(pdf, puzzle, null, 33, 55, 16);
  pdf.text("Every row, column and 3x3 box holds the digits 1 to 9 once.", 105, 212, { size: 10, font: "serifItalic", align: "center", color: 0.3 });
  pdf.text("Solution overleaf. No peeking.", 105, 219, { size: 10, font: "serifItalic", align: "center", color: 0.3 });
  pdf.addPage();
  header(pdf, "Solution", `Sudoku (${level})`);
  sudokuGrid(pdf, solution, puzzle, 33, 55, 16, true);
  return pdf;
}

// ---------- word search ----------

const ADULT_THEMES = {
  "Autumn walk": ["CONKER", "BRACKEN", "HEDGEROW", "ACORN", "MUDDY", "WELLIES", "WOODSMOKE", "BONFIRE", "SCARF", "PUMPKIN", "HARVEST", "FOLIAGE", "BADGER", "TOADSTOOL"],
  "In the kitchen": ["WHISK", "SIMMER", "SAUCEPAN", "GARLIC", "CARDAMOM", "ROLLING", "GRATER", "SOURDOUGH", "CASSEROLE", "TEASPOON", "OVEN", "COLANDER", "PESTLE", "RAMEKIN"],
  "A good book": ["CHAPTER", "EPILOGUE", "PAPERBACK", "BOOKMARK", "PLOT", "NARRATOR", "LIBRARY", "SPINE", "PROLOGUE", "NOVELLA", "VERSE", "MEMOIR", "FOLIO", "ESSAY"],
  "By the sea": ["LIGHTHOUSE", "SHINGLE", "DRIFTWOOD", "TIDE", "HARBOUR", "GULL", "ANCHOR", "ESTUARY", "RAMBLE", "LOBSTER", "PROMENADE", "SAILING", "DUNES", "BREAKWATER"],
  "Cosy night in": ["BLANKET", "CANDLE", "COCOA", "SLIPPERS", "FIRESIDE", "JIGSAW", "CROSSWORD", "KETTLE", "BISCUIT", "RADIATOR", "PYJAMAS", "HOTWATER", "SOFA", "WOOLLEN"],
  "In the garden": ["TROWEL", "COMPOST", "SEEDLING", "LAVENDER", "PRUNING", "GREENHOUSE", "HOSEPIPE", "BLOSSOM", "MARIGOLD", "RAKE", "BORDER", "HEDGE", "POTTING", "WEEDING"],
  "London": ["THAMES", "PUTNEY", "OVERGROUND", "BUSKER", "MARKET", "CHIMNEY", "COBBLES", "EMBANKMENT", "TERRACE", "PIGEON", "ALLEYWAY", "TOWPATH", "RIVERSIDE", "BRIDGE"],
};

const KIDS_THEMES = {
  Animals: ["CAT", "DOG", "PIG", "HEN", "COW", "FOX", "OWL", "BEE"],
  Colours: ["RED", "BLUE", "PINK", "GOLD", "GREEN", "GREY", "TEAL", "LIME"],
  Fruit: ["PEAR", "PLUM", "LIME", "FIG", "KIWI", "DATE", "PEACH", "MANGO"],
  "At the park": ["SWING", "SLIDE", "BALL", "KITE", "DUCK", "TREE", "PUDDLE", "BENCH"],
  Weather: ["SUN", "RAIN", "WIND", "SNOW", "FOG", "STORM", "CLOUD", "HAIL"],
};

function buildWordGrid(words, size, rnd, dirs) {
  const grid = Array.from({ length: size }, () => Array(size).fill(""));
  const placed = [];
  for (const word of words) {
    let ok = false;
    for (let tries = 0; tries < 300 && !ok; tries++) {
      const [dx, dy] = pick(rnd, dirs);
      const sx = Math.floor(rnd() * size);
      const sy = Math.floor(rnd() * size);
      const ex = sx + dx * (word.length - 1);
      const ey = sy + dy * (word.length - 1);
      if (ex < 0 || ex >= size || ey < 0 || ey >= size) continue;
      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const ch = grid[sy + dy * i][sx + dx * i];
        if (ch !== "" && ch !== word[i]) {
          fits = false;
          break;
        }
      }
      if (!fits) continue;
      for (let i = 0; i < word.length; i++) grid[sy + dy * i][sx + dx * i] = word[i];
      placed.push({ word, sx, sy, ex, ey });
      ok = true;
    }
  }
  const letters = "ABCDEFGHIJKLMNOPRSTUW";
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!grid[y][x]) grid[y][x] = letters[Math.floor(rnd() * letters.length)];
  return { grid, placed };
}

function wordSearch(seed, kids) {
  const rnd = seededRandom(`${seed}:ws:${kids ? "k" : "a"}`);
  const themes = kids ? KIDS_THEMES : ADULT_THEMES;
  const name = pick(rnd, Object.keys(themes));
  const count = kids ? 8 : 14;
  const words = shuffle(themes[name], rnd).slice(0, count);
  const size = kids ? 10 : 15;
  const dirs = kids
    ? [[1, 0], [0, 1]]
    : [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [1, -1], [-1, -1], [-1, 1]];
  const { grid, placed } = buildWordGrid(words, size, rnd, dirs);
  const cell = (kids ? 150 : 150) / size;
  const x0 = (210 - cell * size) / 2;
  const y0 = 46;
  const pdf = new Pdf(kids ? "Kids word search" : "Word search");
  pdf.addPage();
  header(pdf, kids ? "Word Search" : "Word Search", kids ? `Find the ${name.toLowerCase()} words!` : `${name}. ${fmtDate(seed)}`, { name: kids });
  const drawGrid = (hl) => {
    if (hl) {
      for (const p of placed) {
        pdf.line(x0 + (p.sx + 0.5) * cell, y0 + (p.sy + 0.5) * cell, x0 + (p.ex + 0.5) * cell, y0 + (p.ey + 0.5) * cell, { stroke: PALE, lw: cell * 0.78 });
      }
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        pdf.text(grid[y][x], x0 + (x + 0.5) * cell, y0 + (y + 0.5) * cell + cell * 0.22, {
          size: cell * (kids ? 2.1 : 2.2),
          font: kids ? "bold" : "sans",
          align: "center",
        });
      }
    }
  };
  drawGrid(false);
  const listY = y0 + cell * size + 14;
  pdf.text("Find these words", 20, listY, { size: 11, font: "serifBold", color: GREEN });
  const sorted = words.slice().sort();
  const cols = kids ? 4 : 5;
  sorted.forEach((w, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    pdf.text(w, 20 + col * (170 / cols), listY + 8 + row * 7, { size: kids ? 12 : 10.5, font: kids ? "bold" : "sans" });
  });
  pdf.addPage();
  header(pdf, "Answers", name);
  drawGrid(true);
  return pdf;
}

// ---------- mazes ----------

function makeMaze(w, h, rnd) {
  // walls bits: 1=N 2=E 4=S 8=W
  const walls = new Array(w * h).fill(15);
  const seen = new Array(w * h).fill(false);
  const stack = [0];
  seen[0] = true;
  const parent = new Array(w * h).fill(-1);
  const D = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cx = cur % w;
    const cy = Math.floor(cur / w);
    const opts = D.filter(([dx, dy]) => {
      const nx = cx + dx;
      const ny = cy + dy;
      return nx >= 0 && nx < w && ny >= 0 && ny < h && !seen[ny * w + nx];
    });
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const [dx, dy, bit, opp] = pick(rnd, opts);
    const nxt = (cy + dy) * w + cx + dx;
    walls[cur] &= ~bit;
    walls[nxt] &= ~opp;
    seen[nxt] = true;
    parent[nxt] = cur;
    stack.push(nxt);
  }
  // path from 0 to end via parents (tree rooted at 0)
  const end = w * h - 1;
  const path = [];
  for (let c = end; c !== -1; c = parent[c]) path.push(c);
  path.reverse();
  return { walls, path };
}

function drawMaze(pdf, m, w, h, x0, y0, cell, lw, showPath) {
  const L = { stroke: 0, lw };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wl = m.walls[y * w + x];
      const px = x0 + x * cell;
      const py = y0 + y * cell;
      if (wl & 1 && !(x === 0 && y === 0)) pdf.line(px, py, px + cell, py, L);
      if (wl & 8) pdf.line(px, py, px, py + cell, L);
      if (x === w - 1 && wl & 2) pdf.line(px + cell, py, px + cell, py + cell, L);
      if (y === h - 1 && wl & 4 && x !== w - 1) pdf.line(px, py + cell, px + cell, py + cell, L);
    }
  }
  if (showPath) {
    const pts = m.path.map((c) => [x0 + ((c % w) + 0.5) * cell, y0 + (Math.floor(c / w) + 0.5) * cell]);
    pts.unshift([pts[0][0], y0 - cell * 0.5]);
    pts.push([pts[pts.length - 1][0], y0 + h * cell + cell * 0.5]);
    pdf.poly(pts, false, { stroke: RUST, lw: Math.max(0.8, cell * 0.25) });
  }
}

function maze(seed, kids) {
  const rnd = seededRandom(`${seed}:maze:${kids ? "k" : "a"}`);
  const w = kids ? 11 : 30;
  const h = kids ? 15 : 40;
  const m = makeMaze(w, h, rnd);
  const cell = kids ? Math.min(160 / w, 190 / h) : Math.min(170 / w, 205 / h);
  const x0 = (210 - cell * w) / 2;
  const y0 = kids ? 50 : 46;
  const pdf = new Pdf(kids ? "Kids maze" : "Maze");
  pdf.addPage();
  header(pdf, "Maze", kids ? "Help the little explorer find the way out!" : fmtDate(seed), { name: kids });
  drawMaze(pdf, m, w, h, x0, y0, cell, kids ? 1.1 : 0.5, false);
  pdf.text("START", x0 + cell / 2, y0 - 2, { size: 8, font: "bold", align: "center", color: RUST });
  pdf.text("FINISH", x0 + (w - 0.5) * cell, y0 + h * cell + 5, { size: 8, font: "bold", align: "center", color: RUST });
  // gap in the bottom wall for the exit
  pdf.addPage();
  header(pdf, "Answer", "The way through");
  drawMaze(pdf, m, w, h, x0, y0, cell, kids ? 1.1 : 0.5, true);
  return pdf;
}

// ---------- dot to dot ----------

function subdivide(verts, step) {
  const out = [];
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.round(len / step));
    for (let j = 0; j < k; j++) out.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
  }
  return out;
}

const SHAPES = {
  heart() {
    const pts = [];
    const N = 32;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      pts.push([16 * Math.pow(Math.sin(t), 3), -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
    }
    return pts;
  },
  star() {
    const v = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 10 : 4.2;
      v.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return subdivide(v, 4.6);
  },
  house() {
    const v = [[0, 10], [0, 4], [5, 0], [10, 4], [10, 10], [6.5, 10], [6.5, 6], [3.5, 6], [3.5, 10]];
    return subdivide(v, 1.9);
  },
};

function dotToDot(seed) {
  const rnd = seededRandom(`${seed}:dots`);
  const name = pick(rnd, Object.keys(SHAPES));
  const pts = SHAPES[name]();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const s = Math.min(140 / (maxX - minX), 160 / (maxY - minY));
  const cx = 105 - ((minX + maxX) / 2) * s;
  const cy = 155 - ((minY + maxY) / 2) * s;
  const P = pts.map((p) => [cx + p[0] * s, cy + p[1] * s]);
  const mx = P.reduce((a, p) => a + p[0], 0) / P.length;
  const my = P.reduce((a, p) => a + p[1], 0) / P.length;
  const pdf = new Pdf("Dot to dot");
  pdf.addPage();
  header(pdf, "Dot to Dot", "Join the dots in order, from 1. What can you see?", { name: true });
  P.forEach((p, i) => {
    pdf.circle(p[0], p[1], 1.2, { stroke: null, fill: 0 });
    const dx = p[0] - mx;
    const dy = p[1] - my;
    const len = Math.hypot(dx, dy) || 1;
    pdf.text(String(i + 1), p[0] + (dx / len) * 5, p[1] + (dy / len) * 5 + 1.4, { size: 9, font: "bold", align: "center" });
  });
  pdf.text("Start here", P[0][0], P[0][1] - 9, { size: 8, font: "italic", align: "center", color: RUST });
  pdf.text("When you are done, colour it in!", 105, 262, { size: 11, font: "serifItalic", align: "center", color: 0.3 });
  return pdf;
}

// ---------- kids maths ----------

function kidsMaths(seed) {
  const rnd = seededRandom(`${seed}:maths`);
  const sums = [];
  for (let i = 0; i < 20; i++) {
    if (i % 2 === 0) {
      const a = 1 + Math.floor(rnd() * 10);
      const b = 1 + Math.floor(rnd() * 10);
      sums.push(`${a} + ${b} =`);
    } else {
      const a = 5 + Math.floor(rnd() * 15);
      const b = 1 + Math.floor(rnd() * Math.min(a, 10));
      sums.push(`${a} - ${b} =`);
    }
  }
  const pdf = new Pdf("Kids maths");
  pdf.addPage();
  header(pdf, "Number Fun", "Do the sums. Colour a star for each one you get right!", { name: true });
  sums.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 24 + col * 90;
    const y = 56 + row * 17;
    pdf.text(s, x, y, { size: 18, font: "bold" });
    pdf.line(x + 36, y + 1, x + 62, y + 1, { stroke: 0.5, lw: 0.4 });
  });
  for (let i = 0; i < 10; i++) star(pdf, 32 + i * 16.5, 246, 6, { stroke: 0, lw: 0.5 });
  pdf.text("How many stars did you colour?", 105, 262, { size: 11, font: "serifItalic", align: "center", color: 0.3 });
  return pdf;
}

// ---------- colouring ----------

function mandala(seed) {
  const rnd = seededRandom(`${seed}:mandala`);
  const n = pick(rnd, [8, 10, 12, 16]);
  const cx = 105;
  const cy = 150;
  const pdf = new Pdf("Mandala");
  pdf.addPage();
  pdf.text("Mandala", 105, 24, { size: 22, font: "serifBold", align: "center", color: GREEN });
  pdf.text("Take your time. There are no wrong colours.", 105, 31, { size: 10, font: "serifItalic", align: "center", color: 0.3 });
  footer(pdf);
  const ring = (r0, r1, kind) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const a2 = ((i + 1) / n) * Math.PI * 2;
      const am = (a + a2) / 2;
      if (kind === "petal") pdf.path(petalPath(cx, cy, am, r0, r1, (r1 - r0) * 0.32), LINE);
      else if (kind === "scallop") {
        const x1 = cx + r0 * Math.cos(a);
        const y1 = cy + r0 * Math.sin(a);
        const x2 = cx + r0 * Math.cos(a2);
        const y2 = cy + r0 * Math.sin(a2);
        const k = (r1 / r0) * 1.12;
        const c1x = cx + r0 * k * Math.cos(a + (a2 - a) * 0.15);
        const c1y = cy + r0 * k * Math.sin(a + (a2 - a) * 0.15);
        const c2x = cx + r0 * k * Math.cos(a + (a2 - a) * 0.85);
        const c2y = cy + r0 * k * Math.sin(a + (a2 - a) * 0.85);
        pdf.path([["M", x1, y1], ["C", c1x, c1y, c2x, c2y, x2, y2]], LINE);
      } else if (kind === "circle") {
        pdf.circle(cx + ((r0 + r1) / 2) * Math.cos(am), cy + ((r0 + r1) / 2) * Math.sin(am), (r1 - r0) / 2.2, LINE);
      } else if (kind === "tri") {
        const t = [[cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)], [cx + r1 * Math.cos(am), cy + r1 * Math.sin(am)], [cx + r0 * Math.cos(a2), cy + r0 * Math.sin(a2)]];
        pdf.poly(t, true, LINE);
      } else if (kind === "dot") {
        pdf.circle(cx + r1 * Math.cos(am), cy + r1 * Math.sin(am), 1.3, { stroke: null, fill: 0 });
      }
    }
  };
  pdf.circle(cx, cy, 4, THICK);
  const kinds = ["petal", "circle", "scallop", "tri", "petal", "scallop", "circle"];
  let r = 6;
  let ki = Math.floor(rnd() * kinds.length);
  while (r < 98) {
    const band = 9 + Math.floor(rnd() * 8);
    const kind = kinds[ki % kinds.length];
    if (r + band > 100) break;
    pdf.circle(cx, cy, r, { stroke: 0, lw: 0.35 });
    ring(r, r + band, kind);
    if (rnd() > 0.5) ring(r + band, r + band + 4, "dot");
    r += band + 4;
    ki++;
  }
  pdf.circle(cx, cy, Math.min(r, 100), THICK);
  return pdf;
}

function flowerAt(pdf, cx, cy, size, petals, o) {
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    pdf.ellipse(cx + Math.cos(a) * size * 0.62, cy + Math.sin(a) * size * 0.62, size * 0.42, size * 0.2, Object.assign({ fill: 1 }, o), a);
  }
  pdf.circle(cx, cy, size * 0.3, Object.assign({ fill: 1 }, o));
}

function cloud(pdf, x, y, s) {
  const cs = [[0, 0, 9], [10, -4, 11], [22, 0, 9], [11, 4, 9]];
  const L = { stroke: 0, lw: 1.3, fill: 1 };
  cs.forEach(([dx, dy, r]) => pdf.circle(x + dx * s, y + dy * s, r * s, L));
  cs.forEach(([dx, dy, r]) => pdf.circle(x + dx * s, y + dy * s, r * s - 0.65, { stroke: null, fill: 1 }));
}

function colourFlower(seed) {
  const pdf = new Pdf("Colouring: flowers");
  pdf.addPage();
  pdf.text("A Garden to Colour", 105, 24, { size: 22, font: "serifBold", align: "center", color: GREEN });
  footer(pdf);
  const L = { stroke: 0, lw: 1.1 };
  pdf.path([["M", 105, 250], ["C", 100, 210, 112, 190, 105, 150]], { stroke: 0, lw: 1.4 });
  pdf.path([["M", 104, 215], ["C", 80, 215, 70, 200, 66, 188], ["C", 90, 188, 102, 198, 104, 215], ["Z"]], L);
  pdf.path([["M", 106, 195], ["C", 128, 195, 140, 180, 144, 168], ["C", 122, 170, 108, 180, 106, 195], ["Z"]], L);
  flowerAt(pdf, 105, 120, 52, 9, L);
  flowerAt(pdf, 45, 205, 22, 7, L);
  pdf.path([["M", 45, 227], ["C", 46, 240, 44, 245, 45, 252]], { stroke: 0, lw: 1.1 });
  flowerAt(pdf, 165, 215, 26, 8, L);
  pdf.path([["M", 165, 241], ["C", 164, 248, 166, 250, 165, 254]], { stroke: 0, lw: 1.1 });
  cloud(pdf, 38, 62, 1.1);
  cloud(pdf, 150, 56, 0.9);
  for (let i = 0; i < 12; i++) {
    const x = 18 + i * 16.5;
    pdf.path([["M", x, 254], ["C", x + 3, 247, x + 5, 247, x + 8, 254]], { stroke: 0, lw: 0.8 });
  }
  pdf.ellipse(165, 90, 9, 4, L, 0.5);
  pdf.ellipse(176, 98, 9, 4, L, -0.4);
  return pdf;
}

function colourFish(seed) {
  const pdf = new Pdf("Colouring: fish");
  pdf.addPage();
  pdf.text("Under the Sea", 105, 24, { size: 22, font: "serifBold", align: "center", color: GREEN });
  footer(pdf);
  const L = { stroke: 0, lw: 1.1, fill: 1 };
  const cx = 95;
  const cy = 135;
  pdf.path([["M", cx + 38, cy], ["C", cx + 55, cy - 5, cx + 62, cy - 16, cx + 78, cy - 30], ["C", cx + 68, cy - 8, cx + 68, cy + 8, cx + 78, cy + 30], ["C", cx + 62, cy + 16, cx + 55, cy + 5, cx + 38, cy], ["Z"]], L);
  pdf.path([["M", cx - 10, cy - 26], ["C", cx, cy - 52, cx + 20, cy - 50, cx + 28, cy - 22], ["Z"]], L);
  pdf.path([["M", cx - 5, cy + 26], ["C", cx, cy + 44, cx + 14, cy + 44, cx + 18, cy + 24], ["Z"]], L);
  pdf.ellipse(cx, cy, 46, 30, L, 0);
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 4; k++) {
      const x = cx - 6 + k * 11 + (row % 2) * 5;
      const y = cy - 14 + row * 11;
      pdf.path([["M", x - 5, y], ["C", x - 5, y + 7, x + 5, y + 7, x + 5, y]], { stroke: 0, lw: 0.7 });
    }
  }
  pdf.circle(cx - 28, cy - 7, 5.5, { stroke: 0, lw: 1, fill: 1 });
  pdf.circle(cx - 28.5, cy - 7, 2.4, { stroke: null, fill: 0 });
  pdf.path([["M", cx - 40, cy + 6], ["C", cx - 36, cy + 12, cx - 30, cy + 12, cx - 27, cy + 8]], { stroke: 0, lw: 1 });
  const bubbles = [[40, 70, 5], [52, 55, 3.5], [36, 45, 2.5], [150, 80, 4], [160, 62, 2.6], [168, 180, 4.5], [60, 200, 3]];
  bubbles.forEach(([x, y, r]) => pdf.circle(x, y, r, { stroke: 0, lw: 0.8 }));
  for (let w = 0; w < 4; w++) {
    const x = 28 + w * 40;
    pdf.path([["M", x, 255], ["C", x - 8, 240, x + 8, 232, x, 218], ["C", x - 7, 206, x + 7, 200, x + 1, 190]], { stroke: 0, lw: 1.2 });
  }
  return pdf;
}

function colourOwl(seed) {
  const pdf = new Pdf("Colouring: owl");
  pdf.addPage();
  pdf.text("A Sleepy Owl", 105, 24, { size: 22, font: "serifBold", align: "center", color: GREEN });
  footer(pdf);
  const L = { stroke: 0, lw: 1.1, fill: 1 };
  pdf.line(20, 235, 190, 232, { stroke: 0, lw: 3 });
  pdf.ellipse(62, 160, 30, 13, L, 1.15);
  pdf.ellipse(148, 160, 30, 13, L, -1.15);
  pdf.ellipse(105, 150, 44, 62, L, 0);
  pdf.poly([[72, 90], [80, 70], [92, 86]], true, L);
  pdf.poly([[138, 90], [130, 70], [118, 86]], true, L);
  pdf.circle(88, 115, 16, L);
  pdf.circle(122, 115, 16, L);
  pdf.circle(88, 115, 6, { stroke: null, fill: 0 });
  pdf.circle(122, 115, 6, { stroke: null, fill: 0 });
  pdf.circle(86, 113, 1.6, { stroke: null, fill: 1 });
  pdf.circle(120, 113, 1.6, { stroke: null, fill: 1 });
  pdf.poly([[99, 127], [111, 127], [105, 140]], true, L);
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k < 4 - (r % 2); k++) {
      const x = 105 + (k - (3 - (r % 2)) / 2) * 14;
      const y = 150 + r * 13;
      pdf.path([["M", x - 6, y], ["C", x - 6, y + 8, x + 6, y + 8, x + 6, y]], { stroke: 0, lw: 0.8 });
    }
  }
  pdf.line(90, 212, 90, 232, { stroke: 0, lw: 1.2 });
  pdf.line(120, 212, 120, 232, { stroke: 0, lw: 1.2 });
  [[84, 232], [90, 233], [96, 232], [114, 232], [120, 233], [126, 232]].forEach(([x, y], i) => pdf.line(x, y, x + (i % 3 === 1 ? 0 : (i % 3 === 0 ? -3 : 3)), y + 5, { stroke: 0, lw: 1 }));
  pdf.path([["M", 170, 50], ["C", 150, 56, 150, 90, 170, 96], ["C", 160, 84, 160, 62, 170, 50], ["Z"]], { stroke: 0, lw: 1.1 });
  star(pdf, 40, 60, 6, THICK);
  star(pdf, 70, 48, 4, THICK);
  star(pdf, 34, 100, 4.5, THICK);
  star(pdf, 150, 120, 3.5, THICK);
  pdf.ellipse(40, 225, 10, 4.5, L, 0.4);
  pdf.ellipse(170, 224, 10, 4.5, L, -0.4);
  return pdf;
}

function colourSunny(seed) {
  const pdf = new Pdf("Colouring: sunny day");
  pdf.addPage();
  pdf.text("A Sunny Day", 105, 24, { size: 22, font: "serifBold", align: "center", color: GREEN });
  footer(pdf);
  const L = { stroke: 0, lw: 1.1, fill: 1 };
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    pdf.path(petalPath(155, 70, a, 24, 40, 3), { stroke: 0, lw: 0.9 });
  }
  pdf.circle(155, 70, 19, L);
  pdf.circle(149, 66, 1.8, { stroke: null, fill: 0 });
  pdf.circle(161, 66, 1.8, { stroke: null, fill: 0 });
  pdf.path([["M", 148, 76], ["C", 152, 82, 158, 82, 162, 76]], { stroke: 0, lw: 1 });
  cloud(pdf, 30, 70, 1.2);
  cloud(pdf, 85, 110, 0.8);
  pdf.path([["M", 10, 215], ["C", 50, 150, 100, 170, 125, 200], ["C", 150, 180, 185, 170, 200, 195], ["L", 200, 262], ["L", 10, 262], ["Z"]], L);
  pdf.rect(60, 165, 44, 34, L);
  pdf.poly([[55, 166], [82, 140], [109, 166]], true, L);
  pdf.rect(76, 178, 12, 21, L);
  pdf.rect(63, 170, 9, 9, L);
  pdf.rect(92, 170, 9, 9, L);
  pdf.rect(155, 205, 6, 26, L);
  [[158, 192, 17], [147, 202, 13], [169, 202, 13]].forEach(([x, y, r]) => pdf.circle(x, y, r, { stroke: 0, lw: 1.3, fill: 1 }));
  [[158, 192, 17], [147, 202, 13], [169, 202, 13]].forEach(([x, y, r]) => pdf.circle(x, y, r - 0.65, { stroke: null, fill: 1 }));
  for (let i = 0; i < 6; i++) {
    const x = 22 + i * 14;
    pdf.line(x, 250, x, 240, { stroke: 0, lw: 0.8 });
    flowerAt(pdf, x, 237, 6, 5, { stroke: 0, lw: 0.7 });
  }
  return pdf;
}

// ---------- crossword ----------

function wrapLines(pdf, str, maxW, size, font) {
  const words = str.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (cur && pdf.textWidth(t, size, font) > maxW) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function crossword(seed, kids) {
  const rnd = seededRandom(`${seed}:crossword${kids ? "kids" : ""}`);
  const cw = kids ? makeCrossword(rnd, KIDS_WORDS, 10) : makeCrossword(rnd);
  const pdf = new Pdf(kids ? "Kids Crossword" : "Crossword");
  pdf.addPage();
  header(pdf, kids ? "Kids Crossword" : "Crossword", kids ? `Easy words and friendly clues. ${fmtDate(seed)}` : `A cosy quick one. ${fmtDate(seed)}`);
  const cell = Math.min(11, 170 / cw.w, 138 / cw.h);
  const gx = (210 - cell * cw.w) / 2;
  const gy = 42;
  const drawGrid = (solved) => {
    for (let y = 0; y < cw.h; y++) {
      for (let x = 0; x < cw.w; x++) {
        const ch = cw.cells[y][x];
        if (!ch) continue;
        pdf.rect(gx + x * cell, gy + y * cell, cell, cell, { stroke: 0, lw: 0.4 });
        if (solved) pdf.text(ch, gx + (x + 0.5) * cell, gy + (y + 0.5) * cell + cell * 0.18, { size: cell * 2, font: "sans", align: "center" });
      }
    }
    for (const nm of cw.numbers) pdf.text(String(nm.n), gx + nm.x * cell + 0.7, gy + nm.y * cell + 2.6, { size: 6, font: "sans", color: 0.25 });
  };
  drawGrid(false);

  const top = gy + cell * cw.h + 12;
  const colW = 82;
  const bottom = 280;
  const layout = (size) => {
    const lh = size * 0.5;
    let total = 0;
    const build = (list) =>
      list.map((p) => {
        const lines = wrapLines(pdf, `${p.num}. ${p.clue} (${p.word.length})`, colW, size, "sans");
        return { lines, h: lines.length * lh + 1.4 };
      });
    const a = build(cw.across);
    const d = build(cw.down);
    const sum = (arr) => arr.reduce((t, e) => t + e.h, 0);
    total = Math.max(sum(a), sum(d));
    return { a, d, lh, total };
  };
  let size = 9.5;
  let lay = layout(size);
  while (size > 7 && top + 8 + lay.total > bottom) {
    size -= 0.5;
    lay = layout(size);
  }
  const drawList = (title, x, list) => {
    pdf.text(title, x, top, { size: 11, font: "serifBold", color: GREEN });
    let y = top + 7;
    for (const e of list) {
      for (const line of e.lines) {
        pdf.text(line, x, y, { size, font: "sans" });
        y += lay.lh;
      }
      y += 1.4;
    }
  };
  drawList("Across", 20, lay.a);
  drawList("Down", 108, lay.d);
  pdf.addPage();
  header(pdf, "Answers", kids ? "Kids Crossword" : "Crossword");
  drawGrid(true);
  return pdf;
}

// ---------- planners ----------

function weeklyPlanner(seed) {
  const pdf = new Pdf("Weekly planner");
  pdf.addPage();
  header(pdf, "My Week", "Plans, little rituals and what I want to remember");
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  days.forEach((d, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 20 + col * 87;
    const y = 42 + row * 45;
    if (i === 6) {
      pdf.roundRect(20, y, 170, 40, 3, { stroke: RUST, lw: 0.5 });
      pdf.text(d, 24, y + 7, { size: 11, font: "serifBold", color: RUST });
      for (let l = 0; l < 3; l++) pdf.line(24, y + 17 + l * 8, 186, y + 17 + l * 8, { stroke: 0.75, lw: 0.2 });
      return;
    }
    pdf.roundRect(x, y, 83, 40, 3, { stroke: 0.4, lw: 0.4 });
    pdf.text(d, x + 4, y + 7, { size: 11, font: "serifBold", color: GREEN });
    for (let l = 0; l < 3; l++) pdf.line(x + 4, y + 17 + l * 8, x + 79, y + 17 + l * 8, { stroke: 0.75, lw: 0.2 });
  });
  const hy = 42 + 4 * 45;
  pdf.text("Little habits", 20, hy + 8, { size: 12, font: "serifBold", color: GREEN });
  ["M", "T", "W", "T", "F", "S", "S"].forEach((d, i) => pdf.text(d, 100 + i * 12, hy + 8, { size: 9, font: "bold", align: "center", color: GREY }));
  for (let r = 0; r < 4; r++) {
    const y = hy + 16 + r * 9;
    pdf.line(20, y + 1, 92, y + 1, { stroke: 0.7, lw: 0.2 });
    for (let c = 0; c < 7; c++) pdf.circle(100 + c * 12, y - 2, 3, { stroke: 0.4, lw: 0.35 });
  }
  return pdf;
}

const PROMPTS = [
  "What was the nicest small thing that happened this week?",
  "What did you read that you are still thinking about?",
  "Which meal was the best one, and who were you with?",
  "Where did you walk, and what did you notice?",
  "What would make next week feel gentler?",
  "What are you looking forward to?",
  "Write down one thing you are proud of, however small.",
  "Whose kindness did you notice this week?",
  "What did you learn that surprised you?",
  "What do you want to do less of next week?",
  "Describe a moment you would like to keep.",
  "What made you laugh?",
];

function sundayPage(seed) {
  const rnd = seededRandom(`${seed}:sunday`);
  const prompt = pick(rnd, PROMPTS);
  const pdf = new Pdf("Sunday page");
  pdf.addPage();
  header(pdf, "Sunday Page", `A quiet look back. Week ending ${fmtDate(seed)}`);
  pdf.text(prompt, 105, 50, { size: 13, font: "serifItalic", align: "center", color: RUST });
  for (let l = 0; l < 6; l++) pdf.line(20, 62 + l * 9, 190, 62 + l * 9, { stroke: 0.7, lw: 0.2 });
  const boxes = ["I read", "I cooked", "I watched", "I went"];
  boxes.forEach((b, i) => {
    const x = 20 + (i % 2) * 87;
    const y = 126 + Math.floor(i / 2) * 44;
    pdf.roundRect(x, y, 83, 40, 3, { stroke: 0.4, lw: 0.4 });
    pdf.text(b, x + 4, y + 7, { size: 11, font: "serifBold", color: GREEN });
    for (let l = 0; l < 3; l++) pdf.line(x + 4, y + 17 + l * 8, x + 79, y + 17 + l * 8, { stroke: 0.75, lw: 0.2 });
  });
  pdf.roundRect(20, 216, 111, 58, 3, { stroke: 0.4, lw: 0.4 });
  pdf.text("Doodle or stick something in here", 24, 223, { size: 9, font: "italic", color: GREY });
  pdf.roundRect(137, 216, 53, 58, 3, { stroke: RUST, lw: 0.5 });
  pdf.text("One good thing", 141, 223, { size: 11, font: "serifBold", color: RUST });
  for (let l = 0; l < 4; l++) pdf.line(141, 235 + l * 9, 186, 235 + l * 9, { stroke: 0.75, lw: 0.2 });
  return pdf;
}

// ---------- catalogue ----------

export const PRINTABLES = [
  { key: "sudoku-adult", audience: "adults", emoji: "🧩", label: "Sudoku", tagline: "A grown-up grid", blurb: "A fresh sudoku with the answer overleaf.", build: (s) => sudoku(s, "medium") },
  { key: "wordsearch-adult", audience: "adults", emoji: "🔤", label: "Word Search", tagline: "A themed hunt", blurb: "A big themed word search, answers on page two.", build: (s) => wordSearch(s, false) },
  { key: "crossword-adult", audience: "adults", emoji: "\u270d\ufe0f", label: "Crossword", tagline: "A cosy quick one", blurb: "A fresh quick crossword with the answers on page two.", build: (s) => crossword(s, false) },
  { key: "maze-adult", audience: "adults", emoji: "🌀", label: "Big Maze", tagline: "Properly fiddly", blurb: "A large maze to lose twenty minutes in.", build: (s) => maze(s, false) },
  { key: "sunday", audience: "planners", emoji: "🕯️", label: "Sunday Page", tagline: "A quiet look back", blurb: "A reflection prompt and room for what you read, cooked, watched and did.", build: sundayPage },
  { key: "week", audience: "planners", emoji: "🗓️", label: "Weekly Planner", tagline: "Your week on one page", blurb: "Seven days, a habit tracker and room to breathe.", build: weeklyPlanner },
  { key: "wordsearch-kids", audience: "kids", emoji: "🔍", label: "Kids Word Search", tagline: "Easy and fun", blurb: "Short words hidden across and down.", build: (s) => wordSearch(s, true) },
  { key: "maze-kids", audience: "kids", emoji: "🐾", label: "Kids Maze", tagline: "Find the way out", blurb: "A friendly maze with thick, easy walls.", build: (s) => maze(s, true) },
  { key: "crossword-kids", audience: "kids", emoji: "\ud83d\udd8d\ufe0f", label: "Kids Crossword", tagline: "Easy words, friendly clues", blurb: "A small crossword with simple clues and the answers on page two.", build: (s) => crossword(s, true) },
  { key: "dots-kids", audience: "kids", emoji: "✏️", label: "Dot to Dot", tagline: "What can you see?", blurb: "Join the numbers to reveal a shape, then colour it in.", build: dotToDot },
  { key: "maths-kids", audience: "kids", emoji: "⭐", label: "Number Fun", tagline: "Sums and stars", blurb: "Twenty friendly sums and a row of stars to colour.", build: kidsMaths },
  { key: "mandala", audience: "colouring", emoji: "🌸", label: "Mandala", tagline: "Calm and detailed", blurb: "A fresh mandala every day, for slow colouring.", build: mandala },
  { key: "colour-garden", audience: "colouring", emoji: "🌻", label: "Garden Colouring", tagline: "Big flowers", blurb: "Bold flowers and clouds to colour in.", build: colourFlower },
  { key: "colour-sea", audience: "colouring", emoji: "🐠", label: "Under the Sea", tagline: "A fish and bubbles", blurb: "A friendly fish, bubbles and seaweed.", build: colourFish },
  { key: "colour-owl", audience: "colouring", emoji: "🦉", label: "Sleepy Owl", tagline: "Moon and stars", blurb: "An owl on a branch under the stars.", build: colourOwl },
  { key: "colour-sunny", audience: "colouring", emoji: "☀️", label: "A Sunny Day", tagline: "Hills and a house", blurb: "Sun, clouds, a little house and a tree.", build: colourSunny },
];

export const PRINTABLE_GROUPS = [
  ["adults", "Print n go puzzles for adults"],
  ["kids", "Print n go puzzles for kids"],
  ["colouring", "Colouring pages"],
  ["planners", "Planners and pages to write on"],
];

export function buildPrintable(key, seed) {
  const def = PRINTABLES.find((p) => p.key === key);
  if (!def) return null;
  const pdf = def.build(seed);
  return { filename: `Stackt ${def.label} ${String(seed).slice(0, 10)}.pdf`, buffer: pdf.toBuffer(), label: def.label };
}
