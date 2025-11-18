"use client";

import React, { useEffect, useState, CSSProperties } from "react";
import { useAccount, useChainId } from "wagmi";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Abi } from "viem";

// Import booth ABI JSON from project root
import askIsmeneBoothAbiJson from "../abi.askIsmeneBooth.json";

// Cast JSON to Abi
const askIsmeneBoothAbi = askIsmeneBoothAbiJson as Abi;

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  process.env.CONTRACT_ADDRESS ||
  "";

// Toggle this to true when you want to pause the app
const IS_PAUSED = false;

type Step = "hero" | "format" | "form" | "sending" | "success" | "error";

type Format = "haiku" | "visual" | "omakase";

const formatMap: Record<Format, number> = {
  haiku: 0,
  visual: 1,
  omakase: 2,
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

// avatar removed

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

// cleaner buttons: solid color, no gradient
const primaryButtonStyle: CSSProperties = {
  ...buttonBase,
  background: "#A4bad6",
  color: "#111827",
  boxShadow: "0 6px 16px rgba(148, 163, 184, 0.4)",
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonBase,
  background: "#FFFFFF",
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

  const [step, setStep] = useState<Step>("hero");
  const [format, setFormat] = useState<Format>("omakase");
  const [question, setQuestion] = useState("");
  const [consentShare, setConsentShare] = useState(false);
  const [noAI, setNoAI] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: waitingReceipt, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const _envOk = Boolean(CONTRACT_ADDRESS);

  // TEMP: disable on-chain writes while testing Farcaster
  const canWrite = false;

  const chainLabel = getChainLabel(chainId);
  const modeLabel = canWrite ? "On-chain" : "Dry-run";
  const modeHint = canWrite
    ? "Your question will be sent to the contract on Base."
    : "No write function detected — this stays as an experimental booth.";

  const isSubmitting = step === "sending" || isPending;

  useEffect(() => {
    if (confirmed) {
      setStep("success");
    }
  }, [confirmed]);

  function handleFormatChange(next: Format) {
    if (isSubmitting) return;
    setFormat(next);
    setStep("form");
  }

  async function handleSubmit() {
    setErrorMsg(null);

    if (!isConnected) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }

    const q = question.trim();

    if (!q) {
      setErrorMsg("Please ask me a question.");
      return;
    }

    if (q.length > 500) {
      setErrorMsg("Keep it under 500 characters.");
      return;
    }

    await handleSend();
  }

  async function handleSend() {
    try {
      setErrorMsg(null);
      setStep("sending");

      if (!canWrite) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        setStep("success");
        return;
      }

      const args = [question, BigInt(formatMap[format])];

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: askIsmeneBoothAbi,
        functionName: "ask",
        args,
      });

      if (!hash) throw new Error("Transaction not created");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      setErrorMsg(message);
      setStep("error");
    }
  }

  const charCount = question.trim().length;

    /* ---------- Pause screen ---------- */

  if (IS_PAUSED) {
    return (
      <>
        <main style={pageStyle}>
          <div style={shellStyle}>
            <div style={smallCardStyle} className="fade-in-soft">
              <div style={pillRowStyle}>
                <span style={pillStyle}>Ask booth · Paused</span>
                <span style={pillMutedStyle}>Taking a breather</span>
              </div>
            </div>

            <div style={cardStyle} className="fade-in-soft">
              <h1
                className="ismene-heading"
                style={{
                  fontSize: 24,
                  lineHeight: 1.3,
                  margin: 0,
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                The studio is closed for now 🍵
              </h1>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "#4b5563",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                I&apos;m deep in my current creations.
                <br />
                The booth will reopen once these pieces are complete.
              </p>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "#6b7280",
                  textAlign: "center",
                }}
              >
                Turn on notifications to be gently pinged when new slots appear. In the meantime, you can still find me on Farcaster.
              </p>
            </div>
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
        `}</style>
      </>
    );
  }


  /* ---------- Normal flow ---------- */

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

          {/* HERO */}
          {step === "hero" && (
            <div style={cardStyle} className="fade-in-soft">
              <div style={headerRowStyle}>
                {/* avatar removed */}
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
                    — a writer and visual artist based in Tokyo. I believe in
                    serendipity, symbolism, and the strange ways clarity arrives
                    when we stop forcing it.
                    <br />
                    <br />
                    Bring me something messy, tender, confusing — and I&apos;ll
                    answer in the language I know best: words, images, and
                    intuition, shaped into a 1/1 artwork. I work with guts,
                    pattern-spotting, and a soft heart. No guru stuff, no
                    ten-step frameworks — just presence, intuition, and craft.
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
                {!isConnected && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      alignSelf: "center",
                    }}
                  >
                    Connect your wallet in the Base app to continue.
                  </span>
                )}
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
                Think of this like a tiny omakase for your question: you bring
                the real thing you&apos;re carrying, I bring time, attention,
                and what I feel is right.
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
                  You ask me something genuine that&apos;s sitting on your mind.
                </li>
                <li style={{ marginBottom: 6 }}>
                  You choose how you&apos;d like me to respond.
                </li>
                <li style={{ marginBottom: 6 }}>
                  I sit with your question offline and create a 1/1 artwork in
                  response.
                </li>
                <li>
                  Within 48 hours, I mint it on Base and DM you on Farcaster
                  with your piece.
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
                  color: "#6b7280",
                  lineHeight: 1.6,
                }}
              >
                I keep this small — around 5 pieces per weekday — so I can stay
                present with what you send.
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
                Bring me something real. It can be small and oddly specific or
                quietly huge. I&apos;ll read it carefully.
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
                    color: "#9CA3AF",
                    marginTop: 4,
                  }}
                >
                  {charCount}/500
                </div>
              </div>

              {/* Consent + AI toggle */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={checkboxRowStyle}>
                  <input
                    type="checkbox"
                    checked={consentShare}
                    onChange={(e) => setConsentShare(e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span>
                    You&apos;re okay with your question (anonymized) possibly
                    informing future poems or visuals. Nothing will ever be
                    screenshotted or shared with your handle attached.
                  </span>
                </label>

                <label style={checkboxRowStyle}>
                  <input
                    type="checkbox"
                    checked={noAI}
                    onChange={(e) => setNoAI(e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span>
                    Some visual elements may involve AI tools alongside
                    traditional techniques; the final piece is always created
                    specifically for your question. Check this if you&apos;d
                    prefer I avoid AI assistance in your piece.
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
                  You can&apos;t choose wrong — just what feels right for this
                  moment.
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
                    <div style={{ fontSize: 12, color: "#4b5563" }}>
                      Your dilemma distilled into a few lines.
                      <br />
                      Three lines, one breath, no rigid rules.
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
                    <div style={{ fontSize: 12, color: "#4b5563" }}>
                      A visual reading.
                      <br />
                      Composition, symbolism, mood.
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
                    <div style={{ fontSize: 12, color: "#4b5563" }}>
                      A full interpretation.
                      <br />
                      Your question rendered in both language and image.
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
                  color: "#6b7280",
                  lineHeight: 1.7,
                }}
              >
                <p style={{ marginBottom: 6 }}>
                  This is an experiment. I care deeply, but I&apos;m not a
                  therapist, lawyer, or financial advisor.
                </p>
                <p style={{ marginBottom: 6 }}>
                  If I truly have no response for your question, I&apos;ll
                  return your payment. Otherwise, no refunds — consider it a
                  delicate and deeply appreciated gesture of support, both
                  toward me and toward sayILY.art.
                </p>
                <p style={{ marginBottom: 6 }}>
                  If it doesn&apos;t immediately click, think of it as a fancy
                  tea you&apos;d have bought a stranger — a pretty cool gesture
                  in itself.
                </p>
                <p style={{ marginBottom: 0 }}>
                  By submitting, you confirm you&apos;re 18+, you won&apos;t
                  share sensitive personal data, and you understand these are
                  artworks, not professional advice.
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
                  You&apos;ll receive a DM on Farcaster when your 1/1 is minted
                  and ready.
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
                weren&apos;t charged. Try again, or DM me on Farcaster if this
                keeps happening.
              </p>

              <button
                style={{ ...secondaryButtonStyle, width: "100%" }}
                onClick={() => setStep("form")}
              >
                Back to form
              </button>
            </div>
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
