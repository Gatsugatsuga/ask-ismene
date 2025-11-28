"use client";

import React, { CSSProperties, useEffect, useState } from "react";
import { SignInButton, useProfile } from "@farcaster/auth-kit";
import { usePublicClient } from "wagmi";
import type { Abi, AbiEvent } from "viem";

import { abi as askIsmeneBoothAbi } from "@/lib/abi/askIsmene";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  process.env.CONTRACT_ADDRESS ||
  "";

const CREATOR_FID = 191775;

type QuestionFormat = "haiku" | "visual" | "omakase" | "unknown";

type PaidQuestion = {
  id: string; // txHash:logIndex
  txHash: `0x${string}`;
  asker: string;
  fid?: string;
  handle?: string;
  format: QuestionFormat;
  pricePaid: bigint;
  question: string;
};

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  margin: 0,
  padding: 0,
  background: "#f3f4f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily:
    '-apple-system, system-ui, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
};

const shellStyle: CSSProperties = {
  width: "100%",
  maxWidth: 880,
  padding: "24px 16px 40px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const smallCardStyle: CSSProperties = {
  borderRadius: 16,
  border: "1px solid #cbd5e1",
  background: "#e5e7eb",
  padding: 12,
  boxSizing: "border-box",
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
  border: "1px solid #94a3b8",
  background: "#e0f2fe",
  color: "#0f172a",
};

const pillMutedStyle: CSSProperties = {
  ...pillStyle,
  background: "#f9fafb",
  borderColor: "#d1d5db",
  color: "#4b5563",
};

const cardStyle: CSSProperties = {
  borderRadius: 24,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  padding: 20,
  boxSizing: "border-box",
};

const buttonBase: CSSProperties = {
  borderRadius: 999,
  padding: "8px 14px",
  border: "none",
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontWeight: 500,
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonBase,
  background: "#ffffff",
  color: "#111827",
  border: "1px solid #d1d5db",
};

const tableHeaderStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.5fr 3fr 1.2fr 0.9fr",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#6b7280",
  marginBottom: 6,
};

const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.5fr 3fr 1.2fr 0.9fr",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  fontSize: 13,
  alignItems: "flex-start",
};

function formatLabel(f: QuestionFormat): string {
  if (f === "haiku") return "Haiku";
  if (f === "visual") return "Digital collage";
  if (f === "omakase") return "Haiku + collage";
  return "Unknown";
}

// Assume 6 decimals (USDC)
function formatUsd(amount: bigint): string {
  const num = Number(amount) / 1_000_000;
  return `$${num.toFixed(2)}`;
}

// Parse prefix [fid:123 @handle] if present
function parseFarcasterPrefix(raw: string): {
  fid?: string;
  handle?: string;
  question: string;
} {
  const prefixRegex = /^\[fid:(\d+)(?: @([^\]]+))?\]\s*(.*)$/;
  const match = raw.match(prefixRegex);
  if (!match) {
    return { question: raw };
  }
  return {
    fid: match[1],
    handle: match[2],
    question: match[3] ?? "",
  };
}

// Map uint8/enum format → label
function mapFormatId(value: unknown): QuestionFormat {
  const n = typeof value === "bigint" ? Number(value) : Number(value ?? 0);
  if (n === 0) return "haiku";
  if (n === 1) return "visual";
  if (n === 2) return "omakase";
  return "unknown";
}

// Type for the QuestionAsked logs
type QuestionAskedLog = {
  transactionHash: `0x${string}`;
  logIndex: number;
  args: {
    asker?: string;
    format?: bigint | number;
    pricePaid?: bigint | number;
    question?: string;
  };
};

// Extract the QuestionAsked event from the ABI
const QUESTION_ASKED_EVENT: AbiEvent | undefined = (
  askIsmeneBoothAbi as Abi
).find(
  (item) => item.type === "event" && "name" in item && item.name === "QuestionAsked"
) as AbiEvent | undefined;

type BoothStatus = { paused: boolean };

