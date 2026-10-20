import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const size = Math.min(Math.max(Number(searchParams.get("size")) || 512, 64), 1024);
  const maskable = searchParams.get("maskable") === "1";
  const glyph = Math.round(size * (maskable ? 0.5 : 0.62));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#17302a",
          color: "#f4ead5",
          fontSize: glyph,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
          borderRadius: maskable ? 0 : Math.round(size * 0.22),
        }}
      >
        S
      </div>
    ),
    { width: size, height: size }
  );
}
