"use client";

import { useEffect, useState } from "react";

export function ServerWake({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"waking" | "ready" | "slow">("waking");

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const started = Date.now();

    async function ping() {
      try {
        const res = await fetch(`${socketUrl}/health`, { signal: AbortSignal.timeout(5000), cache: "no-store" });
        if (cancelled) return;
        if (res.ok) { setStatus("ready"); return; }
      } catch { /* Keep the page usable while the room service starts. */ }
      if (cancelled) return;
      if (Date.now() - started > 60000) setStatus("slow");
      timeout = setTimeout(ping, 5000);
    }

    void ping();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  return (
    <>
      {status !== "ready" && (
        <div role="status" className="border-b border-borderSoft bg-surface px-6 py-2 text-center text-xs text-textMuted">
          {status === "slow" ? "The room service is taking longer to connect. You can keep browsing while we retry." : "Getting the arena ready. You can explore while we connect."}
        </div>
      )}
      {children}
    </>
  );
}
