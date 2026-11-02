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
    const payload: MatchConfig = { mode: "competitive", difficulty, duelLanguage };

    startTransition(async () => {
      try {
        const response = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostName: formData.get("hostName"), config: payload }),
        });

        if (!response.ok) {
          setError("Could not create a room. Please try again.");
          return;
        }

        const data = (await response.json()) as { roomUrl: string };
        router.push(data.roomUrl as Route);
      } catch {
        setError("Could not reach the room service. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card-border flex flex-col rounded-xl border border-border bg-surface p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Set the challenge</p>
      <h2 className="mt-3 text-2xl font-semibold text-textMain">Create a room</h2>
      <p className="mt-2 text-sm leading-6 text-textMuted">
        Set up the room and share the invite code with your opponent.
      </p>

      <div className="mt-6 grid gap-5">
        <label className="space-y-2 text-sm text-textMuted">
          <span className="block text-sm font-medium text-textMain">Your name</span>
          <input
            name="hostName"
            autoComplete="nickname"
            placeholder="dev_handle"
            required
            className="w-full rounded-lg border border-border bg-bgSoft px-3 py-2.5 text-textMain outline-none transition placeholder:text-textSoft focus:border-primary"
          />
        </label>

        <label className="space-y-2 text-sm text-textMuted">
          <span className="block text-sm font-medium text-textMain">Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as MatchConfig["difficulty"])}
            className="w-full rounded-lg border border-border bg-bgSoft px-3 py-2.5 text-textMain outline-none transition focus:border-primary"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      <label className="mt-5 block space-y-2 text-sm text-textMuted">
        <span className="block text-sm font-medium text-textMain">Language</span>
        <select
          value={duelLanguage}
          onChange={(e) => setDuelLanguage(e.target.value as DuelLanguage)}
          className="w-full rounded-lg border border-border bg-bgSoft px-3 py-2.5 text-textMain outline-none transition focus:border-primary"
        >
          {duelLanguages.map((lang) => (
            <option key={lang} value={lang}>{{ python: "Python", javascript: "JavaScript", cpp: "C++", go: "Go", rust: "Rust", java: "Java" }[lang]}</option>
          ))}
        </select>
      </label>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating room..." : "Create duel room"}
        </button>
      </div>

      {error ? <p role="alert" className="mt-4 text-sm text-danger">{error}</p> : null}
    </form>
  );
}

