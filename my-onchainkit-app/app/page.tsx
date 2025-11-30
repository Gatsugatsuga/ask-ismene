"use client";

import React, { useEffect, useState, CSSProperties } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import type { Abi } from "viem";
import { useProfile } from "@farcaster/auth-kit";
import { sdk } from "@farcaster/miniapp-sdk";

import { abi as askIsmeneBoothAbi } from "@/lib/abi/askIsmene";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  process.env.CONTRACT_ADDRESS ||
  "";

const USDC_ADDRESS =
  (process.env.NEXT_PUBLIC_USDC || process.env.USDC_ADDRESS || "") as
    | `0x${string}`
    | "";

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
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

function getChainLabel(chainId: number | undefined) {
  if (!chainId) return "Unknown network";
  if (chainId === 8453) return "Base mainnet";
  if (chainId === 84532) return "Base Sepolia (testnet)";
  return `Chain ID ${chainId}`;
}

function formatPriceInUsdCents(
  price: bigint | null | undefined,
  decimals = 6
): string | null {
  if (price == null) return null;

  const priceStr = price.toString().padStart(decimals + 1, "0");
  const len = priceStr.length;
  const integerPart = priceStr.slice(0, len - decimals);
  const decimalPart = priceStr.slice(len - decimals, len - decimals + 2);
  return `$${integerPart}.${decimalPart}`;
}

function formatBigintToTokens(price: bigint | null | undefined): string | null {
  if (price == null) return null;

  const decimals = 6;
  const priceStr = price.toString().padStart(decimals + 1, "0");
  const len = priceStr.length;
  const integerPart = priceStr.slice(0, len - decimals);
  const decimalPart = priceStr.slice(len - decimals).replace(/0+$/, "") || "0";

  return `${integerPart}.${decimalPart}`;
}

function formatCardStyle(active: boolean): CSSProperties {
  return {
    ...formatCardBase,
    borderColor: active ? "#a4bad6" : "#e5e5e5",
    boxShadow: active
      ? "0 0 0 1px rgba(164, 186, 214, 0.4), 0 14px 30px rgba(15, 23, 42, 0.25)"
      : "0 10px 25px rgba(148, 163, 184, 0.35)",
    transform: active ? "translateY(-1px)" : "translateY(0)",
  };
}

function getPriceLabel(format: Format, priceHaiku: bigint | null, priceVisual: bigint | null, priceOmakase: bigint | null): string {
  switch (format) {
    case "haiku":
      return formatPriceInUsdCents(priceHaiku) ?? "—";
    case "visual":
      return formatPriceInUsdCents(priceVisual) ?? "—";
    case "omakase":
      return formatPriceInUsdCents(priceOmakase) ?? "—";
    default:
      return "—";
  }
}

function getPriceDetail(
  format: Format,
  priceHaiku: bigint | null,
  priceVisual: bigint | null,
  priceOmakase: bigint | null
): string {
  const priceTokensHaiku = formatBigintToTokens(priceHaiku);
  const priceTokensVisual = formatBigintToTokens(priceVisual);
  const priceTokensOmakase = formatBigintToTokens(priceOmakase);

  switch (format) {
    case "haiku":
      return priceTokensHaiku ? `${priceTokensHaiku} USDC` : "—";
    case "visual":
      return priceTokensVisual ? `${priceTokensVisual} USDC` : "—";
    case "omakase":
      return priceTokensOmakase ? `${priceTokensOmakase} USDC` : "—";
    default:
      return "—";
  }
}

