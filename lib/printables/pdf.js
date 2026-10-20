// Tiny dependency-free PDF writer. Units are millimetres, origin top-left, A4.
const PAGE_W = 210;
const PAGE_H = 297;
const MM = 72 / 25.4;

const FONTS = {
  sans: ["F1", "Helvetica"],
  bold: ["F2", "Helvetica-Bold"],
  serif: ["F3", "Times-Roman"],
  serifBold: ["F4", "Times-Bold"],
  serifItalic: ["F5", "Times-Italic"],
  italic: ["F6", "Helvetica-Oblique"],
};

// Helvetica advance widths for ASCII 32..126 (per 1000 em), used to centre text.
const HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];

function clean(str) {
  return String(str)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function esc(str) {
  return clean(str).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function n(v) {
  return (Math.round(v * 100) / 100).toString();
}

function color(c) {
  if (typeof c === "number") return `${n(c)} ${n(c)} ${n(c)}`;
  const h = String(c).replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return `${n(r)} ${n(g)} ${n(b)}`;
}

const X = (x) => n(x * MM);
const Y = (y) => n((PAGE_H - y) * MM);

export class Pdf {
  constructor(title) {
    this.title = title || "Stackt";
    this.pages = [];
    this.cur = null;
    this.W = PAGE_W;
    this.H = PAGE_H;
  }

  addPage() {
    this.cur = [];
    this.pages.push(this.cur);
    return this;
  }

  raw(s) {
    this.cur.push(s);
  }

  textWidth(str, size, font) {
    const s = clean(str);
    let w = 0;
    for (const ch of s) {
      const code = ch.charCodeAt(0);
      w += code >= 32 && code <= 126 ? HELV[code - 32] : 556;
    }
    const k = font === "bold" || font === "serifBold" ? 1.06 : font === "serif" || font === "serifItalic" ? 0.93 : 1;
    return (w / 1000) * size * k * (25.4 / 72);
  }

  // opts: { stroke, fill, lw, dash }
  _paint(opts, ops) {
    const o = Object.assign({ stroke: 0, fill: null, lw: 0.3 }, opts || {});
    let s = "q ";
    if (o.stroke !== null && o.stroke !== undefined) s += `${color(o.stroke)} RG `;
    if (o.fill !== null && o.fill !== undefined) s += `${color(o.fill)} rg `;
    s += `${n(o.lw * MM)} w 1 J 1 j `;
    if (o.dash) s += `[${o.dash.map((d) => n(d * MM)).join(" ")}] 0 d `;
    s += ops + " ";
    const hasStroke = o.stroke !== null && o.stroke !== undefined;
    const hasFill = o.fill !== null && o.fill !== undefined;
    s += hasFill && hasStroke ? "B" : hasFill ? "f" : hasStroke ? "S" : "n";
    s += " Q";
    this.raw(s);
  }

  line(x1, y1, x2, y2, opts) {
    this._paint(Object.assign({ fill: null }, opts), `${X(x1)} ${Y(y1)} m ${X(x2)} ${Y(y2)} l`);
  }

  rect(x, y, w, h, opts) {
    this._paint(opts, `${X(x)} ${Y(y + h)} ${n(w * MM)} ${n(h * MM)} re`);
  }

  roundRect(x, y, w, h, r, opts) {
    const k = 0.5523 * r;
    const p = [
      `${X(x + r)} ${Y(y)} m`,
      `${X(x + w - r)} ${Y(y)} l`,
      `${X(x + w - r + k)} ${Y(y)} ${X(x + w)} ${Y(y + r - k)} ${X(x + w)} ${Y(y + r)} c`,
      `${X(x + w)} ${Y(y + h - r)} l`,
      `${X(x + w)} ${Y(y + h - r + k)} ${X(x + w - r + k)} ${Y(y + h)} ${X(x + w - r)} ${Y(y + h)} c`,
      `${X(x + r)} ${Y(y + h)} l`,
      `${X(x + r - k)} ${Y(y + h)} ${X(x)} ${Y(y + h - r + k)} ${X(x)} ${Y(y + h - r)} c`,
      `${X(x)} ${Y(y + r)} l`,
      `${X(x)} ${Y(y + r - k)} ${X(x + r - k)} ${Y(y)} ${X(x + r)} ${Y(y)} c h`,
    ];
    this._paint(opts, p.join(" "));
  }

  ellipse(cx, cy, rx, ry, opts, rot) {
    this._paint(opts, this._ellipseOps(cx, cy, rx, ry, rot || 0));
  }

  circle(cx, cy, r, opts) {
    this.ellipse(cx, cy, r, r, opts, 0);
  }

  _ellipseOps(cx, cy, rx, ry, rot) {
    const k = 0.5523;
    const pts = [
      [rx, 0], [rx, ry * k], [rx * k, ry], [0, ry],
      [-rx * k, ry], [-rx, ry * k], [-rx, 0],
      [-rx, -ry * k], [-rx * k, -ry], [0, -ry],
      [rx * k, -ry], [rx, -ry * k], [rx, 0],
    ];
    const cs = Math.cos(rot);
    const sn = Math.sin(rot);
    const t = pts.map(([px, py]) => [cx + px * cs - py * sn, cy + px * sn + py * cs]);
    let s = `${X(t[0][0])} ${Y(t[0][1])} m `;
    for (let i = 1; i < 13; i += 3) {
      s += `${X(t[i][0])} ${Y(t[i][1])} ${X(t[i + 1][0])} ${Y(t[i + 1][1])} ${X(t[i + 2][0])} ${Y(t[i + 2][1])} c `;
    }
    return s + "h";
  }

  // points: [[x, y], ...]
  poly(points, close, opts) {
    let s = "";
    points.forEach((p, i) => {
      s += `${X(p[0])} ${Y(p[1])} ${i === 0 ? "m" : "l"} `;
    });
    if (close) s += "h";
    this._paint(opts, s);
  }

  // cmds: ["M",x,y] ["L",x,y] ["C",x1,y1,x2,y2,x,y] ["Z"]
  path(cmds, opts) {
    let s = "";
    for (const c of cmds) {
      if (c[0] === "M") s += `${X(c[1])} ${Y(c[2])} m `;
      else if (c[0] === "L") s += `${X(c[1])} ${Y(c[2])} l `;
      else if (c[0] === "C") s += `${X(c[1])} ${Y(c[2])} ${X(c[3])} ${Y(c[4])} ${X(c[5])} ${Y(c[6])} c `;
      else if (c[0] === "Z") s += "h ";
    }
    this._paint(opts, s);
  }

  // y is the baseline. opts: { size, font, align, color }
  text(str, x, y, opts) {
    const o = Object.assign({ size: 11, font: "sans", align: "left", color: 0 }, opts || {});
    const w = this.textWidth(str, o.size, o.font);
    let tx = x;
    if (o.align === "center") tx = x - w / 2;
    else if (o.align === "right") tx = x - w;
    this.raw(
      `q BT ${color(o.color)} rg /${FONTS[o.font][0]} ${n(o.size)} Tf ${X(tx)} ${Y(y)} Td (${esc(str)}) Tj ET Q`
    );
  }

  toBuffer() {
    const objs = [];
    const add = (s) => {
      objs.push(s);
      return objs.length;
    };
    add("<< /Type /Catalog /Pages 2 0 R >>");
    add("PLACEHOLDER");
    const fontIds = {};
    Object.values(FONTS).forEach(([name, base]) => {
      fontIds[name] = add(`<< /Type /Font /Subtype /Type1 /BaseFont /${base} /Encoding /WinAnsiEncoding >>`);
    });
    const fontRes = Object.keys(fontIds).map((k) => `/${k} ${fontIds[k]} 0 R`).join(" ");
    const kids = [];
    for (const ops of this.pages) {
      const content = ops.join("\n");
      const cid = add(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
      const pid = add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(PAGE_W * MM)} ${n(PAGE_H * MM)}] /Resources << /Font << ${fontRes} >> >> /Contents ${cid} 0 R >>`
      );
      kids.push(`${pid} 0 R`);
    }
    objs[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${kids.length} >>`;
    const infoId = add(`<< /Title (${esc(this.title)}) /Producer (Stackt) >>`);
    let out = "%PDF-1.4\n";
    const offsets = [];
    objs.forEach((o, i) => {
      offsets.push(Buffer.byteLength(out, "latin1"));
      out += `${i + 1} 0 obj\n${o}\nendobj\n`;
    });
    const xref = Buffer.byteLength(out, "latin1");
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach((off) => {
      out += `${String(off).padStart(10, "0")} 00000 n \n`;
    });
    out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(out, "latin1");
  }
}
