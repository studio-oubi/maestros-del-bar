import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const kaneda = localFont({
  src: "./fonts/kaneda-gothic-medium.otf",
  weight: "500",
  variable: "--font-kaneda",
});
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-inter" });

export const metadata: Metadata = { title: "Mix Challenge — Brugal", description: "Escápate a lo extraordinario" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${kaneda.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