export default function Page() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const { isAuthenticated, profile } = useProfile();
  const [step, setStep] = useState<Step>("hero");
  const [format, setFormat] = useState<Format | null>(null);
  const [question, setQuestion] = useState("");
  const [isConsentChecked, setIsConsentChecked] = useState(false);

  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sdkDebug, setSdkDebug] = useState<string | null>(null);

  const {
    data: writeHash,
    writeContractAsync,
    isPending,
  } = useWriteContract();
  const { isLoading: waitingReceipt, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const envOk = Boolean(CONTRACT_ADDRESS) && Array.isArray(askIsmeneBoothAbi);
  const canWrite = envOk;

  const chainLabel = getChainLabel(chainId);
  const modeLabel = canWrite ? "On-chain" : "Dry-run";
  const modeHint = canWrite
    ? "Your question will be sent to the contract on Base."
    : "No write function detected — this stays as an experimental booth.";

  const isSubmitting = step === "sending" || isPending;

  // Read prices + USDC address
  const { data: priceHaikuRaw } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: askIsmeneBoothAbi as Abi,
    functionName: "PRICE_HAIKU",
  });

  const { data: priceVisualRaw } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: askIsmeneBoothAbi as Abi,
    functionName: "PRICE_VISUAL",
  });

  const { data: priceOmakaseRaw } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: askIsmeneBoothAbi as Abi,
    functionName: "PRICE_OMAKASE",
  });

  const { data: usdcAddress } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: askIsmeneBoothAbi as Abi,
    functionName: "usdc",
  });

  const priceHaiku = (priceHaikuRaw as bigint | undefined) ?? null;
  const priceVisual = (priceVisualRaw as bigint | undefined) ?? null;
  const priceOmakase = (priceOmakaseRaw as bigint | undefined) ?? null;

  function getPriceForFormat(): bigint | null {
    switch (format) {
      case "haiku":
        return priceHaiku;
      case "visual":
        return priceVisual;
      case "omakase":
        return priceOmakase;
      default:
        return null;
    }
  }

  useEffect(() => {
    if (confirmed) {
      setStep("success");
    }
  }, [confirmed]);

  // Farcaster Mini App ready() handling + visible debug
  useEffect(() => {
    if (typeof window === "undefined") return;

    setSdkDebug("effect mounted (mini app)");

    let cancelled = false;

    (async () => {
      try {
        setSdkDebug("calling sdk.actions.ready()...");
        await sdk.actions.ready();
        if (cancelled) {
          setSdkDebug("ready() call aborted (cleanup)");
          return;
        }
        setSdkDebug("ready() called successfully");
        console.log("[Ismene] sdk.actions.ready() called (mini app)");
      } catch (err: unknown) {
        const msg =
          err instanceof Error && typeof err.message === "string"
            ? err.message
            : String(err);
        setSdkDebug("error: " + msg);
        console.error(
          "[Ismene] Failed to call sdk.actions.ready() (mini app)",
          err
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelectFormat(next: Format) {
    setFormat(next);
    setErrorMsg(null);
    setStep("form");
  }

  function handleBack() {
    setErrorMsg(null);
    if (step === "form") {
      setStep("format");
      return;
    }
    if (step === "format") {
      setFormat(null);
      setStep("hero");
      return;
    }
    if (step === "success" || step === "error") {
      setStep("hero");
      setFormat(null);
      setQuestion("");
      setIsConsentChecked(false);
      setTxHash(undefined);
      return;
    }

    setStep("hero");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!format) {
      setErrorMsg("Please choose a format first.");
      return;
    }

    if (!question.trim()) {
      setErrorMsg("Please share your question or situation.");
      return;
    }

    if (!isConsentChecked) {
      setErrorMsg("Please confirm you understand these are artworks, not advice.");
      return;
    }

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

      if (!address) {
        setErrorMsg("Please connect your wallet first.");
        setStep("error");
        return;
      }

      if (!CONTRACT_ADDRESS) {
        setErrorMsg("Contract not configured. Please try again later.");
        setStep("error");
        return;
      }

      const resolvedUsdcAddress =
        (usdcAddress as `0x${string}` | undefined) ||
        (USDC_ADDRESS as `0x${string}` | undefined);

      if (!resolvedUsdcAddress) {
        setErrorMsg(
          "USDC address not available yet. Please refresh and try again."
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

      const formatId = BigInt(formatMap[format as Format]);
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
        address: resolvedUsdcAddress as `0x${string}`,
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

      setTxHash(askHash as `0x${string}`);
    } catch (err: unknown) {
      console.error("[Ismene] handleSend error:", err);
      const message =
        err instanceof Error && typeof err.message === "string"
          ? err.message
          : "Something went wrong while sending your question.";
      setErrorMsg(message);
      setStep("error");
    }
  }

  const currentPriceLabel = format
    ? getPriceLabel(format, priceHaiku, priceVisual, priceOmakase)
    : "—";

  const currentPriceDetail = format
    ? getPriceDetail(format, priceHaiku, priceVisual, priceOmakase)
    : "—";

  const isFormStep = step === "form" || step === "sending";
  const isSuccessStep = step === "success";
  const isErrorStep = step === "error";

  return (
    <div style={page}>
      <div style={shell}>
        <div style={header}>
          <div style={avatarWrapper}>
            <div style={avatarInner}>
              <span style={avatarEmoji}>🫖</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={titleRow}>
              <h1 style={title}>Ask me a question, ask me for magic ✨</h1>
            </div>
            <p style={subtitle}>
              Bring me something messy, tender, confusing, or weird — I&apos;ll
              send back a small piece of contemplative art, linked to you and
              living onchain.
            </p>
          </div>
        </div>

        <div style={outerCard}>
          {step === "hero" && (
            <div>
              <div style={sectionLabel}>How this works</div>
              <p style={bodyText}>
                Share your question or situation, choose how you want it
                answered, and I&apos;ll create something just for you. Think of
                it as a quiet, slightly witchy conversation in art form.
              </p>

              <div style={stepsGrid}>
                <div style={stepCard}>
                  <div style={stepNumber}>1</div>
                  <div style={stepText}>
                    <div style={stepTitle}>Choose your format</div>
                    <div style={stepBody}>
                      Haiku, digital collage, or both. Follow your instinct —
                      not the price.
                    </div>
                  </div>
                </div>

                <div style={stepCard}>
                  <div style={stepNumber}>2</div>
                  <div style={stepText}>
                    <div style={stepTitle}>Tell me what&apos;s alive in you</div>
                    <div style={stepBody}>
                      A dilemma, a knot, something tender or unresolved. The
                      more honest, the better.
                    </div>
                  </div>
                </div>

                <div style={stepCard}>
                  <div style={stepNumber}>3</div>
                  <div style={stepText}>
                    <div style={stepTitle}>Receive your 1/1 onchain</div>
                    <div style={stepBody}>
                      I&apos;ll create and mint your piece on Base within 48
                      hours, then DM you the link.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 22 }}>
                <button
                  type="button"
                  style={primaryButtonStyle}
                  onClick={() => setStep("format")}
                >
                  Ask me for magic
                </button>
              </div>

              <div style={footnote}>
                <span style={{ fontWeight: 500 }}>Note.</span> This is an
                experiment in care, creativity, and meaning-making. It&apos;s
                not therapy, coaching, or financial advice.
              </div>
            </div>
          )}

          {step === "format" && (
            <div>
              <div style={sectionHeader}>
                <button
                  type="button"
                  onClick={handleBack}
                  style={backButton}
                >
                  ← Back
                </button>
                <div style={sectionLabel}>Choose your format</div>
              </div>

              <p style={bodyText}>
                Go with what feels right in your body, not what seems the most
                &quot;worth it&quot;. Each option is a different way of
                holding your question.
              </p>

              <div style={formatGrid}>
                <button
                  type="button"
                  onClick={() => handleSelectFormat("haiku")}
                  style={formatCardStyle(format === "haiku")}
                >
                  <div style={formatTitleRow}>
                    <div style={formatTitle}>Haiku</div>
                    <div style={pill}>
                      <span style={pillDot} />
                      <span style={pillText}>
                        {getPriceLabel("haiku", priceHaiku, priceVisual, priceOmakase)}
                      </span>
                    </div>
                  </div>
                  <div style={formatBody}>
                    Your situation distilled into a three-line poem. Minimal,
                    sharp, sometimes a little brutal, always kind.
                  </div>
                  <div style={formatFootnote}>
                    {/* eslint-disable-next-line react/no-unescaped-entities */}
                    For when you want language more than image.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectFormat("visual")}
                  style={formatCardStyle(format === "visual")}
                >
                  <div style={formatTitleRow}>
                    <div style={formatTitle}>Digital Collage</div>
                    <div style={pill}>
                      <span style={pillDot} />
                      <span style={pillText}>
                        {getPriceLabel("visual", priceHaiku, priceVisual, priceOmakase)}
                      </span>
                    </div>
                  </div>
                  <div style={formatBody}>
                    A single image built from fragments — textures, symbols,
                    glitches, soft chaos. Something you can come back to.
                  </div>
                  <div style={formatFootnote}>
                    {/* eslint-disable-next-line react/no-unescaped-entities */}
                    For when words feel too sharp and you&apos;d rather look.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectFormat("omakase")}
                  style={formatCardStyle(format === "omakase")}
                >
                  <div style={formatTitleRow}>
                    <div style={formatTitle}>Haiku + Digital Collage</div>
                    <div style={pill}>
                      <span style={pillDot} />
                      <span style={pillText}>
                        {getPriceLabel("omakase", priceHaiku, priceVisual, priceOmakase)}
                      </span>
                    </div>
                  </div>
                  <div style={formatBody}>
                    Let me choose how to respond. You bring the question, I take
                    care of the container.
                  </div>
                  <div style={formatFootnote}>
                    {/* eslint-disable-next-line react/no-unescaped-entities */}
                    For when you don&apos;t know what you need yet.
                  </div>
                </button>
              </div>

              <div style={{ marginTop: 22 }}>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={handleBack}
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {isFormStep && (
            <form onSubmit={handleSubmit}>
              <div style={sectionHeader}>
                <button
                  type="button"
                  onClick={handleBack}
                  style={backButton}
                  disabled={isSubmitting}
                >
                  ← Back
                </button>
                <div style={sectionLabel}>Tell me what&apos;s alive in you</div>
              </div>

              <p style={bodyText}>
                There&apos;s no &quot;right&quot; way to ask. You can be very
                precise, or you can ramble. You can write about something
                deeply practical or very abstract. I&apos;ll read it all.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="format"
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  You chose
                </label>
                <div style={formatSummaryRow}>
                  <div>
                    <div style={formatSummaryLabel}>
                      {format === "haiku" && "Haiku"}
                      {format === "visual" && "Digital collage"}
                      {format === "omakase" && "Haiku + digital collage"}
                    </div>
                    <div style={formatSummaryPrice}>
                      {currentPriceDetail}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={formatChangeButton}
                    onClick={() => setStep("format")}
                    disabled={isSubmitting}
                  >
                    Change
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="question"
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  What&apos;s the question, knot, or situation?
                </label>
                <textarea
                  id="question"
                  name="question"
                  rows={5}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Tell me what you&apos;re carrying. Context, feelings, what you&apos;ve tried, what you&apos;re afraid of, what you secretly want..."
                  style={textarea}
                  disabled={isSubmitting}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    fontSize: 12,
                    color: "#4b5563",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isConsentChecked}
                    onChange={(e) => setIsConsentChecked(e.target.checked)}
                    disabled={isSubmitting}
                    style={{
                      marginTop: 2,
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: "1px solid #d1d5db",
                    }}
                  />
                  <span>
                    I understand these are artworks, not therapy, coaching, or
                    financial advice. I won&apos;t share sensitive personal
                    data, and I&apos;m ok with this living onchain.
                  </span>
                </label>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#374151",
                    marginBottom: 6,
                  }}
                >
                  What you&apos;ll receive
                </div>
                <div style={expectationsBox}>
                  <p style={expectationText}>
                    A 1/1 piece minted on Base within 48 hours. I&apos;ll send
                    you:
                  </p>
                  <ul style={expectationList}>
                    <li>
                      A contemplative piece (haiku, collage, or both) created
                      from your question.
                    </li>
                    <li>
                      The token in your wallet, plus a DM on Farcaster with the
                      link.
                    </li>
                    <li>
                      A small, private ritual of attention — I&apos;ll sit with
                      what you share.
                    </li>
                  </ul>
                  <p style={expectationText}>
                    This is an experiment. I care deeply, but I&apos;m not a
                    therapist, lawyer, or financial advisor.
                  </p>
                  <p style={expectationText}>
                    If I truly have no response for your question, I&apos;ll
                    return your payment. Otherwise, no refunds — consider it a
                    delicate and deeply appreciated gesture of support, both
                    toward me and toward sayILY.art.
                  </p>
                  <p style={expectationText}>
                    If it doesn&apos;t immediately click, think of it as a fancy
                    tea or a nice meal you&apos;d have gifted a stranger — a
                    pretty cool gesture in itself. If we vibe and you&apos;re in
                    Tokyo, matcha&apos;s on me.
                  </p>
                  <p style={expectationText}>
                    By submitting, you confirm you&apos;re 18+, you won&apos;t
                    share sensitive personal data, and you understand these are
                    artworks, not professional advice.
                  </p>
                </div>
              </div>

              {/* Farcaster connection block */}
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 10,
                  borderTop: "1px dashed #E5E7EB",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Farcaster connection
                </div>

                {isAuthenticated && profile ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#4b5563",
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#F3F4F6",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#16a34a",
                      }}
                    />
                    <span>
                      Connected as{" "}
                      <strong>@{profile.username ?? "farcaster-user"}</strong>
                      {typeof profile.fid === "number"
                        ? ` (fid: ${profile.fid})`
                        : ""}
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      Connect with Farcaster so I can DM you your piece when
                      it&apos;s minted.
                    </span>
                  </div>
                )}
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
                    border: "1px solid #FCA5A5",
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <button
                  type="submit"
                  style={primaryButtonStyle}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? waitingReceipt
                      ? "Waiting for confirmation..."
                      : "Sending..."
                    : "Send to Ismène"}
                </button>
              </div>
            </form>
          )}

          {isSuccessStep && (
            <div>
              <div style={sectionHeader}>
                <button
                  type="button"
                  onClick={handleBack}
                  style={backButton}
                >
                  ← Back
                </button>
                <div style={sectionLabel}>Thank you</div>
              </div>

              <p style={bodyText}>
                I&apos;ve received your question and I&apos;ll sit with it
                carefully. I&apos;ll create your piece and mint it on Base
                within 48 hours.
              </p>

              <div style={successBox}>
                <div style={successIcon}>✨</div>
                <div style={successText}>
                  <div style={successTitle}>What happens next</div>
                  <ul style={expectationList}>
                    <li>I create your artwork in the selected format.</li>
                    <li>
                      I mint it as a 1/1 on Base, linked to your wallet and
                      Farcaster identity.
                    </li>
                    <li>
                      I DM you the link on Farcaster so you can view and hold
                      it.
                    </li>
                  </ul>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => {
                    setStep("hero");
                    setFormat(null);
                    setQuestion("");
                    setIsConsentChecked(false);
                    setTxHash(undefined);
                    setErrorMsg(null);
                  }}
                >
                  Ask another question
                </button>
              </div>
            </div>
          )}

          {isErrorStep && (
            <div>
              <div style={sectionHeader}>
                <button
                  type="button"
                  onClick={handleBack}
                  style={backButton}
                >
                  ← Back
                </button>
                <div style={sectionLabel}>Something went wrong</div>
              </div>

              <p style={bodyText}>
                Your question wasn&apos;t sent and you weren&apos;t charged. You
                can try again, or if this keeps happening, DM me on Farcaster
                and I&apos;ll look into it.
              </p>

              {errorMsg && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: "#b91c1c",
                    background: "#FEF2F2",
                    borderRadius: 10,
                    padding: "8px 10px",
                    border: "1px solid #FCA5A5",
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  style={primaryButtonStyle}
                  onClick={() => {
                    setStep("form");
                    setErrorMsg(null);
                  }}
                >
                  Back to form
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={footer}>
          <div style={footerLeft}>
            <div style={miniLabel}>Mode</div>
            <div style={miniValue}>
              {modeLabel} · <span style={{ opacity: 0.85 }}>{chainLabel}</span>
            </div>
            <div style={miniHint}>{modeHint}</div>
          </div>
          <div style={footerRight}>
            <div style={miniLabel}>Contract</div>
            <div style={miniValue}>
              {CONTRACT_ADDRESS
                ? `${CONTRACT_ADDRESS.slice(0, 6)}…${CONTRACT_ADDRESS.slice(
                    -4
                  )}`
                : "Not configured"}
            </div>
            <div style={miniLabel}>
              Wallet{" "}
              <span style={{ opacity: 0.9 }}>
                {address
                  ? `${address.slice(0, 6)}…${address.slice(-4)}`
                  : "Not connected"}
              </span>
            </div>
          </div>
        </div>

        {process.env.NODE_ENV !== "production" && (
          <div style={debugBox}>
            <div style={debugTitle}>Mini app debug</div>
            <div style={debugLine}>
              <span>Env-ok:</span> <code>{envOk ? "yes" : "no"}</code>
            </div>
            <div style={debugLine}>
              <span>SDK ready:</span>{" "}
              <code>{sdkDebug ?? "waiting for ready()…"}</code>
            </div>
            <div style={debugLine}>
              <span>Authenticated:</span>{" "}
              <code>{isAuthenticated ? "yes" : "no"}</code>
            </div>
            <div style={debugLine}>
              <span>Profile:</span>{" "}
              <code>
                {profile
                  ? `fid=${profile.fid}, @${profile.username ?? "unknown"}`
                  : "none"}
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles

const page: CSSProperties = {
  minHeight: "100vh",
  padding: 16,
  background:
    "radial-gradient(circle at top left, #f3f4ff 0%, #e5ecff 30%, #f9fafb 100%)",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
};

const shell: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const header: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
};

const avatarWrapper: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: "50%",
  background:
    "radial-gradient(circle at top left, #ffffff 0%, #d3e1ff 40%, #a4bad6 100%)",
  padding: 2,
  boxShadow: "0 10px 30px rgba(148, 163, 184, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const avatarInner: CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  background: "#0f172a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const avatarEmoji: CSSProperties = {
  fontSize: 24,
};

const titleRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
};

const title: CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: "#111827",
};

const subtitle: CSSProperties = {
  fontSize: 13,
  color: "#4b5563",
  marginTop: 2,
};

const outerCard: CSSProperties = {
  background: "rgba(255, 255, 255, 0.96)",
  borderRadius: 24,
  padding: 16,
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.35)",
  border: "1px solid rgba(226, 232, 240, 0.9)",
};

const sectionHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 8,
};

const sectionLabel: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.02,
  color: "#4b5563",
  textTransform: "uppercase",
};

const bodyText: CSSProperties = {
  fontSize: 13,
  color: "#374151",
  lineHeight: 1.55,
  marginBottom: 16,
};

const stepsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  marginTop: 12,
};

const stepCard: CSSProperties = {
  borderRadius: 18,
  border: "1px solid #e5e7eb",
  padding: 12,
  background: "#F9FAFB",
  display: "flex",
  gap: 10,
};

const stepNumber: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  background: "#E5EDFF",
  color: "#1d4ed8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 600,
};

const stepText: CSSProperties = {
  flex: 1,
};

const stepTitle: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "#111827",
  marginBottom: 2,
};

const stepBody: CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
};

const footnote: CSSProperties = {
  marginTop: 14,
  fontSize: 11,
  color: "#6b7280",
};

const backButton: CSSProperties = {
  fontSize: 12,
  color: "#4b5563",
  borderRadius: 999,
  border: "1px solid #D1D5DB",
  padding: "4px 10px",
  background: "#F9FAFB",
  cursor: "pointer",
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

const formatTitleRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
};

const formatTitle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "#111827",
};

const formatBody: CSSProperties = {
  fontSize: 12,
  color: "#4b5563",
  lineHeight: 1.5,
};

