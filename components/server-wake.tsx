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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg">
      <div className="relative flex flex-col items-center gap-6 px-6 text-center">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface2 text-sm font-semibold text-primary">CR</span>
          <span className="text-xl font-semibold tracking-tight text-textMain">CodeRoyale</span>
        </div>

        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-base font-medium text-textMain">{message}</p>
          <p className="text-sm text-textSoft">{elapsed > 0 ? `${elapsed}s elapsed` : "Connecting..."}</p>
        </div>

        <div className="rounded-lg border border-border bg-surface2 px-4 py-2 text-xs text-textMuted">
          The socket service spins down when idle. First visit can take about 30 seconds.
        </div>
      </div>
    </div>
  );
}

