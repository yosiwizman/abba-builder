import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import { MonitoringDashboard } from "../pages/monitoring-dashboard";

export const monitoringRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/monitoring",
  component: MonitoringDashboard,
});

