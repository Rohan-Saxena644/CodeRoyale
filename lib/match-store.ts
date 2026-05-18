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
    guestName,
    guestReady: false,
    status: "waiting",
    countdownEndsAt: undefined
  };

  matches.set(updatedMatch.inviteCode, updatedMatch);
  return updatedMatch;
}

export function updateMatchState(
  inviteCode: string,
  updates: Partial<Pick<StoredMatch, "hostName" | "guestName" | "hostReady" | "guestReady" | "status" | "countdownEndsAt">>
) {
  const match = getMatchByInviteCode(inviteCode);

  if (!match) {
    return null;
  }

  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  ) as Partial<Pick<StoredMatch, "hostName" | "guestName" | "hostReady" | "guestReady" | "status" | "countdownEndsAt">>;

  const updatedMatch: StoredMatch = {
    ...match,
    ...filteredUpdates
  };

  matches.set(updatedMatch.inviteCode, updatedMatch);
  return updatedMatch;
}
