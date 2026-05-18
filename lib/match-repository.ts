import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createInviteCode } from "@/lib/matchmaking";
import type { MatchConfig, MatchStatus, StoredMatch } from "@/lib/types";

const db = prisma as typeof prisma & {
  match: {
    create: (args: unknown) => Promise<{
      id: string;
      inviteCode: string;
      hostName: string;
      guestName: string | null;
      mode: "competitive" | "dev";
      status: "waiting" | "countdown" | "active" | "ended";
      difficulty: string;
      duelLanguage: string | null;
      devCategory: string | null;
      createdAt: Date;
    }>;
    findUnique: (args: unknown) => Promise<{
      id: string;
      inviteCode: string;
      hostName: string;
      guestName: string | null;
      mode: "competitive" | "dev";
      status: "waiting" | "countdown" | "active" | "ended";
      difficulty: string;
      duelLanguage: string | null;
      devCategory: string | null;
      createdAt: Date;
    } | null>;
    update: (args: unknown) => Promise<{
      id: string;
      inviteCode: string;
      hostName: string;
      guestName: string | null;
      mode: "competitive" | "dev";
      status: "waiting" | "countdown" | "active" | "ended";
      difficulty: string;
      duelLanguage: string | null;
      devCategory: string | null;
      createdAt: Date;
    }>;
  };
};

type MatchRow = Parameters<typeof mapStoredMatch>[0];

function mapStoredMatch(match: {
  id: string;
  inviteCode: string;
  hostName: string;
  guestName: string | null;
  mode: "competitive" | "dev";
  difficulty: string;
  duelLanguage: string | null;
  devCategory: string | null;
  status: "waiting" | "countdown" | "active" | "ended";
  createdAt: Date;
}): StoredMatch {
  return {
    id: match.id,
    inviteCode: match.inviteCode,
    hostName: match.hostName,
    guestName: match.guestName ?? undefined,
    hostReady: false,
    guestReady: false,
    status: match.status as MatchStatus,
    createdAt: match.createdAt.toISOString(),
    config: {
      mode: match.mode,
      difficulty: match.difficulty as MatchConfig["difficulty"],
      duelLanguage: match.duelLanguage as MatchConfig["duelLanguage"],
      devCategory: match.devCategory as MatchConfig["devCategory"]
    }
  };
}

export async function createMatchRecord(hostName: string, config: MatchConfig) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = createInviteCode();

    try {
      const match = await db.match.create({
        data: {
          inviteCode,
          hostName,
          mode: config.mode,
          difficulty: config.difficulty,
          duelLanguage: config.mode === "competitive" ? config.duelLanguage : null,
          devCategory: config.mode === "dev" ? config.devCategory : null
        }
      });

      return mapStoredMatch(match as unknown as MatchRow);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Could not allocate a unique invite code for the match.");
}

export async function getStoredMatchByInviteCode(inviteCode: string) {
  const match = await db.match.findUnique({
    where: {
      inviteCode: inviteCode.toUpperCase()
    }
  });

  return match ? mapStoredMatch(match as unknown as MatchRow) : null;
}

export async function updateStoredMatchGuest(inviteCode: string, guestName: string) {
  const match = await db.match.update({
    where: {
      inviteCode: inviteCode.toUpperCase()
    },
    data: {
      guestName,
      status: "waiting"
    }
  });

  return mapStoredMatch(match as unknown as MatchRow);
}
