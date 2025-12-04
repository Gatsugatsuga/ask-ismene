// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import RootProvider from "./RootProvider";

export const metadata: Metadata = {
  title: "Ask Ismene",
  description:
    "Ask Ismene is an onchain art booth on Base: bring a messy, tender or confusing question, and receive a one-of-one artwork in return.",
  metadataBase: new URL("https://ask-ismene.vercel.app"),
  openGraph: {
    title: "Ask Ismene",
    description:
      "Bring a messy, tender or confusing question, and receive a one-of-one artwork in return.",
    url: "https://ask-ismene.vercel.app",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#f9f3f1] text-slate-900">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
