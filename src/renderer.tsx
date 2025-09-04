import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import "./utils/browser-error-capture";
import { router } from "./router";
import { RouterProvider } from "@tanstack/react-router";
import { PostHogProvider } from "posthog-js/react";
import { default as posthog } from "posthog-js";
import { getTelemetryUserId, isTelemetryOptedIn } from "./hooks/useSettings";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
  MutationCache,
} from "@tanstack/react-query";
import { showError } from "./lib/toast";

 console.log("Running in mode:", import.meta.env.MODE);

interface MyMeta extends Record<string, unknown> {
  showErrorToast: boolean;
}

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: MyMeta;
    mutationMeta: MyMeta;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.showErrorToast) {
        showError(error);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.showErrorToast) {
        showError(error);
      }
    },
  }),
});

// Check if analytics should be enabled
const ANALYTICS_ENABLED = import.meta.env.VITE_ANALYTICS_ENABLED === 'true' || 
  (import.meta.env.MODE === "production" && import.meta.env.PROD);

let posthogClient: any = null;

if (ANALYTICS_ENABLED) {
  console.info('[Analytics] Enabled - initializing PostHog');
  posthogClient = posthog.init(
    import.meta.env.VITE_POSTHOG_KEY || "phc_5Vxx0XT8Ug3eWROhP6mm4D6D2DgIIKT232q4AKxC2ab",
    {
      api_host: import.meta.env.VITE_POSTHOG_API_HOST || "https://us.i.posthog.com",
      debug: false,
      autocapture: false,
      capture_exceptions: false, // Disable to avoid CSP issues
      capture_pageview: false,
      before_send: (event) => {
        if (!isTelemetryOptedIn()) {
          return null;
        }
        const telemetryUserId = getTelemetryUserId();
        if (telemetryUserId) {
          posthogClient.identify(telemetryUserId);
        }

        if (event?.properties["$ip"]) {
          event.properties["$ip"] = null;
        }

        return event;
      },
      persistence: "localStorage",
    },
  );
} else {
  console.info('[Analytics] Disabled by environment configuration');
  // Create a mock client that does nothing
  posthogClient = {
    capture: () => {},
    identify: () => {},
    alias: () => {},
    people: { set: () => {} },
    reset: () => {},
  };
}

function App() {
  useEffect(() => {
    // Subscribe to navigation state changes
    const unsubscribe = router.subscribe("onResolved", (navigation) => {
      // Skip tracking in development mode
      if (import.meta.env.MODE === "development") {
        return;
      }

      // Capture the navigation event in PostHog (only if enabled)
      if (ANALYTICS_ENABLED && posthogClient) {
        posthogClient.capture("navigation", {
          toPath: navigation.toLocation.pathname,
          fromPath: navigation.fromLocation?.pathname,
        });

        // Optionally capture as a standard pageview as well
        posthogClient.capture("$pageview", {
          path: navigation.toLocation.pathname,
        });
      }
    });

    // Clean up subscription when component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  return <RouterProvider router={router} />;
}

const rootElement = document.getElementById("root");
if (rootElement) {
  // Conditionally wrap with PostHogProvider only if we have a real client
  const AppWithProviders = ANALYTICS_ENABLED && posthogClient ? (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <PostHogProvider client={posthogClient}>
          <App />
        </PostHogProvider>
      </QueryClientProvider>
    </StrictMode>
  ) : (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>
  );
  
  createRoot(rootElement).render(AppWithProviders);
} else {
  console.error("Root element not found");
}
