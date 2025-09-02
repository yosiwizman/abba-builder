/**
 * CI/CD Dashboard IPC Handlers - Simple Version
 * Provides build and deployment data
 */

import { ipcMain } from "electron";

// Enhanced mock data for CI/CD dashboard
const now = new Date();
const cicdData = {
  builds: [
    {
      id: "build-5",
      status: "pending",
      project: "frontend-app",
      branch: "feature/user-auth",
      timestamp: new Date(now.getTime() - 5 * 60 * 1000).toLocaleString(),
      duration: undefined,
    },
    {
      id: "build-4",
      status: "success",
      project: "backend-api",
      branch: "main",
      timestamp: new Date(now.getTime() - 30 * 60 * 1000).toLocaleString(),
      duration: 245,
    },
    {
      id: "build-3",
      status: "failure",
      project: "mobile-app",
      branch: "hotfix/crash-fix",
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toLocaleString(),
      duration: 180,
    },
    {
      id: "build-2",
      status: "success",
      project: "documentation",
      branch: "develop",
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toLocaleString(),
      duration: 90,
    },
    {
      id: "build-1",
      status: "success",
      project: "main-app",
      branch: "main",
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toLocaleString(),
      duration: 320,
    },
  ],
  deployments: [
    {
      id: "deploy-4",
      environment: "production",
      status: "active",
      version: "2.1.0",
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toLocaleString(),
    },
    {
      id: "deploy-3",
      environment: "staging",
      status: "active",
      version: "2.2.0-beta",
      timestamp: new Date(now.getTime() - 30 * 60 * 1000).toLocaleString(),
    },
    {
      id: "deploy-2",
      environment: "development",
      status: "active",
      version: "2.3.0-dev",
      timestamp: new Date(now.getTime() - 10 * 60 * 1000).toLocaleString(),
    },
    {
      id: "deploy-1",
      environment: "testing",
      status: "inactive",
      version: "2.0.5",
      timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000).toLocaleString(),
    },
  ],
  statistics: {
    totalBuilds: 247,
    successRate: 78,
    averageBuildTime: 195,
  },
};

// Store for build logs
const buildLogs: Record<string, string[]> = {
  "build-1": [
    "Initializing build environment...",
    "Installing dependencies...",
    "Running tests...",
    "All tests passed!",
    "Building production bundle...",
    "Build completed successfully!",
  ],
  "build-2": [
    "Initializing build environment...",
    "Installing dependencies...",
    "Running tests...",
    "Tests passed!",
    "Building documentation...",
    "Documentation built successfully!",
  ],
  "build-3": [
    "Initializing build environment...",
    "Installing dependencies...",
    "Running tests...",
    "ERROR: Test suite failed",
    "Error: Component test failed at line 42",
    "Build failed!",
  ],
  "build-4": [
    "Initializing build environment...",
    "Installing dependencies...",
    "Running backend tests...",
    "All tests passed!",
    "Building API documentation...",
    "Deploying to staging...",
    "Build and deploy completed!",
  ],
  "build-5": [
    "Initializing build environment...",
    "Installing dependencies...",
    "Currently running tests...",
  ],
};

export function registerCIHandlers() {
  console.log("[CIHandlers] Registering CI/CD IPC handlers...");

  // Get builds
  ipcMain.handle("ci:get-builds", async () => {
    console.log(`[CIHandlers] Returning ${cicdData.builds.length} builds`);
    return cicdData.builds;
  });

  // Get deployments
  ipcMain.handle("ci:get-deployments", async () => {
    console.log(
      `[CIHandlers] Returning ${cicdData.deployments.length} deployments`,
    );
    return cicdData.deployments;
  });

  // Get statistics
  ipcMain.handle("ci:get-statistics", async () => {
    console.log("[CIHandlers] Returning statistics");
    return cicdData.statistics;
  });

  // Trigger a new build
  ipcMain.handle("ci:trigger-build", async (_, { project, branch }) => {
    console.log(
      `[CIHandlers] Triggering build for ${project} on branch ${branch}`,
    );
    const newBuild = {
      id: `build-${Date.now()}`,
      status: "pending" as const,
      project,
      branch,
      timestamp: new Date().toLocaleString(),
      duration: undefined,
    };

    // Add to the beginning of the builds array
    cicdData.builds.unshift(newBuild);

    // Simulate build completion after 5 seconds
    setTimeout(() => {
      const buildIndex = cicdData.builds.findIndex((b) => b.id === newBuild.id);
      if (buildIndex !== -1) {
        cicdData.builds[buildIndex].status = "success";
        cicdData.builds[buildIndex].duration =
          Math.floor(Math.random() * 300) + 60;
        cicdData.statistics.totalBuilds++;
        cicdData.statistics.successRate = Math.floor(
          (cicdData.statistics.successRate *
            (cicdData.statistics.totalBuilds - 1) +
            100) /
            cicdData.statistics.totalBuilds,
        );
      }
    }, 5000);

    buildLogs[newBuild.id] = [
      "Build triggered...",
      "Initializing build environment...",
      "Installing dependencies...",
    ];

    return newBuild;
  });

  // Get build details/logs
  ipcMain.handle("ci:get-build-details", async (_, buildId) => {
    console.log(`[CIHandlers] Getting details for build ${buildId}`);
    const build = cicdData.builds.find((b) => b.id === buildId);
    const logs = buildLogs[buildId] || ["No logs available for this build"];

    return {
      build,
      logs,
    };
  });

  console.log("[CIHandlers] CI/CD IPC handlers registered successfully");
}
