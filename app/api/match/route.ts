import { NextResponse } from "next/server";
import { z } from "zod";
import { createMatchRecord } from "@/lib/match-repository";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const matchSchema = z.object({
  hostName: z.string().trim().min(2).max(32),
  config: z.object({
    mode: z.enum(["competitive", "dev"]),
    difficulty: z.enum(["easy", "medium", "hard"]),
    duelLanguage: z.enum(["python", "javascript", "cpp", "go", "rust", "java"]).optional(),
    devCategory: z.enum(["react-ui", "express-api", "go-backend", "rust-backend", "next-actions"]).optional(),
  }),
});

const matchCreateLimit = new Map<string, number[]>();

function getIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function checkMatchCreateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const limit = 5;
  const timestamps = (matchCreateLimit.get(ip) ?? []).filter((t) => now - t < window);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  matchCreateLimit.set(ip, timestamps);
  return true;
}

export async function POST(request: Request) {
  const ip = getIp(request);
  if (!checkMatchCreateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many rooms created. Please wait a minute." },
      { status: 429 }
    );
  }

  const payload = await request.json();
  const result = matchSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid room payload" }, { status: 400 });
  }

  try {
    const match = await createMatchRecord(result.data.hostName, result.data.config);
    const track =
      result.data.config.mode === "competitive"
        ? (result.data.config.duelLanguage ?? "javascript")
        : (result.data.config.devCategory ?? "react-ui");

    const roomUrl = `/room/${match.id}?invite=${match.inviteCode}&host=${encodeURIComponent(
      result.data.hostName
    )}&mode=${result.data.config.mode}&difficulty=${result.data.config.difficulty}&track=${track}&role=host`;

    return NextResponse.json({ match, roomUrl });
  } catch {
    return NextResponse.json({ error: "Failed to create match" }, { status: 500 });
  }
}
