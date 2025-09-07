import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import { SignIn } from "@clerk/clerk-react";

export const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  component: () => (
    <div className="flex items-center justify-center h-full p-6">
      <SignIn routing="path" path="/sign-in" />
    </div>
  ),
});

