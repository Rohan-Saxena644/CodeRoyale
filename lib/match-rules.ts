export const MATCH_DURATION_MS = 30 * 60 * 1000;

export function matchDeadline(startedAt: Date | string | null | undefined): number | null {
  if (!startedAt) return null;
  const started = new Date(startedAt).getTime();
  return Number.isFinite(started) ? started + MATCH_DURATION_MS : null;
}

export function publicProblem<T extends { rawJson: unknown }>(problem: T) {
  const raw = problem.rawJson as Record<string, unknown> | null;
  return {
    ...problem,
    rawJson: {
      constraints: raw?.constraints ?? [],
      functionSignature: raw?.functionSignature,
      examples: raw?.examples ?? [],
    },
  };
}
