import type { Metadata, Viewport } from "next";
import "@fontsource-variable/newsreader";
import "@fontsource-variable/archivo";
import "@fontsource-variable/martian-mono";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Proofline: scattered evidence, one traceable story",
    template: "%s · Proofline",
  },
  description:
    "Proofline turns screenshots, documents, messages, receipts and audio into a structured timeline where every important claim leads back to its source.",
  openGraph: {
    title: "Proofline",
    description: "Scattered evidence. One traceable story.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#e9e7e1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-surface"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
