import type { Metadata, Viewport } from "next";
import { Oswald, Jost } from "next/font/google";
import "./globals.css";

const oswald = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-oswald" });
const jost = Jost({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-jost" });

export const metadata: Metadata = { title: "Mix Challenge — Brugal", description: "Escápate a lo extraordinario" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${oswald.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
