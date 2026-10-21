export default function manifest() {
  return {
    name: "Stackt",
    short_name: "Stackt",
    description: "Your Substacks and daily reads, delivered to your Kobo.",
    start_url: "/library",
    scope: "/",
    display: "standalone",
    background_color: "#17302a",
    theme_color: "#17302a",
    icons: [
      { src: "/pwa-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon?size=512&maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
