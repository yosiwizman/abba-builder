import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import { AuthSettings } from "../pages/auth-settings";

export const authSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth-settings",
  component: () => <AuthSettings />,
});

