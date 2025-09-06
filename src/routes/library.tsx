import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import LibraryPage from "../pages/library";

export const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library",
  component: LibraryPage,
});
