/**
 * CI/CD Dashboard IPC Handlers V2 - Real Provider Integration
 * Integrates with actual CI/CD providers through the provider manager
 */

import { ipcMain } from "electron";
// Logger import - using console for now
const logger = {
  info: (...args: any[]) => console.log("[CI Info]", ...args),
  error: (...args: any[]) => console.error("[CI Error]", ...args),
  warn: (...args: any[]) => console.warn("[CI Warning]", ...args),
  debug: (...args: any[]) => console.debug("[CI Debug]", ...args),
};
import { CIProviderManager } from "@/lib/ci-cd/provider-manager";
import {
  CIProviderType,
  BuildStatus,
  DeploymentStatus,
  ProviderConfig,
} from "@/lib/ci-cd/types";

const LOG_PREFIX = "[CIHandlers-V2]";

// Get the provider manager instance
const providerManager = CIProviderManager.getInstance();

// Fallback mock data when no provider is configured
const mockData = {
  builds: [
    {
      id: "mock-1",
      number: 1,
      status: BuildStatus.SUCCESS,
      branch: "main",
      commit: "abc123",
      commitMessage: "Initial commit",
      author: "Demo User",
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(Date.now() - 3000000),
      duration: 600000,
      url: "#",
    },
  ],
  deployments: [
    {
      id: "mock-deploy-1",
      environment: "production",
      status: DeploymentStatus.SUCCESS,
      version: "v1.0.0",
      deployedBy: "Demo User",
      deployedAt: new Date(Date.now() - 7200000),
      url: "#",
    },
  ],
  statistics: {
    totalBuilds: 10,
    successRate: 80,
    averageDuration: 300000,
    failureRate: 20,
    buildsPerDay: 2,
  },
};

