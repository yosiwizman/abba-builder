import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import { SignUp } from "@clerk/clerk-react";

export const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-up",
  component: () => (
    <div className="flex items-center justify-center h-full p-6">
      <SignUp routing="path" path="/sign-up" />
    </div>
  ),
});

