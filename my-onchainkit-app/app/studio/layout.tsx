"use client";

import React from "react";
import "@farcaster/auth-kit/styles.css";
import { AuthKitProvider } from "@farcaster/auth-kit";

const config = {
  // Optimism RPC used by Farcaster Auth under the hood.
  rpcUrl:
    process.env.NEXT_PUBLIC_OP_MAINNET_RPC_URL ??
    "https://mainnet.optimism.io",

  // These two just describe your app in the SIWF message.
  // You can tweak them later or move them to env vars.
  domain: "ask-ismene.studio",
  siweUri: "https://ask-ismene.studio/studio",
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthKitProvider config={config}>{children}</AuthKitProvider>;
}