const formatFootnote: CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  color: "#6b7280",
};

const pill: CSSProperties = {
  borderRadius: 999,
  background: "#EEF2FF",
  padding: "4px 8px",
  fontSize: 11,
  color: "#1e3a8a",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

const pillDot: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#4f46e5",
};

const pillText: CSSProperties = {
  fontWeight: 500,
};

const formatSummaryRow: CSSProperties = {
  borderRadius: 14,
  border: "1px solid #E5E7EB",
  padding: 10,
  background: "#F9FAFB",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const formatSummaryLabel: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "#111827",
};

const formatSummaryPrice: CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
};

const formatChangeButton: CSSProperties = {
  fontSize: 11,
  color: "#1d4ed8",
  borderRadius: 999,
  border: "1px solid #BFDBFE",
  padding: "4px 10px",
  background: "#EFF6FF",
  cursor: "pointer",
};

const textarea: CSSProperties = {
  width: "100%",
  borderRadius: 16,
  border: "1px solid #E5E7EB",
  padding: 10,
  fontSize: 13,
  color: "#111827",
  resize: "vertical",
  minHeight: 100,
  background: "#F9FAFB",
};

const expectationsBox: CSSProperties = {
  borderRadius: 18,
  border: "1px solid #E5E7EB",
  padding: 12,
  background:
    "linear-gradient(120deg, rgba(248, 250, 252, 0.96), rgba(239, 246, 255, 0.96))",
};

