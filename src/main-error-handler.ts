import { app, dialog } from "electron";
import * as log from "electron-log";

const logger = log.scope("error-handler");

export function setupErrorHandlers() {
  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", error);

    // Don't show dialog in development
    if (process.env.NODE_ENV !== "development") {
      dialog.showErrorBox(
        "Unexpected Error",
        `An unexpected error occurred:\n${error.message}\n\nThe app will try to continue running.`,
      );
    }

    // Try to recover instead of crashing
    if (error.message && error.message.includes("ruby")) {
      logger.info("Ignoring Ruby-related error from external project");
      return;
    }
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (error: any) => {
    logger.error("Unhandled Rejection:", error);

    // Ignore specific known issues
    if (error && error.message) {
      if (
        error.message.includes("ruby") ||
        error.message.includes("oxide") ||
        error.message.includes("extractor")
      ) {
        logger.info("Ignoring extractor-related rejection");
        return;
      }
    }
  });

  // Handle renderer process crashes
  app.on("render-process-gone", (event, webContents, details) => {
    logger.error("Render process gone:", details);

    if (details.reason === "crashed") {
      const choice = dialog.showMessageBoxSync({
        type: "error",
        buttons: ["Restart App", "Close"],
        defaultId: 0,
        message: "Application Error",
        detail: "The application has crashed. Would you like to restart it?",
      });

      if (choice === 0) {
        app.relaunch();
        app.exit();
      } else {
        app.quit();
      }
    }
  });

  // Handle app GPU process crashes
  app.on("child-process-gone", (event, details) => {
    if (details.type === "GPU" && details.reason === "crashed") {
      logger.error("GPU process crashed, details:", details);
      // GPU crashes are usually recoverable
    }
  });

  // Log app lifecycle events
  app.on("will-quit", () => {
    logger.info("App is about to quit");
  });

  app.on("before-quit", () => {
    logger.info("App received quit signal");
  });

  logger.info("Error handlers initialized");
}

// Export a function to safely execute code with error handling
export async function safeExecute<T>(
  operation: () => Promise<T> | T,
  errorMessage: string,
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`${errorMessage}:`, error);
    return null;
  }
}
