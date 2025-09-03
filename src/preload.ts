// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

// Whitelist of valid channels
const validInvokeChannels = [
  "get-language-models",
  "get-language-models-by-providers",
  "create-custom-language-model",
  "get-language-model-providers",
  "delete-custom-language-model-provider",
  "create-custom-language-model-provider",
  "delete-custom-language-model",
  "delete-custom-model",
  "chat:add-dep",
  "chat:message",
  "chat:cancel",
  "chat:stream",
  "chat:count-tokens",
  "create-chat",
  "create-app",
  "copy-app",
  "get-chat",
  "get-chats",
  "get-chat-logs",
  "list-apps",
  "get-app",
  "get-app-env-vars",
  "set-app-env-vars",
  "edit-app-file",
  "read-app-file",
  "run-app",
  "stop-app",
  "restart-app",
  "respond-to-app-input",
  "list-versions",
  "revert-version",
  "checkout-version",
  "get-current-branch",
  "delete-app",
  "rename-app",
  "get-user-settings",
  "set-user-settings",
  "get-env-vars",
  "open-external-url",
  "show-item-in-folder",
  "reset-all",
  "nodejs-status",
  "install-node",
  "github:start-flow",
  "github:list-repos",
  "github:get-repo-branches",
  "github:is-repo-available",
  "github:create-repo",
  "github:connect-existing-repo",
  "github:push",
  "github:disconnect",
  "github:fetch-issues",
  "neon:create-project",
  "neon:get-project",
  "neon:delete-branch",
  "vercel:save-token",
  "vercel:list-projects",
  "vercel:is-project-available",
  "vercel:create-project",
  "vercel:connect-existing-project",
  "vercel:get-deployments",
  "vercel:disconnect",
  "get-app-version",
  "reload-env-path",
  "get-proposal",
  "approve-proposal",
  "reject-proposal",
  "get-system-debug-info",
  "supabase:list-projects",
  "supabase:set-app-project",
  "supabase:unset-app-project",
  "local-models:list-ollama",
  "local-models:list-lmstudio",
  "window:minimize",
  "window:maximize",
  "window:close",
  "get-system-platform",
  "upload-to-signed-url",
  "delete-chat",
  "update-chat",
  "delete-messages",
  "start-chat-stream",
  "does-release-note-exist",
  "import-app",
  "check-ai-rules",
  "select-app-folder",
  "check-app-name",
  "rename-branch",
  "clear-session-data",
  "get-user-budget",
  "get-context-paths",
  "set-context-paths",
  "get-app-upgrades",
  "execute-app-upgrade",
  "is-capacitor",
  "sync-capacitor",
  "open-ios",
  "open-android",
  "check-problems",
  "restart-dyad",
  "get-templates",
  "portal:migrate-create",
  // Help bot
  "help:chat:start",
  "help:chat:cancel",
  // Prompts
  "prompts:list",
  "prompts:create",
  "prompts:update",
  "prompts:delete",
  // Knowledge Hub channels
  "knowledge:get-patterns",
  "knowledge:get-bugs",
  "knowledge:get-bridges",
  "knowledge:get-modules",
  "knowledge:get-statistics",
  "knowledge:refresh",
  "knowledge:search",
  "knowledge:record-bug",
  "knowledge:record-pattern",
  "knowledge:update-success-rate",
  // CI/CD Dashboard channels
  "ci:get-builds",
  "ci:get-deployments",
  "ci:get-pipelines",
  "ci:get-tests",
  "ci:get-statistics",
  "ci:trigger-build",
  "ci:trigger-deployment",
  "ci:cancel-build",
  "ci:get-logs",
  "ci:get-build-details",
  "ci:get-providers",
  "ci:configure-provider",
  "ci:set-active-provider",
  "ci:subscribe-updates",
  "ci:unsubscribe-updates",
  "ci:stream-build-logs",
  "ci:stop-stream-build-logs",
  // Test-only channels
  // These should ALWAYS be guarded with IS_TEST_BUILD in the main process.
  // We can't detect with IS_TEST_BUILD in the preload script because
  // it's a separate process from the main process.
  "supabase:fake-connect-and-set-project",
] as const;

// Add valid receive channels
const validReceiveChannels = [
  "chat:response:chunk",
  "chat:response:end",
  "chat:response:error",
  "app:output",
  "github:flow-update",
  "github:flow-success",
  "github:flow-error",
  "deep-link-received",
  // Help bot
  "help:chat:response:chunk",
  "help:chat:response:end",
  "help:chat:response:error",
  // CI/CD real-time updates
  "ci:update",
  "ci:build-logs",
] as const;

type ValidInvokeChannel = (typeof validInvokeChannels)[number];
type ValidReceiveChannel = (typeof validReceiveChannels)[number];

// Helper wrappers that enforce channel allow-lists
const safeInvoke = (channel: ValidInvokeChannel, ...args: unknown[]) => {
  if (validInvokeChannels.includes(channel)) {
    return ipcRenderer.invoke(channel, ...args);
  }
  throw new Error(`Invalid channel: ${channel}`);
};

const safeOn = (
  channel: ValidReceiveChannel,
  listener: (...args: unknown[]) => void,
) => {
  if (validReceiveChannels.includes(channel)) {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      ...args: unknown[]
    ) => listener(...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  }
  throw new Error(`Invalid channel: ${channel}`);
};

const safeRemoveAll = (channel: ValidReceiveChannel) => {
  if (validReceiveChannels.includes(channel)) {
    ipcRenderer.removeAllListeners(channel);
  }
};

const safeRemove = (
  channel: ValidReceiveChannel,
  listener: (...args: unknown[]) => void,
) => {
  if (validReceiveChannels.includes(channel)) {
    ipcRenderer.removeListener(channel, listener);
  }
};

// Expose protected methods in both shapes for backward compatibility
// Allow-listed send-only channels from renderer to main
const validSendChannels = ["browser-error", "debug-log"] as const;

type ValidSendChannel = (typeof validSendChannels)[number];

const safeSend = (channel: ValidSendChannel, ...args: unknown[]) => {
  if (validSendChannels.includes(channel)) {
    ipcRenderer.send(channel, ...(args as any));
    return;
  }
  throw new Error(`Invalid channel: ${channel}`);
};

const api = {
  // Nested ipcRenderer API
  ipcRenderer: {
    invoke: safeInvoke,
    on: safeOn,
    removeAllListeners: safeRemoveAll,
    removeListener: safeRemove,
    send: safeSend,
  },
  // Top-level convenience methods (many components expect these)
  invoke: safeInvoke,
  on: safeOn,
  removeAllListeners: safeRemoveAll,
  removeListener: safeRemove,
  send: safeSend,
  // Convenience wrapper for Bugs Tracker component
  fetchProjectBugs: (args: {
    owner: string;
    repo: string;
    state?: "open" | "closed" | "all";
    labels?: string[];
    perPage?: number;
    page?: number;
    includePRs?: boolean;
    search?: string;
  }) => safeInvoke("github:fetch-issues", args),
} as const;

contextBridge.exposeInMainWorld("electron", api);
// Legacy alias used by some components
contextBridge.exposeInMainWorld("electronAPI", api);
