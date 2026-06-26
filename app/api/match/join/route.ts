import { NextResponse } from "next/server";
import { z } from "zod";
import { getStoredMatchByInviteCode, updateStoredMatchGuest } from "@/lib/match-repository";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const joinSchema = z.object({
  inviteCode: z.string().trim().min(4).max(12),
  guestName: z.string().trim().min(2).max(32),
});

const joinRateLimit = new Map<string, number[]>();

function getIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function checkJoinRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const limit = 10;
  const timestamps = (joinRateLimit.get(ip) ?? []).filter((t) => now - t < window);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  joinRateLimit.set(ip, timestamps);
  return true;
}

export async function POST(request: Request) {
  const ip = getIp(request);
  if (!checkJoinRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many join attempts. Please wait a moment." },
      { status: 429 }
    );
  }

  const payload = await request.json();
  const result = joinSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid join payload." }, { status: 400 });
  }

  const inviteCode = result.data.inviteCode.toUpperCase();
  const existingMatch = await getStoredMatchByInviteCode(inviteCode);

  if (!existingMatch) {
    return NextResponse.json({ error: "Room not found for that invite code." }, { status: 404 });
  }

  if (existingMatch.guestName && existingMatch.guestName !== result.data.guestName) {
    return NextResponse.json({ error: "That room already has a guest joined." }, { status: 409 });
  }

  try {
    const updatedMatch = await updateStoredMatchGuest(inviteCode, result.data.guestName);
    const track =
      updatedMatch.config.mode === "competitive"
        ? (updatedMatch.config.duelLanguage ?? "javascript")
        : (updatedMatch.config.devCategory ?? "react-ui");
    const guestName = updatedMatch.guestName ?? result.data.guestName;

    const roomUrl = `/room/${updatedMatch.id}?invite=${updatedMatch.inviteCode}&host=${encodeURIComponent(
      updatedMatch.hostName
    )}&guest=${encodeURIComponent(guestName)}&mode=${updatedMatch.config.mode}&difficulty=${
      updatedMatch.config.difficulty
    }&track=${track}&role=guest`;

    return NextResponse.json({ match: updatedMatch, roomUrl });
  } catch {
    return NextResponse.json({ error: "Failed to join match" }, { status: 500 });
  }
}
