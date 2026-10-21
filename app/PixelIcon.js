"use client";

import { useEffect, useState } from "react";

// Turns an emoji into a small posterised sprite with a dark outline, like the
// icons in cosy farming games. Drawn once per emoji, then cached.
const N = 18;
const OUTLINE = [58, 42, 28];
const cache = {};

function make(emoji) {
  if (cache[emoji]) return cache[emoji];
  const c = document.createElement("canvas");
  c.width = N;
  c.height = N;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.font = `${Math.round(N * 0.86)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  x.fillText(emoji, N / 2, N / 2 + 1);
  const src = x.getImageData(0, 0, N, N).data;
  const M = N + 2;
  const out = document.createElement("canvas");
  out.width = M;
  out.height = M;
  const o = out.getContext("2d");
  const img = o.createImageData(M, M);
  const solid = new Uint8Array(M * M);
  const levels = 5;
  for (let yy = 0; yy < N; yy++) {
    for (let xx = 0; xx < N; xx++) {
      const i = (yy * N + xx) * 4;
      if (src[i + 3] < 120) continue;
      const j = ((yy + 1) * M + (xx + 1)) * 4;
      solid[(yy + 1) * M + (xx + 1)] = 1;
      for (let k = 0; k < 3; k++) {
        const v = Math.round((src[i + k] / 255) * (levels - 1)) / (levels - 1);
        img.data[j + k] = Math.round(v * 255);
      }
      img.data[j + 3] = 255;
    }
  }
  for (let yy = 0; yy < M; yy++) {
    for (let xx = 0; xx < M; xx++) {
      if (solid[yy * M + xx]) continue;
      const near =
        (yy > 0 && solid[(yy - 1) * M + xx]) ||
        (yy < M - 1 && solid[(yy + 1) * M + xx]) ||
        (xx > 0 && solid[yy * M + xx - 1]) ||
        (xx < M - 1 && solid[yy * M + xx + 1]);
      if (near) {
        const j = (yy * M + xx) * 4;
        img.data[j] = OUTLINE[0];
        img.data[j + 1] = OUTLINE[1];
        img.data[j + 2] = OUTLINE[2];
        img.data[j + 3] = 255;
      }
    }
  }
  o.putImageData(img, 0, 0);
  cache[emoji] = out.toDataURL();
  return cache[emoji];
}

export default function PixelIcon({ emoji, size = 54, style }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    try {
      setSrc(make(emoji));
    } catch (e) {
      setSrc(null);
    }
  }, [emoji]);
  const box = { display: "inline-block", width: size, height: size, lineHeight: 1, flexShrink: 0, ...style };
  if (!src) {
    return (
      <span aria-hidden="true" style={{ ...box, fontSize: Math.round(size * 0.62), textAlign: "center" }}>
        {emoji}
      </span>
    );
  }
  return <img src={src} alt="" aria-hidden="true" width={size} height={size} style={{ ...box, imageRendering: "pixelated" }} />;
}
