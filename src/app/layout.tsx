import type { Metadata, Viewport } from "next";
import { Caveat, Fredoka, IBM_Plex_Mono, Nunito } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-fredoka" });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-nunito" });
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-caveat" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Cafe Passport",
  description: "Your cafe journal, pinned on a globe.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Cafe Passport", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#FFF6EC",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable} ${caveat.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
