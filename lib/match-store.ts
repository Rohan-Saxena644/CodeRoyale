import type { StoredMatch } from "@/lib/types";

const globalForMatchStore = globalThis as typeof globalThis & {
  coderoyaleMatches?: Map<string, StoredMatch>;
};

const matches = globalForMatchStore.coderoyaleMatches ?? new Map<string, StoredMatch>();

if (!globalForMatchStore.coderoyaleMatches) {
  globalForMatchStore.coderoyaleMatches = matches;
}

export function saveMatch(match: StoredMatch) {
  matches.set(match.inviteCode, match);
  return match;
}

export function getMatchByInviteCode(inviteCode: string) {
  return matches.get(inviteCode.toUpperCase()) ?? null;
}

export function updateMatchGuest(inviteCode: string, guestName: string) {
  const match = getMatchByInviteCode(inviteCode);

  if (!match) {
    return null;
  }

  const updatedMatch: StoredMatch = {
    ...match,
    guestName
  };

  matches.set(updatedMatch.inviteCode, updatedMatch);
  return updatedMatch;
}
