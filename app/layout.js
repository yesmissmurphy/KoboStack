import { Fraunces, DM_Sans, IBM_Plex_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap" });

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap" });

export const metadata = {
  title: "Stackt — Substacks to Kobo",
  description: "Add Substacks and get new posts delivered to your Kobo as EPUBs everyday.",
  applicationName: "Stackt",
  icons: {
    icon: [{ url: "/pwa-icon?size=192", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/pwa-icon?size=180&maskable=1", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Stackt", statusBarStyle: "black-translucent" },
};

export const viewport = {
  themeColor: "#17302a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${dmSans.variable} ${plexMono.variable} ${pixel.variable}`}>
      <body>
<script dangerouslySetInnerHTML={{ __html: 'try{var p=document.cookie.split("stackt_theme=");if(p[1]){document.documentElement.setAttribute("data-theme",p[1].split(";")[0])}}catch(e){}' }} />
{children}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if(navigator.serviceWorker){window.addEventListener(String.fromCharCode(108,111,97,100),function(){navigator.serviceWorker.register(String.fromCharCode(47)+String.fromCharCode(115,119,46,106,115)).catch(function(){})})}",
          }}
        />
      </body>
    </html>
  );
}