export function registerCIHandlersV2() {
  logger.info(`${LOG_PREFIX} Registering enhanced CI/CD IPC handlers...`);

  // Configure provider
  ipcMain.handle(
    "ci:configure-provider",
    async (
      _,
      config: {
        providerId: string;
        type: CIProviderType;
        auth: {
          type: "token" | "oauth" | "basic";
          token?: string;
          username?: string;
          password?: string;
        };
        repository?: string;
        owner?: string;
        repo?: string;
      },
    ) => {
      try {
        logger.info(
          `${LOG_PREFIX} Configuring provider: ${config.providerId} (${config.type})`,
        );

        const providerConfig: ProviderConfig = {
          type: config.type,
          auth: config.auth,
          baseUrl: config.repository,
          options: {
            owner: config.owner,
            repo: config.repo,
          },
        };

        const success = await providerManager.registerProvider(
          config.providerId,
          providerConfig,
        );

        if (success) {
          logger.info(
            `${LOG_PREFIX} Provider configured successfully: ${config.providerId}`,
          );
          return { success: true, message: "Provider configured successfully" };
        } else {
          logger.error(
            `${LOG_PREFIX} Failed to configure provider: ${config.providerId}`,
          );
          return {
            success: false,
            error: "Failed to authenticate with provider",
          };
        }
      } catch (error) {
        logger.error(`${LOG_PREFIX} Error configuring provider:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  );

  // Get configured providers
  ipcMain.handle("ci:get-providers", async () => {
    try {
      const providers = providerManager.getAllProviders();
      const activeProvider = providerManager.getActiveProvider();

      const providerList = Array.from(providers.entries()).map(
        ([id, provider]) => ({
          id,
          name: provider.name,
          type: provider.type,
          isActive: activeProvider === provider,
          isAuthenticated: provider.isAuthenticated(),
        }),
      );

      logger.info(
        `${LOG_PREFIX} Returning ${providerList.length} configured providers`,
      );
      return providerList;
    } catch (error) {
      logger.error(`${LOG_PREFIX} Error getting providers:`, error);
      return [];
    }
  });

  // Set active provider
  ipcMain.handle("ci:set-active-provider", async (_, providerId: string) => {
    try {
      const success = providerManager.setActiveProvider(providerId);
      logger.info(
        `${LOG_PREFIX} Set active provider to: ${providerId} - ${success ? "Success" : "Failed"}`,
      );
      return { success };
    } catch (error) {
      logger.error(`${LOG_PREFIX} Error setting active provider:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  // Get builds
  ipcMain.handle(
    "ci:get-builds",
    async (
      _,
      options?: {
        branch?: string;
        limit?: number;
        offset?: number;
      },
    ) => {
      try {
        const provider = providerManager.getActiveProvider();

        if (!provider || !provider.isAuthenticated()) {
          logger.warn(`${LOG_PREFIX} No active provider, returning mock data`);
          return mockData.builds;
        }

        const builds = await providerManager.getBuilds({
          branch: options?.branch,
          limit: options?.limit || 30,
          offset: options?.offset,
        });

        // Convert to dashboard format
        const dashboardBuilds = builds.map((build) => ({
          id: build.id,
          status: mapBuildStatus(build.status),
          project: provider.name,
          branch: build.branch,
          timestamp: build.startedAt.toLocaleString(),
          duration: build.duration
            ? Math.floor(build.duration / 1000)
            : undefined,
          commitHash: build.commit,
          author: build.author,
          message: build.commitMessage,
        }));

        logger.info(
          `${LOG_PREFIX} Returning ${dashboardBuilds.length} builds from provider`,
        );
        return dashboardBuilds;
      } catch (error) {
        logger.error(`${LOG_PREFIX} Error fetching builds:`, error);
        return mockData.builds.map((b) => ({
          id: b.id,
          status: mapBuildStatus(b.status),
          project: "Demo Project",
          branch: b.branch,
          timestamp: b.startedAt.toLocaleString(),
          duration: b.duration ? Math.floor(b.duration / 1000) : undefined,
          commitHash: b.commit,
          author: b.author,
          message: b.commitMessage,
        }));
      }
    },
  );

  // Get deployments
  ipcMain.handle(
    "ci:get-deployments",
    async (
      _,
      options?: {
        environment?: string;
        limit?: number;
      },
    ) => {
      try {
        const provider = providerManager.getActiveProvider();

        if (!provider || !provider.isAuthenticated()) {
          logger.warn(`${LOG_PREFIX} No active provider, returning mock data`);
          return mockData.deployments.map((d) => ({
            id: d.id,
            environment: d.environment,
            status: mapDeploymentStatus(d.status),
            version: d.version,
            timestamp: d.deployedAt.toLocaleString(),
          }));
        }

        const deployments = await providerManager.getDeployments({
          environment: options?.environment,
          limit: options?.limit || 30,
        });

        // Convert to dashboard format
        const dashboardDeployments = deployments.map((deployment) => ({
          id: deployment.id,
          environment: deployment.environment,
          status: mapDeploymentStatus(deployment.status),
          version: deployment.version,
          timestamp: deployment.deployedAt.toLocaleString(),
          deployedBy: deployment.deployedBy,
        }));

        logger.info(
          `${LOG_PREFIX} Returning ${dashboardDeployments.length} deployments from provider`,
        );
        return dashboardDeployments;
      } catch (error) {
        logger.error(`${LOG_PREFIX} Error fetching deployments:`, error);
        return mockData.deployments.map((d) => ({
          id: d.id,
          environment: d.environment,
          status: mapDeploymentStatus(d.status),
          version: d.version,
          timestamp: d.deployedAt.toLocaleString(),
        }));
      }
    },
  );

  // Get statistics
  ipcMain.handle(
    "ci:get-statistics",
    async (
      _,
      options?: {
        period?: "day" | "week" | "month" | "year";
        branch?: string;
      },
    ) => {
      try {
        const provider = providerManager.getActiveProvider();

        if (!provider || !provider.isAuthenticated()) {
          logger.warn(
            `${LOG_PREFIX} No active provider, returning mock statistics`,
          );
          return mockData.statistics;
        }

        const stats = await providerManager.getStatistics(options);

        logger.info(`${LOG_PREFIX} Returning statistics from provider`);
        return {
          totalBuilds: stats.totalBuilds,
          successRate: Math.round(stats.successRate),
          averageBuildTime: Math.round(stats.averageDuration / 1000), // Convert to seconds
          failureRate: Math.round(stats.failureRate),
          totalDeployments: stats.totalBuilds, // Approximate
          activeEnvironments: 3, // Default
        };
      } catch (error) {
        logger.error(`${LOG_PREFIX} Error fetching statistics:`, error);
        return mockData.statistics;
      }
    },
  );

  // Trigger build
  ipcMain.handle("ci:trigger-build", async (_, { branch }) => {
    try {
      const provider = providerManager.getActiveProvider();

      if (!provider || !provider.isAuthenticated()) {
        logger.warn(
          `${LOG_PREFIX} No active provider, simulating build trigger`,
        );
        return {
          success: true,
          buildId: `mock-${Date.now()}`,
          message: "Build triggered (simulation)",
        };
      }

      logger.info(`${LOG_PREFIX} Triggering build on branch ${branch}`);
      const build = await providerManager.triggerBuild({ branch });

      return {
        success: true,
        buildId: build.id,
        message: "Build triggered successfully",
      };
    } catch (error) {
      logger.error(`${LOG_PREFIX} Error triggering build:`, error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to trigger build",
      };
    }
  });

  // Get build details
  ipcMain.handle("ci:get-build-details", async (_, buildId: string) => {
    try {
      const provider = providerManager.getActiveProvider();

      if (!provider || !provider.isAuthenticated()) {
        logger.warn(
          `${LOG_PREFIX} No active provider, returning mock build details`,
        );
        return {
          build: mockData.builds[0],
          logs: ["Mock log line 1", "Mock log line 2", "Build completed"],
        };
      }

      logger.info(`${LOG_PREFIX} Getting details for build ${buildId}`);
      const buildDetails = await providerManager.getBuildDetails(buildId);

      return {
        build: {
          id: buildDetails.id,
          status: mapBuildStatus(buildDetails.status),
          project: provider.name,
          branch: buildDetails.branch,
          timestamp: buildDetails.startedAt.toLocaleString(),
          duration: buildDetails.duration
            ? Math.floor(buildDetails.duration / 1000)
            : undefined,
          commitHash: buildDetails.commit,
          author: buildDetails.author,
          message: buildDetails.commitMessage,
        },
        logs: buildDetails.logs?.split("\n") || [],
        steps: buildDetails.steps?.map((step) => ({
          name: step.name,
          status: mapBuildStatus(step.status),
          duration: step.duration
            ? Math.floor(step.duration / 1000)
            : undefined,
        })),
        artifacts: buildDetails.artifacts,
      };
    } catch (error) {
      logger.error(`${LOG_PREFIX} Error fetching build details:`, error);
      return {
        build: mockData.builds[0],
        logs: ["Error fetching build details"],
      };
    }
  });

  // Trigger deployment
  ipcMain.handle(
    "ci:trigger-deployment",
    async (_, { environment, version, buildId }) => {
      try {
        const provider = providerManager.getActiveProvider();

        if (!provider || !provider.isAuthenticated()) {
          logger.warn(
            `${LOG_PREFIX} No active provider, simulating deployment`,
          );
          return {
            success: true,
            deploymentId: `mock-deploy-${Date.now()}`,
            message: "Deployment triggered (simulation)",
          };
        }

        logger.info(
          `${LOG_PREFIX} Triggering deployment to ${environment} with version ${version}`,
        );
        const deployment = await providerManager.triggerDeployment({
          environment,
          version,
          buildId,
        });

        return {
          success: true,
          deploymentId: deployment.id,
          message: "Deployment triggered successfully",
        };
      } catch (error) {
        logger.error(`${LOG_PREFIX} Error triggering deployment:`, error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to trigger deployment",
        };
      }
    },
  );

  // Subscribe to real-time updates
  ipcMain.handle("ci:subscribe-updates", async (event) => {
    try {
      const provider = providerManager.getActiveProvider();

      if (!provider || !provider.isAuthenticated()) {
        logger.warn(`${LOG_PREFIX} No active provider for real-time updates`);
        return { success: false, message: "No active provider" };
      }

      const unsubscribe = providerManager.subscribeToUpdates((update) => {
        // Send update to renderer
        event.sender.send("ci:update", {
          type: update.type,
          action: update.action,
          data: update.data,
        });
      });

      // Store unsubscribe function for cleanup
      (global as any).ciUpdateUnsubscribe = unsubscribe;

      logger.info(`${LOG_PREFIX} Subscribed to real-time updates`);
      return { success: true };
    } catch (error) {
      logger.error(`${LOG_PREFIX} Error subscribing to updates:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to subscribe",
      };
    }
  });

  // Unsubscribe from updates
  ipcMain.handle("ci:unsubscribe-updates", async () => {
    try {
      if ((global as any).ciUpdateUnsubscribe) {
        (global as any).ciUpdateUnsubscribe();
        delete (global as any).ciUpdateUnsubscribe;
      }

      logger.info(`${LOG_PREFIX} Unsubscribed from real-time updates`);
      return { success: true };
    } catch (error) {
      logger.error(`${LOG_PREFIX} Error unsubscribing from updates:`, error);
      return { success: false };
    }
  });

  // Stream build logs (polling-based)
  ipcMain.handle(
    "ci:stream-build-logs",
    async (
      event,
      { buildId, intervalMs }: { buildId: string; intervalMs?: number },
    ) => {
      try {
        const provider = providerManager.getActiveProvider();
        const poll = Math.max(1000, intervalMs || 2000);

        (global as any).ciLogStreams = (global as any).ciLogStreams || {};
        (global as any).ciLogStreamsState =
          (global as any).ciLogStreamsState || {};

        // Initialize state
        (global as any).ciLogStreamsState[buildId] = {
          lastCount: 0,
          done: false,
        };

        const tick = async () => {
          try {
            // If stopped
            const state = (global as any).ciLogStreamsState[buildId];
            if (!state || state.done) {
              clearInterval((global as any).ciLogStreams[buildId]);
              delete (global as any).ciLogStreams[buildId];
              return;
            }

            if (!provider || !provider.isAuthenticated()) {
              // Simulate logs
              const newLine = `Simulated log at ${new Date().toLocaleTimeString()}`;
              event.sender.send("ci:build-logs", { buildId, lines: [newLine] });
              return;
            }

            const details = await providerManager.getBuildDetails(buildId);
            const allLines = (details.logs || "").split("\n");
            const lastCount = state.lastCount || 0;

            if (allLines.length > lastCount) {
              const append = allLines.slice(lastCount);
              event.sender.send("ci:build-logs", { buildId, lines: append });
              state.lastCount = allLines.length;
            }

            // Stop if build finished
            if (
              details.status === ("success" as any) ||
              details.status === ("failure" as any) ||
              details.status === ("cancelled" as any) ||
              details.completedAt
            ) {
              state.done = true;
              clearInterval((global as any).ciLogStreams[buildId]);
              delete (global as any).ciLogStreams[buildId];
            }
          } catch (err) {
            logger.error(
              `${LOG_PREFIX} Error streaming logs for ${buildId}:`,
              err,
            );
          }
        };

        // Immediate tick and then interval
        await tick();
        (global as any).ciLogStreams[buildId] = setInterval(tick, poll);

        logger.info(`${LOG_PREFIX} Started log streaming for build ${buildId}`);
        return { success: true };
      } catch (error) {
        logger.error(`${LOG_PREFIX} Error starting log stream:`, error);
        return { success: false };
      }
    },
  );

  // Stop build log streaming
  ipcMain.handle(
    "ci:stop-stream-build-logs",
    async (_, { buildId }: { buildId: string }) => {
      try {
        if (
          (global as any).ciLogStreams &&
          (global as any).ciLogStreams[buildId]
        ) {
          clearInterval((global as any).ciLogStreams[buildId]);
          delete (global as any).ciLogStreams[buildId];
        }
        if (
          (global as any).ciLogStreamsState &&
          (global as any).ciLogStreamsState[buildId]
        ) {
          (global as any).ciLogStreamsState[buildId].done = true;
        }
        logger.info(`${LOG_PREFIX} Stopped log streaming for build ${buildId}`);
        return { success: true };
      } catch (error) {
        logger.error(`${LOG_PREFIX} Error stopping log stream:`, error);
        return { success: false };
      }
    },
  );

  logger.info(
    `${LOG_PREFIX} Enhanced CI/CD IPC handlers registered successfully`,
  );
}

// Helper functions to map between provider types and dashboard types
function mapBuildStatus(status: BuildStatus): string {
  switch (status) {
    case BuildStatus.QUEUED:
      return "pending";
    case BuildStatus.IN_PROGRESS:
      return "running";
    case BuildStatus.SUCCESS:
      return "success";
    case BuildStatus.FAILURE:
      return "failure";
    case BuildStatus.CANCELLED:
      return "cancelled";
    case BuildStatus.SKIPPED:
      return "skipped";
    default:
      return "pending";
  }
}

function mapDeploymentStatus(status: DeploymentStatus): string {
  switch (status) {
    case DeploymentStatus.PENDING:
      return "pending";
    case DeploymentStatus.IN_PROGRESS:
      return "deploying";
    case DeploymentStatus.SUCCESS:
      return "active";
    case DeploymentStatus.FAILURE:
      return "failed";
    case DeploymentStatus.ROLLED_BACK:
      return "inactive";
    default:
      return "inactive";
  }
}
