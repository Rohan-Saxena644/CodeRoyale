"use client";

import Link from "next/link";
import { UiIcon } from "@/components/ui-icon";
import type { ServiceHealth, ServiceState } from "@/components/use-service-health";

const serviceInfo = [
  { key: "web" as const, name: "Website", detail: "Pages and room controls", icon: "code" as const },
  { key: "database" as const, name: "Match storage", detail: "Rooms, problems, and results", icon: "server" as const },
  { key: "socket" as const, name: "Live arena", detail: "Player connections and code sync", icon: "bolt" as const },
];

function ServiceLabel({ state }: { state: ServiceState }) {
  const text = state === "operational" ? "Operational" : state === "checking" ? "Checking" : "Not connected";
  return <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${state === "operational" ? "text-success" : state === "checking" ? "text-textSoft" : "text-warning"}`}><span className={`h-1.5 w-1.5 rounded-full ${state === "operational" ? "bg-success" : state === "checking" ? "bg-textSoft" : "bg-warning"}`} />{text}</span>;
}

export function ServiceStatus({ health, wake = false, onBrowse }: { health: ServiceHealth; wake?: boolean; onBrowse?: () => void }) {
  const { services, checking, elapsed, attempts, lastChecked, retry } = health;
  const ready = Object.values(services).every(value => value === "operational");
  const slow = elapsed >= 60 && !ready;
  const roomWaking = services.socket !== "operational";
  const title = ready ? "The arena is ready." : slow ? "Taking a little longer." : wake ? "A good duel is worth\na short warm-up." : "Checking the arena.";
  const detail = ready ? "Everything is connected. Grab a friend and put your next solution to the test." : slow ? "One or more services haven’t connected yet. We’ll keep checking, and you can explore the site in the meantime." : roomWaking ? "The live arena may need a moment to wake up after being idle. We’re checking your connection automatically." : "The live arena is connected. We’re checking match storage before your next duel.";

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-12 sm:py-20 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{wake ? "Getting ready for your next rivalry" : "CodeRoyale service status"}</p>
        <div className="mt-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-white text-primary shadow-sm">
          {ready ? <UiIcon name="check" className="h-7 w-7" /> : <div className="relative flex h-9 w-9 items-center justify-center"><span className="absolute inset-0 animate-spin rounded-full border-2 border-primary/10 border-t-primary" /><UiIcon name={slow ? "clock" : "bolt"} className="h-4 w-4" /></div>}
        </div>
        <h1 className="mt-6 whitespace-pre-line text-4xl font-semibold leading-[1.15] tracking-[-0.04em] text-textMain sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-md text-sm leading-7 text-textMuted sm:text-base">{detail}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          {ready ? <Link href="/match" className="inline-flex items-center gap-3 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primaryHover">Create a duel<UiIcon name="arrow" className="h-4 w-4" /></Link> : <button type="button" onClick={retry} disabled={checking} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primaryHover disabled:cursor-wait disabled:opacity-60"><UiIcon name="refresh" className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />{checking ? "Checking connection…" : "Check again"}</button>}
          {onBrowse ? <button type="button" onClick={onBrowse} className="rounded-lg border border-border bg-white px-5 py-3 text-sm font-medium text-textMuted transition hover:border-primary/40 hover:text-primary">Explore the homepage</button> : <Link href="/" className="rounded-lg border border-border bg-white px-5 py-3 text-sm font-medium text-textMuted transition hover:border-primary/40 hover:text-primary">Back to homepage</Link>}
        </div>
        <p className="mt-5 text-xs leading-5 text-textSoft">{ready ? "Service checks refresh every 30 seconds." : "This page updates automatically. No need to refresh."}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-borderSoft bg-bgSoft/60 px-6 py-5"><div><h2 className="text-sm font-semibold text-textMain">Connection overview</h2><p className="mt-1 text-xs text-textSoft">A live check of the essentials</p></div><span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${ready ? "border-success/15 bg-success/5 text-success" : "border-primary/15 bg-primary/5 text-primary"}`}>{ready ? "Ready to play" : checking ? "Checking" : "Reconnecting"}</span></div>
        <ul className="divide-y divide-borderSoft px-6" aria-label="Service availability">{serviceInfo.map(service => <li key={service.key} className="flex items-center justify-between gap-3 py-5"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bgSoft text-textSoft"><UiIcon name={service.icon} className="h-4 w-4" /></span><div><h3 className="text-sm font-medium text-textMain">{service.name}</h3><p className="mt-0.5 hidden text-xs text-textSoft sm:block">{service.detail}</p></div></div><ServiceLabel state={services[service.key]} /></li>)}</ul>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-borderSoft bg-bgSoft/60 px-6 py-3 text-[11px] text-textSoft"><span>{lastChecked ? `Last checked ${new Date(lastChecked).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Waiting for the first response"}</span><span>{!ready && `${elapsed}s elapsed · Check ${attempts || 1}`}</span></div>
        <div className="border-t border-borderSoft px-6 py-5"><p className="flex items-center gap-2 text-xs font-medium text-textMain"><UiIcon name="clock" className="h-3.5 w-3.5 text-primary" />{ready ? "All set for your next match" : "Why the short wait?"}</p><p className="mt-2 text-xs leading-6 text-textMuted">{ready ? "These checks cover the website, match storage, and live connections. Code execution is checked when you submit a solution." : services.database === "unavailable" && services.socket === "operational" ? "The website is available, but match storage hasn’t responded. Room creation may be unavailable until it reconnects." : "The live service can sleep between visits. Starting it again may take a minute. Your browser will reconnect when it responds."}</p></div>
      </div>
    </section>
  );
}
