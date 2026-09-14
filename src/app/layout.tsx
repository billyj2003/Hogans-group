import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { SiteHeader } from "@/components/site-header";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hogan Group Delivery Portal",
  description: "Track material deliveries and manage dispatch for Hogan Group.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${inter.variable} antialiased`}>
        <SiteHeader />
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
        <footer className="border-t border-graphite-950/10 bg-concrete-100 py-8">
          <div className="mx-auto max-w-6xl px-6 text-sm text-graphite-900/50">
            <p>Hogan Group &middot; Delivery Portal</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
