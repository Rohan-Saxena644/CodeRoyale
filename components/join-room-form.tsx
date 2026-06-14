"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

export function JoinRoomForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await fetch("/api/match/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: formData.get("inviteCode"),
          guestName: formData.get("guestName"),
        }),
      });

      const data = (await response.json()) as { error?: string; roomUrl?: string };

      if (!response.ok || !data.roomUrl) {
        setError(data.error ?? "Could not join that room. Double-check the invite code.");
        return;
      }

      router.push(data.roomUrl as Route);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card-border rounded-[28px] border border-white/10 bg-black/20 p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">Join a duel</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Enter an invite code</h2>
      <p className="mt-2 text-sm leading-6 text-white/60">
        Got a code from your opponent? Enter it here to jump into their room.
      </p>

      <div className="mt-6 grid gap-5">
        <label className="space-y-2 text-sm text-white/75">
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            Your name
          </span>
          <input
            name="guestName"
            required
            placeholder="opponent_handle"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-lime/60"
          />
        </label>

        <label className="space-y-2 text-sm text-white/75">
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            Invite code
          </span>
          <input
            name="inviteCode"
            required
            placeholder="ABCD23"
            autoCapitalize="characters"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-mono uppercase tracking-[0.25em] text-white outline-none transition focus:border-lime/60"
          />
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-lime px-6 py-3 font-semibold text-ink transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Joining…" : "Join by code"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-coral">{error}</p> : null}
    </form>
  );
}