import { NextResponse } from "next/server";
import { z } from "zod";
import { createMatchRecord } from "@/lib/match-repository";

const matchSchema = z.object({
  hostName: z.string().trim().min(2).max(32),
  config: z.object({
    mode: z.enum(["competitive", "dev"]),
    difficulty: z.enum(["easy", "medium", "hard"]),
    duelLanguage: z.enum(["python", "javascript", "cpp", "go", "rust"]).optional(),
    devCategory: z.enum(["react-ui", "express-api", "go-backend", "rust-backend", "next-actions"]).optional()
  })
});

export async function POST(request: Request) {
  const payload = await request.json();
  const result = matchSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid room payload",
        issues: result.error.flatten()
      },
      { status: 400 }
    );
  }

  const match = await createMatchRecord(result.data.hostName, result.data.config);
  const track =
    result.data.config.mode === "competitive"
      ? (result.data.config.duelLanguage ?? "javascript")
      : (result.data.config.devCategory ?? "react-ui");

  const roomUrl = `/room/${match.id}?invite=${match.inviteCode}&host=${encodeURIComponent(
    result.data.hostName
  )}&mode=${result.data.config.mode}&difficulty=${result.data.config.difficulty}&track=${track}&role=host`;

  return NextResponse.json({
    match,
    roomUrl
  });
}
