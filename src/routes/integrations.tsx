import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import IntegrationsPage from "../pages/integrations";

export const integrationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/integrations",
  component: IntegrationsPage,
});
