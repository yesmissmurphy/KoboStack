import { seededRandom } from "./rng";
import { makeCrossword, WORDS, KIDS_WORDS } from "@/lib/printables/crossword";

function gridHtml(cw, solved) {
  const num = {};
  for (const n of cw.numbers) num[`${n.x},${n.y}`] = n.n;
  let html = '<table style="border-collapse:collapse;margin:1em auto;">';
  for (let y = 0; y < cw.h; y++) {
    html += "<tr>";
    for (let x = 0; x < cw.w; x++) {
      const ch = cw.cells[y][x];
      if (!ch) {
        html += '<td style="width:2em;height:2em;background:#222;border:1px solid #222;">&#160;</td>';
        continue;
      }
      const n = num[`${x},${y}`];
      const label = n ? `<span style="font-size:0.55em;vertical-align:top;line-height:1;">${n}</span>` : "";
      const letter = solved ? `<strong style="font-size:1.2em;">${ch}</strong>` : "&#160;";
      html += `<td style="width:2em;height:2em;border:1px solid #000;text-align:center;vertical-align:middle;">${label}${letter}</td>`;
    }
    html += "</tr>";
  }
  return html + "</table>";
}

function clueList(title, list) {
  return `<h3>${title}</h3><ol style="list-style:none;padding:0;">` +
    list.map((p) => `<li style="margin:0.35em 0;"><strong>${p.num}.</strong> ${p.clue} (${p.word.length})</li>`).join("") +
    "</ol>";
}

export function crosswordStack(dateStr, kids) {
  const rnd = seededRandom(`${dateStr}:crossword${kids ? "kids" : ""}`);
  const cw = kids ? makeCrossword(rnd, KIDS_WORDS, 10) : makeCrossword(rnd);
  const intro = kids
    ? "A crossword for little ones. Write one letter in each white box. The number in brackets is how many letters the word has."
    : "A cosy quick one. Write one letter in each white box. The number in brackets is how many letters the word has.";
  const html =
    `<p style="text-align:center;"><em>${intro}</em></p>` +
    gridHtml(cw, false) +
    clueList("Across", cw.across) +
    clueList("Down", cw.down) +
    '<div style="page-break-before:always;"></div>' +
    "<h2>Answers</h2>" +
    gridHtml(cw, true) +
    '<p style="text-align:center;font-size:0.9em;">No peeking before you have had a go.</p>';
  return { title: kids ? "Kids Crossword" : "Crossword", html };
}
