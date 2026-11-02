"use client";

import { useServiceHealth } from "@/components/use-service-health";
import { ServiceStatus } from "@/components/service-status";

export function HealthDashboard() {
  const health = useServiceHealth();
  return <ServiceStatus health={health} />;
}
