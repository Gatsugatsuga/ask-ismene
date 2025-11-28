"use client";
import { useState } from "react";
import {
  AuthKitProvider,
  SignInButton,
  useProfile
} from "@farcaster/auth-kit";

const config = {
  rpcUrl: "https://mainnet.optimism.io",
  domain: "my-onchainkit-app.vercel.app",
  redirectUrl: "https://my-onchainkit-app.vercel.app"
};

export default function FarcasterLogin() {
  return (
    <AuthKitProvider config={config}>
      <InnerLogin />
    </AuthKitProvider>
  );
}

function InnerLogin() {
  const { profile, isLoading } = useProfile();

  if (isLoading) return null;

  if (!profile) {
    return (
      <div style={{ marginBottom: 12 }}>
        <SignInButton />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 10, fontSize: 13, color: "#4b5563" }}>
      Logged in as @{profile?.username} (FID {profile?.fid})
    </div>
  );
}
