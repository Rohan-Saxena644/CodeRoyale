import type { Metadata } from "next";
import { Header } from "@/components/header";
import { HealthDashboard } from "@/components/health-dashboard";

export const metadata: Metadata = { title: "Service status · CodeRoyale", description: "Check the website, match storage, and live arena connection." };

export default function HealthPage() {
  return <main className="status-backdrop min-h-screen"><Header /><HealthDashboard /><p className="mx-auto max-w-5xl px-6 pb-8 text-center text-xs text-textSoft">A little patience. A great next match.</p></main>;
}
