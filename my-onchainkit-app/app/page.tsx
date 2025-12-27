"use client";

import React, { useEffect, useState, type CSSProperties } from "react";

import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useConnect,
} from "wagmi";

import type { Abi } from "viem";
import { useProfile } from "@farcaster/auth-kit";
import { sdk } from "@farcaster/miniapp-sdk";

import { abi as askIsmeneBoothAbi } from "@/lib/abi/askIsmene";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  process.env.CONTRACT_ADDRESS ||
  "";

// NEW: USDC address from env (fallback if contract call fails)
const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_USDC_ADDRESS || "";
  
// removed: const IS_PAUSED = false;

type Step = "hero" | "format" | "form" | "sending" | "success" | "error";

type Format = "haiku" | "visual" | "omakase";

const formatMap: Record<Format, number> = {
  haiku: 0,
  visual: 1,
  omakase: 2,
};

// Minimal ERC-20 ABI (approve only)
const erc20Abi: Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "success", type: "bool", internalType: "bool" }],
  },
];

const boothPricingAbi: Abi = [
  {
    type: "function",
    name: "PRICE_HAIKU",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "PRICE_VISUAL",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "PRICE_OMAKASE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
];


// tiny helper type so we can call sdk.actions.ready() safely
type MiniAppSdkLike = {
  actions?: {
    ready?: () => void;
  };
};

function getChainLabel(chainId: number | undefined) {
  if (!chainId) return "Unknown chain";
  if (chainId === 8453) return "Base mainnet";
  if (chainId === 84532) return "Base Sepolia";
  if (chainId === 31337) return "Local dev (Hardhat)";
  return `Chain ID ${chainId}`;
}

/* ---------- Layout styles ---------- */

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  margin: 0,
  padding: 0,
  background:
    "linear-gradient(to bottom, #faf8ff 0%, #ffffff 50%, #fff8fb 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily:
    '-apple-system, system-ui, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
};

const shellStyle: CSSProperties = {
  width: "100%",
  maxWidth: 720,
  padding: "24px 16px 40px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const cardStyle: CSSProperties = {
  borderRadius: 24,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background:
    "radial-gradient(circle at top left, #ffffff 0%, #f8f5ff 40%, #ffffff 100%)",
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.06)",
  padding: 18,
  boxSizing: "border-box",
};

const smallCardStyle: CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(203, 213, 225, 0.7)",
  background: "rgba(248, 250, 252, 0.85)",
  padding: 10,
  boxSizing: "border-box",
};

const headerRowStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
};

const avatarStyle: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: "50%",
  border: "1px solid rgba(148, 163, 184, 0.6)",
  background:
    "radial-gradient(circle at 30% 20%, #ffffff 0%, #e5defa 40%, #a4bad6 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const headerTextStyle: CSSProperties = {
  flex: 1,
};

const pillRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const pillStyle: CSSProperties = {
  fontSize: 11,
  borderRadius: 999,
  padding: "4px 10px",
  border: "1px solid #e5e5e5",
  background: "#EEF2FF",
};

const pillMutedStyle: CSSProperties = {
  ...pillStyle,
  background: "#F9FAFB",
  borderColor: "#E5E7EB",
  color: "#6B7280",
};

const buttonBase: CSSProperties = {
  borderRadius: 999,
  padding: "10px 16px",
  border: "none",
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontWeight: 500,
};

const primaryButtonStyle: CSSProperties = {
  ...buttonBase,
  background:
    "radial-gradient(circle at top left, #ffffff 0%, #c5d4ec 30%, #a4bad6 100%)",
  color: "#111827",
  boxShadow: "0 10px 25px rgba(148, 163, 184, 0.45)",
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonBase,
  background: "#F9FAFB",
  color: "#111827",
  border: "1px solid #E5E7EB",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 140,
  borderRadius: 16,
  border: "1px solid rgba(209, 213, 219, 0.9)",
  padding: "10px 12px",
  boxSizing: "border-box",
  resize: "vertical",
  fontFamily:
    '-apple-system, system-ui, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
  fontSize: 14,
  lineHeight: 1.6,
  outline: "none",
  background: "rgba(255, 255, 255, 0.9)",
};

const checkboxRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  fontSize: 13,
};

const formatGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  marginTop: 12,
};

const formatCardBase: CSSProperties = {
  borderRadius: 18,
  border: "1px solid #e5e5e5",
  padding: 14,
  background: "#F9FAFB",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  cursor: "pointer",
};

