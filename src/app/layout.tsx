import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Fogli di lavoro · Manuten & Clean",
  description:
    "Compilazione e archivio digitale dei fogli di lavoro di Manuten & Clean.",
  applicationName: "Fogli di lavoro",
  appleWebApp: {
    capable: true,
    title: "Fogli di lavoro",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#086660",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
