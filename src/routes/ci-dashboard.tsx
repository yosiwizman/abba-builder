import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import { CIDashboard } from "@/components/ci-dashboard";

export const ciDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ci-dashboard",
  component: CIDashboardPage,
});

function CIDashboardPage() {
  return (
    <div className="h-full overflow-auto">
      <CIDashboard />
    </div>
  );
}
