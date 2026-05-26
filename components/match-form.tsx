"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { DevCategory, DuelLanguage, MatchConfig, ModeKind } from "@/lib/types";

const duelLanguages: DuelLanguage[] = ["python", "javascript", "cpp", "go", "rust","java"];
const devCategories: DevCategory[] = ["react-ui", "express-api", "go-backend", "rust-backend", "next-actions"];

export function MatchForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<ModeKind>("competitive");
  const [difficulty, setDifficulty] = useState<MatchConfig["difficulty"]>("medium");
  const [duelLanguage, setDuelLanguage] = useState<DuelLanguage>("javascript");
  const [devCategory, setDevCategory] = useState<DevCategory>("react-ui");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    const payload: MatchConfig = {
      mode,
      difficulty
    };

    if (mode === "competitive") {
      payload.duelLanguage = duelLanguage;
    } else {
      payload.devCategory = devCategory;
    }

    startTransition(async () => {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          hostName: formData.get("hostName"),
          config: payload
        })
      });

      if (!response.ok) {
        setError("Could not create a room. Check the route or payload and try again.");
        return;
      }

      const data = (await response.json()) as { roomUrl: string };
      router.push(data.roomUrl as Route);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card-border rounded-[28px] border border-white/10 bg-panel/90 p-6">
      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2 text-sm text-white/75">
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            Host name
          </span>
          <input
            name="hostName"
            placeholder="royale_builder"
            required
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-gold/60"
          />
        </label>

        <label className="space-y-2 text-sm text-white/75">
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            Difficulty
          </span>
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as MatchConfig["difficulty"])}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-gold/60"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("competitive")}
          className={`rounded-[24px] border px-5 py-4 text-left transition ${
            mode === "competitive"
              ? "border-lime/50 bg-lime/10 text-white"
              : "border-white/10 bg-black/15 text-white/70"
          }`}
        >
          <span className="block text-sm font-semibold text-lime">Competitive</span>
          <span className="mt-1 block text-sm leading-6">
            Solve the same generated DSA-style problem and win by passing tests first.
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMode("dev")}
          className={`rounded-[24px] border px-5 py-4 text-left transition ${
            mode === "dev"
              ? "border-gold/50 bg-gold/10 text-white"
              : "border-white/10 bg-black/15 text-white/70"
          }`}
        >
          <span className="block text-sm font-semibold text-gold">Developer</span>
          <span className="mt-1 block text-sm leading-6">
            Repair realistic starter code and let assertions decide whether the fix is actually correct.
          </span>
        </button>
      </div>

      {mode === "competitive" ? (
        <label className="mt-6 block space-y-2 text-sm text-white/75">
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            Target language
          </span>
          <select
            value={duelLanguage}
            onChange={(event) => setDuelLanguage(event.target.value as DuelLanguage)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-lime/60"
          >
            {duelLanguages.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="mt-6 block space-y-2 text-sm text-white/75">
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            Dev category
          </span>
          <select
            value={devCategory}
            onChange={(event) => setDevCategory(event.target.value as DevCategory)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-gold/60"
          >
            {devCategories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-white/55">
          Current assumption: dev mode leads with starter-code bug fixing, not MCQ-only rounds.
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-white px-6 py-3 font-semibold text-ink transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating room..." : "Create duel room"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-coral">{error}</p> : null}
    </form>
  );
}