function formatCardStyle(active: boolean): CSSProperties {
  return {
    ...formatCardBase,
    borderColor: active ? "#A4bad6" : "#e5e5e5",
    background: active ? "#EDF2FA" : "#F9FAFB",
  };
}

/* -------------------------------------------------------- */

export default function Page() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { profile } = useProfile();
  const { connectAsync, connectors } = useConnect();

  const [step, setStep] = useState<Step>("hero");
  const [format, setFormat] = useState<Format>("omakase");
  const [question, setQuestion] = useState("");
  const [consentShare, setConsentShare] = useState(false);
  const [noAI, setNoAI] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // NEW: booth paused state from /api/booth-status
  const [isPaused, setIsPaused] = useState(false);
  const [_pausedLoaded, setPausedLoaded] = useState(false);

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: waitingReceipt, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const envOk =
    Boolean(CONTRACT_ADDRESS) && Array.isArray(askIsmeneBoothAbi);

  const canWrite = envOk;

  const chainLabel = getChainLabel(chainId);
  const modeLabel = canWrite ? "On-chain" : "Dry-run";

  const modeHint = canWrite
    ? "Your question will be sent to the contract on Base."
    : "No write function detected — this stays as an experimental booth.";

  const isSubmitting = step === "sending" || isPending;

      // Read prices + USDC address
  const READ_CHAIN_ID = 8453; // Base mainnet

  const readEnabled = Boolean(CONTRACT_ADDRESS) && envOk;

  const { data: priceHaiku } = useReadContract({
    chainId: READ_CHAIN_ID,
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: boothPricingAbi,
    functionName: "PRICE_HAIKU",
    query: { enabled: readEnabled },
  });

  const { data: priceVisual } = useReadContract({
    chainId: READ_CHAIN_ID,
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: boothPricingAbi,
    functionName: "PRICE_VISUAL",
    query: { enabled: readEnabled },
  });

  const { data: priceOmakase } = useReadContract({
    chainId: READ_CHAIN_ID,
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: boothPricingAbi,
    functionName: "PRICE_OMAKASE",
    query: { enabled: readEnabled },
  });

  function getPriceForFormat(): bigint | null {
    if (!readEnabled) return null;

    switch (format) {
      case "haiku":
        return typeof priceHaiku === "bigint" ? priceHaiku : null;
      case "visual":
        return typeof priceVisual === "bigint" ? priceVisual : null;
      case "omakase":
        return typeof priceOmakase === "bigint" ? priceOmakase : null;
      default:
        return null;
    }
  }

  // Use USDC address from env (AskIsmeneBooth is deployed with this same address)
  const usdcAddress = USDC_ADDRESS
    ? (USDC_ADDRESS as `0x${string}`)
    : undefined;



  // Farcaster mini-app: mark content ready if we’re inside a mini-app
  useEffect(() => {
    try {
      const miniSdk = sdk as unknown as MiniAppSdkLike;
      miniSdk.actions?.ready?.();
    } catch (err) {
      // In case we're not inside a Farcaster mini app, avoid crashing
      console.error("Farcaster miniapp sdk.ready() failed", err);
    }
  }, []);

  useEffect(() => {
    if (confirmed) {
      setStep("success");
    }
  }, [confirmed]);

  // NEW: load paused status from API on mount
  useEffect(() => {
    let cancelled = false;

    async function loadPaused() {
      try {
        const res = await fetch("/api/booth-status");
        if (!res.ok) return;
        const data = (await res.json()) as { paused?: boolean };
        if (!cancelled && typeof data.paused === "boolean") {
          setIsPaused(data.paused);
        }
      } finally {
        if (!cancelled) setPausedLoaded(true);
      }
    }

    loadPaused();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleFormatChange(next: Format) {
    if (isSubmitting) return;
    setFormat(next);
    setStep("form");
  }

  async function handleSubmit() {
    setErrorMsg(null);

    // 1) Try to connect the Farcaster wallet automatically if not connected yet
    if (!isConnected) {
      const defaultConnector = connectors[0];

      if (!defaultConnector) {
        setErrorMsg(
          "Wallet connection is not available in this context. Please open this mini app in Warpcast with a wallet enabled."
        );
        return;
      }

      try {
        await connectAsync({ connector: defaultConnector });
      } catch (err) {
        console.error("Wallet connection failed", err);
        setErrorMsg(
          "Could not connect your Farcaster wallet. Please make sure you’re opening this mini app inside Warpcast with a wallet set up, then try again."
        );
        return;
      }
    }

    // 2) Validate question
    const q = question.trim();

    if (!q) {
      setErrorMsg("Please ask me a question.");
      return;
    }

    if (q.length > 500) {
      setErrorMsg("Keep it under 500 characters.");
      return;
    }

    // 3) Proceed to send (this will now have a connected wallet)
    await handleSend();
  }

  async function handleSend() {
    try {
      setErrorMsg(null);
      setStep("sending");

      // Dry-run (no contract configured) – just show success
      if (!canWrite) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        setStep("success");
        return;
      }

      if (!CONTRACT_ADDRESS) {
        setErrorMsg("Contract not configured. Please try again later.");
        setStep("error");
        return;
      }

      if (!usdcAddress) {
        setErrorMsg(
          "USDC address not available yet. Please refresh and try again.",
        );
        setStep("error");
        return;
      }

      const price = getPriceForFormat();
      if (!price) {
        setErrorMsg("Price not available for this format.");
        setStep("error");
        return;
      }

      const formatId = BigInt(formatMap[format]);
      const trimmedQuestion = question.trim();

      const farcasterUsername = profile?.username;
      const questionWithFarcaster =
        profile?.fid != null
          ? `[fid:${profile.fid}${
              farcasterUsername ? ` @${farcasterUsername}` : ""
            }] ${trimmedQuestion}`
          : trimmedQuestion;

      // 1) Approve USDC spend for the booth contract
      const approveHash = await writeContractAsync({
        address: usdcAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [CONTRACT_ADDRESS as `0x${string}`, price],
      });

      if (!approveHash) {
        throw new Error("USDC approval transaction not created");
      }

      // 2) Call ask(question, formatId)
      const askHash = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: askIsmeneBoothAbi as Abi,
        functionName: "ask",
        args: [questionWithFarcaster, formatId],
      });

      if (!askHash) {
        throw new Error("Ask transaction not created");
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Transaction failed or was rejected. Please try again.";
      setErrorMsg(message);
      setStep("error");
    }
  }

  const charCount = question.trim().length;

  return (
    <>
      <main style={pageStyle}>
        <div style={shellStyle}>
          {/* ENVIRONMENT LABEL */}
          <div style={smallCardStyle} className="fade-in-soft">
            <div style={pillRowStyle}>
              <span style={pillStyle}>Ask booth · Experimental</span>
              <span style={pillMutedStyle}>{chainLabel}</span>
              <span style={pillMutedStyle}>Mode {modeLabel}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 11 }}>
              <div>Contract: {CONTRACT_ADDRESS || "N/A"}</div>
              <div>Wallet: {address || "Not connected"}</div>
              <div>{modeHint}</div>
            </div>
          </div>

          {/* If you want, you could gate on pausedLoaded here,
              but keeping it simple: default = open until API says paused */}
          {isPaused ? (
            <div style={cardStyle} className="fade-in-soft">
              <h2
                className="ismene-heading"
                style={{ fontSize: 20, marginBottom: 10 }}
              >
                Ismene&apos;s workshop is closed right now ✨
              </h2>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  marginBottom: 10,
                  color: "#374151",
                }}
              >
                I only open for a few pieces at a time so I can stay fully
                present with each one—and right now I&apos;m deep into current
                commissions.
              </p>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  marginBottom: 10,
                  color: "#374151",
                }}
              >
                Feel free to turn on notifications on Farcaster to know when new
                slots open up.
              </p>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  marginBottom: 0,
                  color: "#374151",
                }}
              >
                Thank you for your patience and your trust! --Ismene
              </p>
            </div>
          ) : (
            <>
              {/* HERO */}
              {step === "hero" && (
                <div style={cardStyle} className="fade-in-soft">
                  <div style={headerRowStyle}>
                    <div style={avatarStyle}>
                      {/* leaving <img> as-is to avoid touching copy/layout */}
                      <img
                        src="/ismene.png"
                        alt="Ismène"
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                    <div style={headerTextStyle}>
                      <h1
                        className="ismene-heading"
                        style={{
                          fontSize: 24,
                          lineHeight: 1.2,
                          margin: 0,
                          marginBottom: 6,
                        }}
                      >
                        Ask me a question, ask me for magic ✨️
                      </h1>
                      <p
                        style={{
                          fontSize: 14,
                          lineHeight: 1.7,
                          margin: 0,
                          color: "#374151",
                        }}
                      >
                        I&apos;m{" "}
                        <a
                          href="https://linktr.ee/ismene"
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "#4b5563",
                            textDecoration: "underline",
                            textDecorationStyle: "dotted",
                          }}
                        >
                          Ismène
                        </a>{" "}
                        — a writer and visual artist based in Tokyo. I believe
                        in serendipity, symbolism, and the strange ways clarity
                        arrives when we stop forcing it.
                        <br />
                        <br />
                        Bring me something messy, tender, confusing — and I&apos;ll
                        answer in the language I know best: words, images, and
                        intuition, shaped into a 1/1 artwork. I work with guts,
                        pattern-spotting, and a soft heart. No guru stuff, no
                        ten-step frameworks — just presence, intuition, and
                        craft.
                        <br />
                        <br />
                        Your question becomes art, and art shifts perspective,
                        enough for something new to breathe.
                      </p>
                    </div>
                  </div>

                  <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
                    <button
                      style={primaryButtonStyle}
                      onClick={() => setStep("format")}
                    >
                      I&apos;m ready
                    </button>
                  </div>
                </div>
              )}

              {/* HOW IT WORKS */}
              {step === "format" && (
                <div style={cardStyle} className="fade-in-soft">
                  <h2
                    className="ismene-heading"
                    style={{ fontSize: 20, marginBottom: 10 }}
                  >
                    How it works
                  </h2>

                  <p
                    style={{
                      fontSize: 14,
                      marginBottom: 10,
                      lineHeight: 1.7,
                      color: "#4b5563",
                    }}
                  >
                    Think of this like a tiny omakase for your question: you
                    bring the real thing you&apos;re carrying, I bring time,
                    attention, and what I feel is right.
                  </p>

                  <ol
                    style={{
                      listStyle: "decimal",
                      paddingLeft: 20,
                      margin: 0,
                      fontSize: 14,
                      color: "#374151",
                      lineHeight: 1.7,
                    }}
                  >
                    <li style={{ marginBottom: 6 }}>
                      You ask me something genuine that&apos;s sitting on your
                      mind.
                    </li>
                    <li style={{ marginBottom: 6 }}>
                      You choose how you&apos;d like me to respond.
                    </li>
                    <li style={{ marginBottom: 6 }}>
                      I sit with your question offline and create a 1/1 artwork
                      in response.
                    </li>
                    <li>
                      Within 48 hours, I mint it on Base and DM you on
                      Farcaster with your piece.
                    </li>
                  </ol>

                  <p
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      color: "#4b5563",
                      lineHeight: 1.6,
                    }}
                  >
                    Note: My haikus follow the spirit of the form (brevity,
                    observation, feeling) rather than strict 5-7-5 syllables —
                    English doesn&apos;t breathe the same way Japanese does.
                  </p>

                  <p
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      color: "#4b5563",
                      lineHeight: 1.6,
                    }}
                  >
                    I keep this small — around 5 pieces per weekday — so I can
                    stay present with what you send.
                  </p>

                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      style={secondaryButtonStyle}
                      onClick={() => setStep("hero")}
                    >
                      Back
                    </button>
                    <button
                      style={primaryButtonStyle}
                      onClick={() => setStep("form")}
                    >
                      Ask me a question
                    </button>
                  </div>
                </div>
              )}

              {/* FORM: QUESTION + FORMAT (same page) */}
              {step === "form" && (
                <div style={cardStyle} className="fade-in-soft">
                  <h2
                    className="ismene-heading"
                    style={{ fontSize: 20, marginBottom: 10 }}
                  >
                    Ask me a question, ask me for magic ✨️
                  </h2>

                  <p
                    style={{
                      fontSize: 13,
                      color: "#4b5563",
                      marginBottom: 10,
                      lineHeight: 1.6,
                    }}
                  >
                    Bring me something real. It can be small and oddly specific
                    or quietly huge. I&apos;ll read it carefully.
                  </p>

                  {/* Question input */}
                  <div style={{ marginBottom: 12 }}>
                    <textarea
                      style={textareaStyle}
                      placeholder={`Examples:
Why do I keep buying plants I can't keep alive?
What would choosing myself look like here?
Is this creative block or am I avoiding something?`}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      maxLength={600}
                    />
                    <div
                      style={{
                        textAlign: "right",
                        fontSize: 11,
                        color: "#6B7280",
                        marginTop: 4,
                      }}
                    >
                      {charCount}/500
                    </div>
                  </div>

                  {/* Consent + AI toggle */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <label style={checkboxRowStyle}>
                      <input
                        type="checkbox"
                        checked={consentShare}
                        onChange={(e) => setConsentShare(e.target.checked)}
                        style={{ marginTop: 3 }}
                      />
                      <span style={{ color: "#374151" }}>
                        You&apos;re okay with your question (anonymized) and my
                        creative answer being shared on social networks.
                      </span>
                    </label>

                    <label style={checkboxRowStyle}>
                      <input
                        type="checkbox"
                        checked={noAI}
                        onChange={(e) => setNoAI(e.target.checked)}
                        style={{ marginTop: 3 }}
                      />
                      <span style={{ color: "#374151" }}>
                        Some visual elements may involve AI tools alongside
                        traditional techniques. Check this if you&apos;d prefer
                        I avoid AI assistance in your piece.
                      </span>
                    </label>
                  </div>

                  {/* Format selection */}
                  <div style={{ marginTop: 18 }}>
                    <h3
                      className="ismene-heading"
                      style={{ fontSize: 15, marginBottom: 4 }}
                    >
                      Pick your format
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#4b5563",
                        marginBottom: 8,
                      }}
                    >
                      You can&apos;t choose wrong — just what feels right for
                      this moment.
                    </p>

                    <div style={formatGrid}>
                      <button
                        type="button"
                        onClick={() => handleFormatChange("haiku")}
                        style={formatCardStyle(format === "haiku")}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 2,
                          }}
                        >
                          Haiku — $30
                        </div>
                        <div style={{ fontSize: 12, color: "#374151" }}>
                          Your dilemma, distilled into a few lines.
                          <br />
                          One breath, no rigid rules.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFormatChange("visual")}
                        style={formatCardStyle(format === "visual")}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 2,
                          }}
                        >
                          Digital Collage — $60
                        </div>
                        <div style={{ fontSize: 12, color: "#374151" }}>
                          A visual reading.
                          <br />
                          No text — just feeling.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFormatChange("omakase")}
                        style={formatCardStyle(format === "omakase")}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 2,
                          }}
                        >
                          Haiku + Digital Collage — $80
                        </div>
                        <div style={{ fontSize: 12, color: "#374151" }}>
                          Your question, rendered in both language and image.
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div
  style={{
    marginTop: 16,
    paddingTop: 10,
    borderTop: "1px dashed #E5E7EB",
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 1.7,
  }}
