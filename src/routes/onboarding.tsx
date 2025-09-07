import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";

export const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Welcome to Abba</h1>
      <p className="text-muted-foreground">Complete your account setup to get started.</p>
    </div>
  ),
});

