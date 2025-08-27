import { ipcMain } from "electron";
import log from "electron-log";
import path from "path";
import { existsSync } from "fs";

const logger = log.scope("enhanced_handlers");

// Lazy load the IntegrationHub to avoid initialization issues
let integrationHub: any = null;

async function getIntegrationHub() {
  if (!integrationHub) {
    try {
      logger.debug("Lazy loading IntegrationHub...");
      const modulePath = path.join(
        __dirname,
        "../../../enhanced_systems/integration_hub.ts",
      );

      if (existsSync(modulePath)) {
        const module = await import(modulePath);
        integrationHub = new module.IntegrationHub();
        logger.info("IntegrationHub loaded successfully");
      } else {
        logger.warn(`IntegrationHub module not found at ${modulePath}`);
        // Create a mock integration hub for development
        integrationHub = {
          buildAndDeploy: async (description: string) => {
            logger.info(`Mock build and deploy: ${description}`);
            return {
              success: true,
              deploymentUrl: "http://localhost:3000",
              message: "Mock deployment successful",
            };
          },
          quickBuild: async (template: string, customization: string) => {
            logger.info(`Mock quick build: ${template} - ${customization}`);
            return {
              success: true,
              appPath: "./mock-app",
              message: "Mock quick build successful",
            };
          },
          submitFeedback: async (type: string, data: any) => {
            logger.info(`Mock feedback: ${type}`, data);
            return { success: true };
          },
          getSystemStatus: async () => {
            logger.info("Mock system status check");
            return {
              learning: { active: true, patternsLearned: 0 },
              deployment: { available: true },
              realWorld: { connected: false },
            };
          },
        };
      }
    } catch (error) {
      logger.error("Failed to load IntegrationHub:", error);
      throw error;
    }
  }
  return integrationHub;
}

export function registerEnhancedHandlers() {
  logger.info("Registering enhanced IPC handlers");

  // Build and Deploy handler
  ipcMain.handle(
    "enhanced:build",
    async (_event, { description, techStack }) => {
      try {
        logger.debug("Build request received:", { description, techStack });
        const hub = await getIntegrationHub();

        const result = await hub.buildAndDeploy(description, techStack);
        logger.info("Build completed:", result);

        return {
          success: result.success,
          data: result,
          error: result.error || null,
        };
      } catch (error: any) {
        logger.error("Build failed:", error);
        return {
          success: false,
          error: error.message || "Build failed",
          data: null,
        };
      }
    },
  );

  // Quick Build handler
  ipcMain.handle(
    "enhanced:quickBuild",
    async (_event, { template, customization }) => {
      try {
        logger.debug("Quick build request:", { template, customization });
        const hub = await getIntegrationHub();

        const result = await hub.quickBuild(template, customization);
        logger.info("Quick build completed:", result);

        return {
          success: result.success,
          data: result,
          error: result.error || null,
        };
      } catch (error: any) {
        logger.error("Quick build failed:", error);
        return {
          success: false,
          error: error.message || "Quick build failed",
          data: null,
        };
      }
    },
  );

  // Submit Feedback handler
  ipcMain.handle("enhanced:feedback", async (_event, { type, data }) => {
    try {
      logger.debug("Feedback submission:", { type, data });
      const hub = await getIntegrationHub();

      const result = await hub.submitFeedback(type, data);
      logger.info("Feedback submitted:", result);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      logger.error("Feedback submission failed:", error);
      return {
        success: false,
        error: error.message || "Feedback submission failed",
        data: null,
      };
    }
  });

  // System Status handler
  ipcMain.handle("enhanced:status", async (_event) => {
    try {
      logger.debug("System status check requested");
      const hub = await getIntegrationHub();

      const status = await hub.getSystemStatus();
      logger.info("System status:", status);

      return {
        success: true,
        data: status,
      };
    } catch (error: any) {
      logger.error("Status check failed:", error);
      return {
        success: false,
        error: error.message || "Status check failed",
        data: null,
      };
    }
  });

  // Error Recommendation handler
  ipcMain.handle("enhanced:errorRecommendation", async (_event, { error }) => {
    try {
      logger.debug("Error recommendation requested:", error);
      const hub = await getIntegrationHub();

      if (hub.getErrorRecommendations) {
        const recommendations = await hub.getErrorRecommendations(error);
        return {
          success: true,
          data: recommendations,
        };
      } else {
        // Fallback if method doesn't exist
        return {
          success: true,
          data: {
            recommendations: [
              "Check the error message for syntax issues",
              "Verify all dependencies are installed",
              "Review recent changes that might have caused the error",
            ],
          },
        };
      }
    } catch (error: any) {
      logger.error("Error recommendation failed:", error);
      return {
        success: false,
        error: error.message || "Failed to get recommendations",
        data: null,
      };
    }
  });

  // Pattern Matching handler
  ipcMain.handle("enhanced:matchPattern", async (_event, { input }) => {
    try {
      logger.debug("Pattern matching requested:", input);
      const hub = await getIntegrationHub();

      if (hub.matchPattern) {
        const matches = await hub.matchPattern(input);
        return {
          success: true,
          data: matches,
        };
      } else {
        // Fallback
        return {
          success: true,
          data: {
            patterns: [],
            suggestions: ["No pattern matching available in mock mode"],
          },
        };
      }
    } catch (error: any) {
      logger.error("Pattern matching failed:", error);
      return {
        success: false,
        error: error.message || "Pattern matching failed",
        data: null,
      };
    }
  });

  // Knowledge Export handler
  ipcMain.handle("enhanced:exportKnowledge", async (_event) => {
    try {
      logger.debug("Knowledge export requested");
      const hub = await getIntegrationHub();

      if (hub.exportKnowledge) {
        const knowledge = await hub.exportKnowledge();
        return {
          success: true,
          data: knowledge,
        };
      } else {
        // Fallback
        return {
          success: true,
          data: {
            patterns: [],
            deployments: [],
            feedback: [],
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error: any) {
      logger.error("Knowledge export failed:", error);
      return {
        success: false,
        error: error.message || "Knowledge export failed",
        data: null,
      };
    }
  });

  // Knowledge Import handler
  ipcMain.handle("enhanced:importKnowledge", async (_event, { data }) => {
    try {
      logger.debug("Knowledge import requested");
      const hub = await getIntegrationHub();

      if (hub.importKnowledge) {
        const result = await hub.importKnowledge(data);
        return {
          success: true,
          data: result,
        };
      } else {
        // Fallback
        return {
          success: true,
          data: {
            message: "Knowledge import not available in mock mode",
          },
        };
      }
    } catch (error: any) {
      logger.error("Knowledge import failed:", error);
      return {
        success: false,
        error: error.message || "Knowledge import failed",
        data: null,
      };
    }
  });

  logger.info("Enhanced IPC handlers registered successfully");
}
