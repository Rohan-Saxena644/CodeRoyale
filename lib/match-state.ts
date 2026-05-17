import type { MatchStatus } from "@/lib/types";

const transitions: Record<MatchStatus, MatchStatus[]> = {
  waiting: ["countdown"],
  countdown: ["active", "ended"],
  active: ["ended"],
  ended: []
};

export function canTransitionMatch(from: MatchStatus, to: MatchStatus) {
  return transitions[from].includes(to);
}

export function nextMatchStatus(from: MatchStatus, event: "both-ready" | "countdown-finished" | "forfeit" | "all-tests-passed") {
  if (from === "waiting" && event === "both-ready") {
    return "countdown";
  }

  if (from === "countdown" && event === "countdown-finished") {
    return "active";
  }

  if ((from === "countdown" || from === "active") && (event === "forfeit" || event === "all-tests-passed")) {
    return "ended";
  }

  return from;
}