export default function StudioPage() {
  const { isAuthenticated, profile } = useProfile();
  const publicClient = usePublicClient();

  const isOwner = isAuthenticated && profile?.fid === CREATOR_FID;

  const [questions, setQuestions] = useState<PaidQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  // Load booth paused status from API
  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        setLoadingStatus(true);
        setStatusError(null);
        const res = await fetch("/api/booth-status");
        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }
        const data = (await res.json()) as BoothStatus;
        if (!cancelled && typeof data.paused === "boolean") {
          setIsPaused(data.paused);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "Unable to load booth status.";
          setStatusError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoadingStatus(false);
        }
      }
    }

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load paid questions from QuestionAsked logs
  useEffect(() => {
    if (!publicClient || !CONTRACT_ADDRESS || !QUESTION_ASKED_EVENT) return;

    let cancelled = false;

    async function load() {
      try {
        setLoadingQuestions(true);
        setQuestionsError(null);

        const client = publicClient;
        if (!client) {
          throw new Error("Public client not available");
        }

        const logs = await client.getLogs({
          address: CONTRACT_ADDRESS as `0x${string}`,
          event: QUESTION_ASKED_EVENT,
          fromBlock: BigInt(0),
        });

        const typedLogs = logs as unknown as QuestionAskedLog[];

        const mapped: PaidQuestion[] = typedLogs
          .slice(-50) // latest 50
          .reverse()
          .map((log) => {
            const txHash = log.transactionHash;
            const logIndex = log.logIndex;
            const args = log.args ?? {};

            const rawQuestion = String(args.question ?? "");
            const { fid, handle, question } = parseFarcasterPrefix(rawQuestion);

            const format = mapFormatId(args.format);
            const pricePaid = BigInt(args.pricePaid ?? 0);
            const asker = String(args.asker ?? "");

            return {
              id: `${txHash}:${logIndex}`,
              txHash,
              asker,
              fid,
              handle,
              format,
              pricePaid,
              question,
            };
          });

        if (!cancelled) {
          setQuestions(mapped);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Unable to load paid questions.";
          setQuestionsError(message);
        }
      } finally {
        if (!cancelled) {
          setLoadingQuestions(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  async function handleTogglePause() {
    if (toggling) return;

    try {
      setToggling(true);
      setStatusError(null);
      const res = await fetch("/api/booth-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: !isPaused }),
      });
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
      const data = (await res.json()) as BoothStatus;
      if (typeof data.paused === "boolean") {
        setIsPaused(data.paused);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Unable to update booth status.";
      setStatusError(msg);
    } finally {
      setToggling(false);
    }
  }

  /* --------- ACCESS STATES --------- */

  if (!isAuthenticated) {
    return (
      <main style={pageStyle}>
        <div style={shellStyle}>
          <div style={smallCardStyle}>
            <div style={pillRowStyle}>
              <span style={pillStyle}>Ask booth · Studio</span>
              <span style={pillMutedStyle}>Farcaster sign in required</span>
            </div>
          </div>

          <div style={cardStyle}>
            <h1
              style={{
                fontSize: 22,
                margin: 0,
                marginBottom: 10,
                color: "#111827",
              }}
            >
              Sign in with Farcaster
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "#374151",
                marginBottom: 16,
              }}
            >
              This studio page is only for the creator of Ask Ismene. Sign in
              with Farcaster to continue.
            </p>

            <SignInButton
              onSuccess={({ fid, username }) => {
                console.log("Signed in as", username, "fid", fid);
              }}
              onError={(err) => {
                console.error("Farcaster sign-in error", err);
              }}
            />
          </div>
        </div>
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main style={pageStyle}>
        <div style={shellStyle}>
          <div style={smallCardStyle}>
            <div style={pillRowStyle}>
              <span style={pillStyle}>Ask booth · Studio</span>
              <span style={pillMutedStyle}>Restricted access</span>
            </div>
          </div>

          <div style={cardStyle}>
            <h1
              style={{
                fontSize: 22,
                margin: 0,
                marginBottom: 10,
                color: "#111827",
              }}
            >
              Studio access is limited
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "#374151",
              }}
            >
              This dashboard is reserved for Ismène&apos;s studio account. You
              are signed in with a different Farcaster identity.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* --------- OWNER VIEW --------- */

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        {/* Top bar */}
        <div style={smallCardStyle}>
          <div
            style={{
              ...pillRowStyle,
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={pillRowStyle}>
              <span style={pillStyle}>Ask Ismene · Studio</span>
              <span style={pillMutedStyle}>
                Status:{" "}
                {loadingStatus ? "Loading…" : isPaused ? "Paused" : "Open"}
              </span>
              {statusError && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#b91c1c",
                    marginLeft: 8,
                  }}
                >
                  {statusError}
                </span>
              )}
            </div>

            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={handleTogglePause}
              disabled={toggling || loadingStatus}
            >
              {isPaused ? "Reopen booth" : "Pause booth"}
            </button>
          </div>
        </div>

        {/* Paid questions */}
        <div style={cardStyle}>
          <h1
            style={{
              fontSize: 20,
              margin: 0,
              marginBottom: 6,
              color: "#111827",
            }}
          >
            Paid questions
          </h1>
          <p
            style={{
              fontSize: 13,
              margin: 0,
              marginBottom: 12,
              color: "#4b5563",
              lineHeight: 1.7,
            }}
          >
            Each line below corresponds to a question that successfully called
            your <code style={{ fontSize: 12 }}>ask()</code> function. The
            Farcaster info is extracted from the prefix we add on the public
            booth.
          </p>

          {questionsError && (
            <div
              style={{
                marginBottom: 10,
                fontSize: 12,
                color: "#b91c1c",
                background: "#fef2f2",
                borderRadius: 8,
                padding: "8px 10px",
                border: "1px solid #fee2e2",
              }}
            >
              {questionsError}
            </div>
          )}

          {loadingQuestions && questions.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Loading paid questions…
            </p>
          ) : questions.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              No paid questions found yet. Once someone pays and sends a
              question through the booth, it will appear here.
            </p>
          ) : (
            <>
              <div style={tableHeaderStyle}>
                <span>Farcaster</span>
                <span>Question</span>
                <span>Format</span>
                <span>Paid</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {questions.map((q) => (
                  <div key={q.id} style={rowStyle}>
                    <div>
                      <div style={{ fontWeight: 500, color: "#111827" }}>
                        {q.handle
                          ? `@${q.handle}`
                          : q.fid
                          ? `fid ${q.fid}`
                          : "Unknown"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                          marginTop: 2,
                        }}
                      >
                        {q.asker.slice(0, 6)}…{q.asker.slice(-4)}
                      </div>
                    </div>
                    <div
                      style={{
                        color: "#111827",
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                      }}
                    >
                      {q.question || "—"}
                    </div>
                    <div
                      style={{
                        color: "#374151",
                      }}
                    >
                      {formatLabel(q.format)}
                    </div>
                    <div
                      style={{
                        color: "#111827",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatUsd(q.pricePaid)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
