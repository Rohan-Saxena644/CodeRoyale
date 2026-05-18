import { NextResponse } from "next/server";
import { z } from "zod";
import { getMatchByInviteCode, updateMatchGuest } from "@/lib/match-store";

const joinSchema = z.object({
  inviteCode: z.string().trim().min(4).max(12),
  guestName: z.string().trim().min(2).max(32)
});

export async function POST(request: Request) {
  const payload = await request.json();
  const result = joinSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid join payload." }, { status: 400 });
  }

  const inviteCode = result.data.inviteCode.toUpperCase();
  const existingMatch = getMatchByInviteCode(inviteCode);

  if (!existingMatch) {
    return NextResponse.json({ error: "Room not found for that invite code." }, { status: 404 });
  }

  if (existingMatch.guestName && existingMatch.guestName !== result.data.guestName) {
    return NextResponse.json({ error: "That room already has a guest joined." }, { status: 409 });
  }

  const updatedMatch = updateMatchGuest(inviteCode, result.data.guestName);

  if (!updatedMatch) {
    return NextResponse.json({ error: "Could not update the room." }, { status: 500 });
  }

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

  return NextResponse.json({
    match: updatedMatch,
    roomUrl
  });
}