>
  <p style={{ marginBottom: 6 }}>
    This is an experiment. I care deeply, but I&apos;m not a therapist, lawyer, or
    financial advisor.
  </p>
  <p style={{ marginBottom: 6 }}>
    If I truly have no response for your question, I&apos;ll return your payment.
    Otherwise, no refunds — consider it a delicate and deeply appreciated gesture
    of support, both toward me and toward sayILY.art.
  </p>
  <p style={{ marginBottom: 6 }}>
    If it doesn&apos;t immediately click, think of it as a fancy tea or a nice meal
    you&apos;d have gifted a stranger — a pretty cool gesture in itself. If we vibe
    and you&apos;re in Tokyo, matcha&apos;s on me.
  </p>
  <p style={{ marginBottom: 6 }}>
    By submitting, you confirm you&apos;re 18+, you won&apos;t share sensitive personal
    data, and you understand these are artworks, not professional advice.
  </p>
  <p style={{ marginBottom: 0 }}>
    This contract is experimental and unaudited; use it with the same care you’d
    bring to any small onchain experience.
  </p>
</div>

                  {/* Error */}
                  {errorMsg && (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        color: "#b91c1c",
                        background: "#FEF2F2",
                        borderRadius: 10,
                        padding: "8px 10px",
                        border: "1px solid #FEE2E2",
                      }}
                    >
                      {errorMsg}
                    </div>
                  )}

                  {/* Actions */}
                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      style={secondaryButtonStyle}
                      type="button"
                      onClick={() => setStep("format")}
                      disabled={isSubmitting}
                    >
                      Back
                    </button>
                    <button
                      style={{
                        ...primaryButtonStyle,
                        opacity: isSubmitting ? 0.7 : 1,
                      }}
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Sending…" : "Send to Ismène"}
                    </button>
                  </div>
                </div>
              )}

              {/* SENDING */}
              {step === "sending" && (
                <div style={cardStyle} className="fade-in-soft">
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 48,
                        marginBottom: 16,
                        animation: "pulse 2s ease-in-out infinite",
                      }}
                    >
                      ✨
                    </div>
                    <p
                      style={{
                        fontSize: 15,
                        color: "#6b7280",
                        marginBottom: 8,
                      }}
                    >
                      {isPending && "Waiting for wallet confirmation..."}
                      {waitingReceipt &&
                        !isPending &&
                        "Transaction submitted! Confirming..."}
                      {!isPending &&
                        !waitingReceipt &&
                        "Sending your question to Ismène..."}
                    </p>
                    {txHash && (
                      <p style={{ fontSize: 11, color: "#9ca3af" }}>
                        {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* SUCCESS */}
              {step === "success" && (
                <div style={cardStyle} className="fade-in-soft">
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "rgba(164, 186, 214, 0.15)",
                        marginBottom: 16,
                      }}
                    >
                      <span style={{ fontSize: 32 }}>✨</span>
                    </div>

                    <h2
                      className="ismene-heading"
                      style={{ fontSize: 20, marginBottom: 12 }}
                    >
                      Got it ✨
                    </h2>

                    <p
                      style={{
                        fontSize: 15,
                        lineHeight: 1.7,
                        marginBottom: 12,
                      }}
                    >
                      Your question reached me. I&apos;ll sit with it and create
                      your piece within 48 hours.
                    </p>

                    <p
                      style={{
                        fontSize: 14,
                        color: "#6b7280",
                        lineHeight: 1.6,
                      }}
                    >
                      You&apos;ll receive a DM on Farcaster when your 1/1 is
                      minted and ready.
                    </p>

                    {txHash && (
                      <details
                        style={{
                          marginTop: 16,
                          fontSize: 11,
                          textAlign: "left",
                        }}
                      >
                        <summary
                          style={{
                            cursor: "pointer",
                            color: "#6b7280",
                          }}
                        >
                          View transaction details
                        </summary>
                        <code
                          style={{
                            display: "block",
                            marginTop: 8,
                            padding: 10,
                            background: "#F9FAFB",
                            borderRadius: 8,
                            wordBreak: "break-all",
                            fontSize: 10,
                            fontFamily: "monospace",
                          }}
                        >
                          {txHash}
                        </code>
                      </details>
                    )}

                    <p
                      style={{
                        fontSize: 13,
                        color: "#9ca3af",
                        marginTop: 20,
                        fontStyle: "italic",
                        borderTop: "1px solid #e5e5e5",
                        paddingTop: 16,
                      }}
                    >
                      If it doesn&apos;t immediately click, think of it as a
                      fancy tea you&apos;d have bought a stranger — a pretty
                      cool gesture in itself. If we vibe and you&apos;re in
                      Tokyo, matcha&apos;s on me 🍵
                    </p>
                  </div>
                </div>
              )}

              {/* ERROR */}
              {step === "error" && (
                <div style={cardStyle} className="fade-in-soft">
                  <h2
                    className="ismene-heading"
                    style={{ fontSize: 20, marginBottom: 12 }}
                  >
                    Something went wrong
                  </h2>

                  <div
                    style={{
                      fontSize: 14,
                      color: "#dc2626",
                      padding: 12,
                      background: "#FEF2F2",
                      borderRadius: 12,
                      marginBottom: 12,
                      border: "1px solid #FEE2E2",
                    }}
                  >
                    {errorMsg}
                  </div>

                  <p
                    style={{
                      fontSize: 13,
                      color: "#6b7280",
                      marginBottom: 16,
                      lineHeight: 1.6,
                    }}
                  >
                    Don&apos;t worry — your question wasn&apos;t sent and you
                    weren&apos;t charged. Try again, or DM me on Farcaster if
                    this keeps happening.
                  </p>

                  <button
                    style={{ ...secondaryButtonStyle, width: "100%" }}
                    onClick={() => setStep("form")}
                  >
                    Back to form
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <style jsx global>{`
        .fade-in-soft {
          animation: fadeInSoft 0.5s ease-out;
        }

        @keyframes fadeInSoft {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
      `}</style>
    </>
  );
}
