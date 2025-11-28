"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/frame-sdk";

export default function FarcasterReady() {
  useEffect(() => {
    try {
      sdk.actions.ready();
      console.log("Farcaster Mini App ready()");
    } catch (e) {
      console.error("Failed to call sdk.actions.ready()", e);
    }
  }, []);

  return null;
}
