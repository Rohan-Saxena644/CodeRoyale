-- Add 'finished' to MatchStatus enum
ALTER TYPE "MatchStatus" ADD VALUE IF NOT EXISTS 'finished';

-- Add winnerRole column to Match
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "winnerRole" TEXT;
