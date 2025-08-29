import { ipcMain } from "electron";
import log from "electron-log";

export function registerRendererLogHandlers() {
  const logger = log.scope("renderer-ipc");

  ipcMain.on("browser-error", (_event, payload: any) => {
    try {
      logger.error("[browser-error]", payload);
    } catch (e) {
      logger.error("Failed to log browser-error payload", e);
    }
  });

  ipcMain.on("debug-log", (_event, entry: any) => {
    try {
      logger.info("[debug-log]", entry);
    } catch (e) {
      logger.error("Failed to log debug-log entry", e);
    }
  });
}
