import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import ChatPage from "../pages/chat";
import { z } from "zod";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { clerkPubKey } from "@/lib/clerk-config";

export const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat",
  component: () => (
    clerkPubKey ? (
      <>
        <SignedIn>
          <ChatPage />
        </SignedIn>
        <SignedOut>
          <RedirectToSignIn />
        </SignedOut>
      </>
    ) : (
      <ChatPage />
    )
  ),
  validateSearch: z.object({
    id: z.number().optional(),
  }),
});
