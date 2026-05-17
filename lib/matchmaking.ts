import { customAlphabet } from "nanoid";
import type { MatchConfig, MatchRecord } from "@/lib/types";

const codeAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

export function createInviteCode() {
  return codeAlphabet();
}

export function createMockMatch(config: MatchConfig): MatchRecord {
  const inviteCode = createInviteCode();

  return {
    id: `match_${inviteCode.toLowerCase()}`,
    inviteCode,
    status: "waiting",
    config,
    createdAt: new Date().toISOString()
  };
}
