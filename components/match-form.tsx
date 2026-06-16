"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { DuelLanguage, MatchConfig } from "@/lib/types";

const duelLanguages: DuelLanguage[] = ["python", "javascript", "cpp", "go", "rust", "java"];

export function MatchForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [difficulty, setDifficulty] = useState<MatchConfig["difficulty"]>("medium");
  const [duelLanguage, setDuelLanguage] = useState<DuelLanguage>("javascript");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    const payload: MatchConfig = {
      mode: "competitive",
      difficulty,
      duelLanguage,
    };

    startTransition(async () => {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName: formData.get("hostName"),
          config: payload,
        }),
      });

      if (!response.ok) {
        setError("Could not create a room. Please try again.");
        return;
      }

      const data = (await response.json()) as { roomUrl: string };
      router.push(data.roomUrl as Route);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card-border rounded-[28px] border border-white/10 bg-panel/90 p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Host a duel</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Create a room</h2>
      <p className="mt-2 text-sm leading-6 text-white/60">
        Set up the room and share the invite code with your opponent.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <label className="space-y-2 text-sm text-white/75">
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            Your name
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
            onChange={(e) => setDifficulty(e.target.value as MatchConfig["difficulty"])}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-gold/60"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      <label className="mt-6 block space-y-2 text-sm text-white/75">
        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
          Language
        </span>
        <select
          value={duelLanguage}
          onChange={(e) => setDuelLanguage(e.target.value as DuelLanguage)}
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-lime/60"
        >
          {duelLanguages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-white px-6 py-3 font-semibold text-ink transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating room…" : "Create duel room"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-coral">{error}</p> : null}
    </form>
  );
}