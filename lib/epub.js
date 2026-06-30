export async function createEpub({ title, author, content, date }) {
  const safeTitle = escapeXml(title);
  const safeAuthor = escapeXml(author);
  const id = `shelf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const files = {
    mimetype: "application/epub+zip",
    "META-INF/container.xml": `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:schemas:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    "OEBPS/content.opf": `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${safeTitle}</dc:title>
    <dc:creator opf:role="aut">${safeAuthor}</dc:creator>
    <dc:date>${date}</dc:date>
    <dc:identifier id="bookid">${id}</dc:identifier>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="content" href="content.html" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="content"/>
  </spine>
</package>`,
    "OEBPS/toc.ncx": `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${safeTitle}</text></docTitle>
  <navMap>
    <navPoint id="np1" playOrder="1">
      <navLabel><text>${safeTitle}</text></navLabel>
      <content src="content.html"/>
    </navPoint>
  </navMap>
</ncx>`,
    "OEBPS/content.html": `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${safeTitle}</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  <style type="text/css">
    body { font-family: Georgia, serif; margin: 1em 2em; line-height: 1.6; }
    h1 { font-size: 1.4em; margin-bottom: 0.2em; }
    .meta { color: #666; font-size: 0.85em; margin-bottom: 1.5em; border-bottom: 1px solid #ccc; padding-bottom: 0.8em; }
    img { max-width: 100%; height: auto; }
    blockquote { border-left: 3px solid #ccc; padding-left: 1em; color: #555; }
  </style>
</head>
<body>
  <h1>${safeTitle}</h1>
  <p class="meta">By ${safeAuthor} &#183; ${date}</p>
  ${content}
</body>
</html>`,
  };

  return buildZip(files);
}

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildZip(files) {
  const enc = new TextEncoder();
  const entries = [];
  const centralDir = [];
  let offset = 0;

  const fileOrder = [
    "mimetype",
    ...Object.keys(files).filter((f) => f !== "mimetype"),
  ];

  for (const name of fileOrder) {
    const content = enc.encode(files[name]);
    const compressed = name === "mimetype" ? content : deflateRaw(content);
    const crc = crc32(content);
    const nameBytes = enc.encode(name);
    const now = dosDateTime();

    const local = new Uint8Array(30 + nameBytes.length + compressed.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, name === "mimetype" ? 0 : 8, true);
    lv.setUint16(10, now.time, true);
    lv.setUint16(12, now.date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, compressed.length, true);
    lv.setUint32(22, content.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(compressed, 30 + nameBytes.length);
    entries.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, name === "mimetype" ? 0 : 8, true);
    cv.setUint16(12, now.time, true);
    cv.setUint16(14, now.date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, compressed.length, true);
    cv.setUint32(24, content.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralDir.push(central);
    offset += local.length;
  }

  const centralSize = centralDir.reduce((a, b) => a + b.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalSize =
    entries.reduce((a, b) => a + b.length, 0) + centralSize + eocd.length;
  const out = new Uint8Array(totalSize);
  let pos = 0;
  for (const e of entries) { out.set(e, pos); pos += e.length; }
  for (const c of centralDir) { out.set(c, pos); pos += c.length; }
  out.set(eocd, pos);

  return Buffer.from(out);
}

function dosDateTime() {
  const d = new Date();
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function deflateRaw(data) {
  try {
    const { deflateRawSync } = require("zlib");
    return deflateRawSync(data, { level: 6 });
  } catch {
    return data;
  }
}
