import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import CICDPage from "@/pages/ci-cd";

export const ciDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ci-dashboard",
  component: CIDashboardPage,
});

function CIDashboardPage() {
  return (
    <div className="h-full overflow-auto">
      <CICDPage />
    </div>
  );
}
