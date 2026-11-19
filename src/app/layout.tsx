import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const plex = localFont({
  src: [
    { path: "../../public/fonts/ibm-plex-sans-latin-400-normal.woff", weight: "400", style: "normal" },
    { path: "../../public/fonts/ibm-plex-sans-latin-600-normal.woff", weight: "600", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Garro",
  description: "Sistema integrado da Garro Produtora",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${plex.className} antialiased`}>{children}</body>
    </html>
  );
}
