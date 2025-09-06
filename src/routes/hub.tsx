import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import HubPage from "../pages/hub";

export const hubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hub",
  component: HubPage,
});
