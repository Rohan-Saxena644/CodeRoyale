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
      try {
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
      } catch {
        setError("Could not reach the room service. Please try again.");
      }
    });
  }

  return (
    <form id="join" onSubmit={handleSubmit} className="card-border flex scroll-mt-6 flex-col rounded-xl border border-border bg-surface p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Have an invite?</p>
      <h2 className="mt-3 text-2xl font-semibold text-textMain">Join your opponent</h2>
      <p className="mt-2 text-sm leading-6 text-textMuted">
        Got a code from your opponent? Enter it here to jump into their room.
      </p>

      <div className="mt-6 grid gap-5">
        <label className="space-y-2 text-sm text-textMuted">
          <span className="block text-sm font-medium text-textMain">Your name</span>
          <input
            name="guestName"
            autoComplete="nickname"
            required
            placeholder="opponent_handle"
            className="w-full rounded-lg border border-border bg-bgSoft px-3 py-2.5 text-textMain outline-none transition placeholder:text-textSoft focus:border-primary"
          />
        </label>

        <label className="space-y-2 text-sm text-textMuted">
          <span className="block text-sm font-medium text-textMain">Invite code</span>
          <input
            name="inviteCode"
            required
            placeholder="ABCD23"
            autoCapitalize="characters"
            className="w-full rounded-lg border border-border bg-bgSoft px-3 py-2.5 font-mono uppercase tracking-[0.22em] text-textMain outline-none transition placeholder:text-textSoft focus:border-primary"
          />
        </label>
      </div>

      <div className="mt-auto flex justify-end pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-primary bg-surface px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Joining..." : "Join by code"}
        </button>
      </div>

      {error ? <p role="alert" className="mt-4 text-sm text-danger">{error}</p> : null}
    </form>
  );
}

