"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ServiceState = "checking" | "operational" | "unavailable";
export type ServiceSnapshot = { web: ServiceState; database: ServiceState; socket: ServiceState };

export function useServiceHealth() {
  const [services, setServices] = useState<ServiceSnapshot>({ web: "checking", database: "checking", socket: "checking" });
  const [checking, setChecking] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [refresh, setRefresh] = useState(0);
  const started = useRef(Date.now());
  const retry = useCallback(() => setRefresh(value => value + 1), []);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;

    async function check() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      setChecking(true);
      setAttempts(value => value + 1);
      const socketUrl = (process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000").replace(/\/$/, "");
      const [web, socket] = await Promise.allSettled([
        fetch("/api/health", { signal: controller.signal, cache: "no-store" }).then(async res => {
          if (!res.ok) throw new Error("Web service unavailable");
          const data = await res.json();
          if (data.ok !== true) throw new Error("Invalid health response");
          if (!cancelled) setServices(current => ({ ...current, web: "operational", database: data.checks?.database === "operational" ? "operational" : "unavailable" }));
          return data as { checks?: { database?: string } };
        }),
        fetch(`${socketUrl}/health`, { signal: controller.signal, cache: "no-store" }).then(async res => {
          if (!res.ok || (await res.json()).ok !== true) throw new Error("Room service unavailable");
          if (!cancelled) setServices(current => ({ ...current, socket: "operational" }));
        }),
      ]);
      clearTimeout(timeout);
      if (cancelled) return;
      const next: ServiceSnapshot = {
        web: web.status === "fulfilled" ? "operational" : "unavailable",
        database: web.status === "fulfilled" && web.value.checks?.database === "operational" ? "operational" : "unavailable",
        socket: socket.status === "fulfilled" ? "operational" : "unavailable",
      };
      setServices(next);
      setLastChecked(Date.now());
      setChecking(false);
      timer = setTimeout(check, Object.values(next).every(value => value === "operational") ? 30000 : 5000);
    }

    void check();
    return () => { cancelled = true; clearTimeout(timer); controller?.abort(); };
  }, [refresh]);

  return { services, checking, attempts, elapsed, lastChecked, retry };
}

export type ServiceHealth = ReturnType<typeof useServiceHealth>;
