"use client";

import { useEffect, useState } from "react";

type Status = "waking" | "ready";

export function ServerWake({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("waking");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
    let pollId: ReturnType<typeof setInterval>;
    let elapsedId: ReturnType<typeof setInterval>;

    async function ping(): Promise<boolean> {
      try {
        const res = await fetch(`${socketUrl}/health`, {
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        });
        return res.ok;
      } catch {
        return false;
      }
    }

    ping().then((ok) => {
      if (ok) {
        setStatus("ready");
        return;
      }

      elapsedId = setInterval(() => setElapsed((e) => e + 1), 1000);

      pollId = setInterval(() => {
        ping().then((ok) => {
          if (ok) {
            clearInterval(pollId);
            clearInterval(elapsedId);
            setStatus("ready");
          }
        });
      }, 3000);
    });

    return () => {
      clearInterval(pollId);
      clearInterval(elapsedId);
    };
  }, []);

  if (status === "ready") return <>{children}</>;

  const message =
    elapsed < 10
      ? "Warming up the server..."
      : elapsed < 30
      ? "Still waking up, hang tight..."
      : elapsed < 60
      ? "Almost there..."
      : "Taking a little longer than usual...";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/5 blur-[120px]" />
      </div>

      <div className="relative flex flex-col items-center gap-8 px-6 text-center">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">⚔️</span>
          <span className="text-xl font-semibold tracking-tight text-white">
            Code<span className="text-gold">Royale</span>
          </span>
        </div>

        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-gold/70" />
          <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-gold/30 [animation-direction:reverse] [animation-duration:1.5s]" />
          <div className="h-2 w-2 rounded-full bg-gold/60" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-base font-medium text-white/80">{message}</p>
          <p className="text-sm text-white/35">
            {elapsed > 0 ? `${elapsed}s elapsed` : "Connecting..."}
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/40">
          The server spins down when idle — first visit takes ~30s
        </div>
      </div>
    </div>
  );
}
