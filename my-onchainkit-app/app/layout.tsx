// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { RootProvider } from "./rootProvider";

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
  other: {
    // Farcaster Mini App embed config
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: "https://ask-ismene.vercel.app/icon.png",
      button: {
        title: "Open App",
        action: {
          type: "launch_frame",
          name: "ask-ismene",
          url: "https://ask-ismene.vercel.app",
        },
      },
    }),
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#f9f3f1] text-slate-900">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.IS_FARCASTER =
                typeof window !== "undefined" &&
                (navigator.userAgent.includes("Warpcast") ||
                 navigator.userAgent.includes("Farcaster"));
            `,
          }}
        />
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#f9f3f1] text-slate-900">
        {/* Inject env flag so the app knows when it runs inside Farcaster */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.IS_FARCASTER =
                typeof window !== "undefined" &&
                (navigator.userAgent.includes("Warpcast") ||
                 navigator.userAgent.includes("Farcaster"));
            `,
          }}
        />
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