const expectationText: CSSProperties = {
  fontSize: 12,
  color: "#4b5563",
  marginBottom: 6,
};

const expectationList: CSSProperties = {
  paddingLeft: 18,
  fontSize: 12,
  color: "#4b5563",
  marginBottom: 6,
};

const primaryButtonStyle: CSSProperties = {
  borderRadius: 999,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 500,
  border: "none",
  cursor: "pointer",
  background:
    "radial-gradient(circle at top left, #ffffff 0%, #c5d4ec 30%, #a4bad6 100%)",
  color: "#111827",
  boxShadow: "0 10px 25px rgba(148, 163, 184, 0.45)",
};

const secondaryButtonStyle: CSSProperties = {
  borderRadius: 999,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 500,
  border: "1px solid #D1D5DB",
  cursor: "pointer",
  background: "#F9FAFB",
  color: "#111827",
};

const footer: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  fontSize: 11,
  color: "#6b7280",
};

const footerLeft: CSSProperties = {
  flex: 1,
};

const footerRight: CSSProperties = {
  textAlign: "right",
};

const miniLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "#6b7280",
};

const miniValue: CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "#111827",
};

const miniHint: CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
};

const successBox: CSSProperties = {
  marginTop: 12,
  borderRadius: 18,
  border: "1px solid #DCFCE7",
  padding: 12,
  background:
    "linear-gradient(120deg, rgba(240, 253, 250, 0.96), rgba(220, 252, 231, 0.96))",
  display: "flex",
  gap: 10,
};

const successIcon: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: "50%",
  background: "#22C55E",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ECFDF5",
  fontSize: 16,
};

const successText: CSSProperties = {
  flex: 1,
};

const successTitle: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "#14532D",
  marginBottom: 4,
};

const debugBox: CSSProperties = {
  marginTop: 10,
  borderRadius: 16,
  border: "1px dashed rgba(148, 163, 184, 0.6)",
  padding: 10,
  background: "rgba(15, 23, 42, 0.03)",
  fontSize: 11,
  color: "#4b5563",
};

const debugTitle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  marginBottom: 4,
};

const debugLine: CSSProperties = {
  display: "flex",
  gap: 4,
  alignItems: "baseline",
};

