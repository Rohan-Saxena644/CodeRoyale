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
    <form onSubmit={handleSubmit} className="card-border rounded-xl border border-border bg-surface p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-success">Join a room</p>
      <h2 className="mt-3 text-2xl font-semibold text-textMain">Join a room</h2>
      <p className="mt-2 text-sm leading-6 text-textMuted">
        Got a code from your opponent? Enter it here to jump into their room.
      </p>

      <div className="mt-6 grid gap-5">
        <label className="space-y-2 text-sm text-textMuted">
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-textSoft">Your name</span>
          <input
            name="guestName"
            required
            placeholder="opponent_handle"
            className="w-full rounded-lg border border-border bg-bgSoft px-3 py-2.5 text-textMain outline-none transition placeholder:text-textSoft focus:border-success"
          />
        </label>

        <label className="space-y-2 text-sm text-textMuted">
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-textSoft">Invite code</span>
          <input
            name="inviteCode"
            required
            placeholder="ABCD23"
            autoCapitalize="characters"
            className="w-full rounded-lg border border-border bg-bgSoft px-3 py-2.5 font-mono uppercase tracking-[0.22em] text-textMain outline-none transition placeholder:text-textSoft focus:border-success"
          />
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-success px-5 py-2.5 text-sm font-semibold text-bg transition hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Joining..." : "Join by code"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
    </form>
  );
}

