import { ipcMain } from "electron";
import * as log from "electron-log";
import { libraryAutoUpdater } from "../../services/enhanced/library-auto-updater";

const logger = log.scope("library-updater-handlers");

export function registerLibraryUpdaterHandlers() {
  logger.info("Registering library auto-updater IPC handlers");

  // Get current configuration
  ipcMain.handle("library:get-config", async () => {
    try {
      const config = await libraryAutoUpdater.updateConfig({}); // Get current config
      return {
        success: true,
        data: config,
      };
    } catch (error: any) {
      logger.error("Failed to get library config:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Update configuration
  ipcMain.handle("library:update-config", async (event, config) => {
    try {
      logger.info("Updating library auto-updater config:", config);
      const updatedConfig = await libraryAutoUpdater.updateConfig(config);
      return {
        success: true,
        data: updatedConfig,
      };
    } catch (error: any) {
      logger.error("Failed to update library config:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Force immediate update
  ipcMain.handle("library:force-update", async () => {
    try {
      logger.info("Force update requested via IPC");
      const result = await libraryAutoUpdater.forceUpdate();
      return {
        success: result.success,
        data: result,
      };
    } catch (error: any) {
      logger.error("Force update failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Search projects
  ipcMain.handle("library:search", async (event, query: string) => {
    try {
      const projects = await libraryAutoUpdater.searchProjects(query);
      return {
        success: true,
        data: projects,
      };
    } catch (error: any) {
      logger.error("Search failed:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  });

  // Get projects by category
  ipcMain.handle("library:get-by-category", async (event, category: string) => {
    try {
      const projects = await libraryAutoUpdater.getProjectsByCategory(category);
      return {
        success: true,
        data: projects,
      };
    } catch (error: any) {
      logger.error("Get by category failed:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  });

  // Get downloaded projects
  ipcMain.handle("library:get-downloaded", async () => {
    try {
      const projects = await libraryAutoUpdater.getDownloadedProjects();
      return {
        success: true,
        data: projects,
      };
    } catch (error: any) {
      logger.error("Get downloaded projects failed:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  });

  // Get statistics
  ipcMain.handle("library:get-statistics", async () => {
    try {
      const stats = await libraryAutoUpdater.getStatistics();
      return {
        success: true,
        data: stats,
      };
    } catch (error: any) {
      logger.error("Get statistics failed:", error);
      return {
        success: false,
        error: error.message,
        data: {},
      };
    }
  });

  // Get update history
  ipcMain.handle("library:get-update-history", async () => {
    try {
      const history = libraryAutoUpdater.getUpdateHistory();
      return {
        success: true,
        data: history,
      };
    } catch (error: any) {
      logger.error("Get update history failed:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  });

  // Set up event forwarding to renderer
  libraryAutoUpdater.on("initialized", (config) => {
    logger.info("Library auto-updater initialized");
    // Send to all windows
    const { BrowserWindow } = require("electron");
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send("library:initialized", config);
    });
  });

  libraryAutoUpdater.on("updateStarted", () => {
    logger.info("Library update started");
    const { BrowserWindow } = require("electron");
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send("library:update-started");
    });
  });

  libraryAutoUpdater.on("updateCompleted", (result) => {
    logger.info("Library update completed:", result);
    const { BrowserWindow } = require("electron");
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send("library:update-completed", result);
    });
  });

  libraryAutoUpdater.on("updateFailed", (error) => {
    logger.error("Library update failed:", error);
    const { BrowserWindow } = require("electron");
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send("library:update-failed", error.message);
    });
  });

  libraryAutoUpdater.on("configUpdated", (config) => {
    logger.info("Library config updated:", config);
    const { BrowserWindow } = require("electron");
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send("library:config-updated", config);
    });
  });

  logger.info("Library auto-updater IPC handlers registered successfully");
}
