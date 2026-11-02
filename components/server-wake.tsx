"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { ServiceStatus } from "@/components/service-status";
import { useServiceHealth } from "@/components/use-service-health";
import { UiIcon } from "@/components/ui-icon";

export function ServerWake({ children }: { children: React.ReactNode }) {
  const health = useServiceHealth();
  const [browsing, setBrowsing] = useState(false);
  const [connectedOnce, setConnectedOnce] = useState(false);
  const socketReady = health.services.socket === "operational";

  // Once connected, later reconnects should not interrupt an active visit.
  useEffect(() => { if (socketReady) setConnectedOnce(true); }, [socketReady]);

  if (!socketReady && !browsing && !connectedOnce) {
    return <main className="status-backdrop min-h-screen"><Header /><ServiceStatus health={health} wake onBrowse={() => setBrowsing(true)} /><p className="px-6 pb-8 text-center text-xs text-textSoft">Your next challenge is on the other side.</p></main>;
  }

  return <>{!socketReady && <div role="status" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-primary/10 bg-primary/5 px-6 py-2.5 text-xs text-textMuted"><span className="inline-flex items-center gap-2"><UiIcon name="clock" className="h-3.5 w-3.5 text-primary" />The live arena is still connecting. You can keep exploring.</span><Link href="/health" className="font-medium text-primary underline underline-offset-4">View service status</Link></div>}{children}</>;
}
