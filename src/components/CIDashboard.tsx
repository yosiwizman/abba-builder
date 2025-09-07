import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PlayCircle,
  PauseCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  GitBranch,
  GitCommit,
  Package,
  TestTube,
  Zap,
  AlertCircle,
  Activity,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
// Ready for IPC integration
// import { IpcClient } from "@/ipc/ipc_client";
// const ipcClient = IpcClient.getInstance();

interface BuildStatus {
  id: string;
  projectName: string;
  branch: string;
  commit: string;
  commitMessage: string;
  author: string;
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  startTime: string;
  endTime?: string;
  duration?: number;
  progress: number;
  currentStep?: string;
  steps: BuildStep[];
  artifacts?: string[];
  logs?: string[];
}

interface BuildStep {
  name: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  duration?: number;
  logs?: string[];
}

interface TestResult {
  id: string;
  suite: string;
  name: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  error?: string;
}

interface DeploymentStatus {
  id: string;
  environment: string;
  version: string;
  status: "pending" | "in_progress" | "success" | "failed" | "rolled_back";
  deployedBy: string;
  deployedAt: string;
  url?: string;
}

interface CIMetrics {
  totalBuilds: number;
  successRate: number;
  averageBuildTime: number;
  failureRate: number;
  testsPassRate: number;
  deploymentFrequency: number;
  leadTime: number;
  mttr: number; // Mean Time To Recovery
}

export function CIDashboard() {
  const [builds, setBuilds] = useState<BuildStatus[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [deployments, setDeployments] = useState<DeploymentStatus[]>([]);
  const [metrics, setMetrics] = useState<CIMetrics | null>(null);
  const [selectedBuild, setSelectedBuild] = useState<BuildStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch CI data (real IPC calls)
  const fetchCIData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [buildsData, deploymentsData, statsData] = await Promise.all([
        (window as any).electron.invoke('ci:get-builds', { limit: 50 }).catch(() => []),
        (window as any).electron.invoke('ci:get-deployments', { limit: 50 }).catch(() => []),
        (window as any).electron.invoke('ci:get-statistics', { period: 'week' }).catch(() => null),
      ]);
        {
          id: "build-1",
          projectName: "dyad-enhanced",
          branch: "main",
          commit: "abc123",
          commitMessage: "feat: add CI dashboard",
          author: "John Doe",
          status: "running",
          startTime: new Date().toISOString(),
          progress: 65,
          currentStep: "Running tests",
          steps: [
            { name: "Checkout", status: "success", duration: 2 },
            { name: "Install Dependencies", status: "success", duration: 45 },
            { name: "Build", status: "success", duration: 120 },
            { name: "Test", status: "running" },
            { name: "Deploy", status: "pending" },
          ],
        },
        {
          id: "build-2",
          projectName: "dyad-enhanced",
          branch: "feat/new-feature",
          commit: "def456",
          commitMessage: "fix: resolve build issues",
          author: "Jane Smith",
          status: "success",
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date(Date.now() - 1800000).toISOString(),
          duration: 1800,
          progress: 100,
          steps: [
            { name: "Checkout", status: "success", duration: 2 },
            { name: "Install Dependencies", status: "success", duration: 40 },
            { name: "Build", status: "success", duration: 100 },
            { name: "Test", status: "success", duration: 180 },
            { name: "Deploy", status: "success", duration: 60 },
          ],
        },
      ];

      const mockTestResults: TestResult[] = [] as any;
        {
          id: "test-1",
          suite: "Unit Tests",
          name: "IPC Client Tests",
          status: "passed",
          duration: 125,
        },
        {
          id: "test-2",
          suite: "Integration Tests",
          name: "Knowledge Base Integration",
          status: "passed",
          duration: 234,
        },
        {
          id: "test-3",
          suite: "E2E Tests",
          name: "Dashboard Navigation",
          status: "failed",
          duration: 456,
          error: "Element not found: .dashboard-link",
        },
      ];

      const mockDeployments: DeploymentStatus[] = deploymentsData as any;
        {
          id: "deploy-1",
          environment: "Production",
          version: "v0.19.0",
          status: "success",
          deployedBy: "CI/CD Pipeline",
          deployedAt: new Date(Date.now() - 7200000).toISOString(),
          url: "https://app.dyad.sh",
        },
        {
          id: "deploy-2",
          environment: "Staging",
          version: "v0.19.1-beta",
          status: "in_progress",
          deployedBy: "John Doe",
          deployedAt: new Date().toISOString(),
          url: "https://staging.dyad.sh",
        },
      ];

      const mockMetrics: CIMetrics | null = statsData as any;
        totalBuilds: 245,
        successRate: 87.5,
        averageBuildTime: 180,
        failureRate: 12.5,
        testsPassRate: 94.2,
        deploymentFrequency: 3.5,
        leadTime: 45,
        mttr: 15,
      };

      setBuilds(buildsData as any);
      setTestResults(mockTestResults);
      setDeployments(mockDeployments);
      setMetrics(mockMetrics);
    } catch (error) {
      console.error("Failed to fetch CI data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh
  useEffect(() => {
    fetchCIData();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchCIData, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, fetchCIData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
      case "passed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
      case "in_progress":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "cancelled":
      case "skipped":
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  // Utility function for status colors (reserved for future use)
  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case "success":
  //     case "passed":
  //       return "text-green-500";
  //     case "failed":
  //       return "text-red-500";
  //     case "running":
  //     case "in_progress":
  //       return "text-blue-500";
  //     case "pending":
  //       return "text-yellow-500";
  //     case "cancelled":
  //     case "skipped":
  //       return "text-gray-500";
  //     default:
  //       return "";
  //   }
  // };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CI/CD Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor builds, tests, and deployments in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <PauseCircle className="h-4 w-4 mr-2" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-2" />
            )}
            {autoRefresh ? "Pause" : "Resume"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCIData}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Success Rate
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.successRate}%</div>
              <p className="text-xs text-muted-foreground">
                {metrics.successRate > 85 ? (
                  <span className="flex items-center text-green-500">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Healthy
                  </span>
                ) : (
                  <span className="flex items-center text-red-500">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Needs attention
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Build Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(metrics.averageBuildTime)}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 30 days average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Test Pass Rate
              </CardTitle>
              <TestTube className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.testsPassRate}%</div>
              <p className="text-xs text-muted-foreground">
                Across all test suites
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Deploy Frequency
              </CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.deploymentFrequency}/day
              </div>
              <p className="text-xs text-muted-foreground">
                Average deployments
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="builds" className="space-y-4">
        <TabsList>
          <TabsTrigger value="builds">
            <Package className="h-4 w-4 mr-2" />
            Builds
          </TabsTrigger>
          <TabsTrigger value="tests">
            <TestTube className="h-4 w-4 mr-2" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="deployments">
            <Zap className="h-4 w-4 mr-2" />
            Deployments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builds" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Build List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Builds</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {builds.map((build) => (
                      <div
                        key={build.id}
                        className={cn(
                          "p-4 rounded-lg border cursor-pointer transition-colors",
                          selectedBuild?.id === build.id
                            ? "border-primary bg-accent"
                            : "hover:bg-accent/50",
                        )}
                        onClick={() => setSelectedBuild(build)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(build.status)}
                              <span className="font-medium">
                                {build.projectName}
                              </span>
                              <Badge variant="outline" className="ml-2">
                                <GitBranch className="h-3 w-3 mr-1" />
                                {build.branch}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <GitCommit className="h-3 w-3 inline mr-1" />
                              {build.commit.slice(0, 7)} - {build.commitMessage}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              by {build.author} • {formatTime(build.startTime)}
                            </p>
                          </div>
                        </div>
                        {build.status === "running" && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>{build.currentStep}</span>
                              <span>{build.progress}%</span>
                            </div>
                            <Progress value={build.progress} className="h-2" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Build Details */}
            <Card>
              <CardHeader>
                <CardTitle>Build Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedBuild ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">Build Steps</h3>
                      <div className="space-y-2">
                        {selectedBuild.steps.map((step, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 rounded bg-accent/50"
                          >
                            <div className="flex items-center gap-2">
                              {getStatusIcon(step.status)}
                              <span className="text-sm">{step.name}</span>
                            </div>
                            {step.duration && (
                              <span className="text-xs text-muted-foreground">
                                {step.duration}s
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedBuild.duration && (
                      <div>
                        <h3 className="font-medium mb-2">Total Duration</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDuration(selectedBuild.duration)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Select a build to view details
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(test.status)}
                      <div>
                        <p className="font-medium">{test.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {test.suite}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{test.duration}ms</p>
                      {test.error && (
                        <p className="text-xs text-red-500 max-w-xs truncate">
                          {test.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deployment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deployments.map((deployment) => (
                  <div
                    key={deployment.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(deployment.status)}
                      <div>
                        <p className="font-medium">
                          {deployment.environment} - {deployment.version}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          by {deployment.deployedBy} •{" "}
                          {formatTime(deployment.deployedAt)}
                        </p>
                      </div>
                    </div>
                    {deployment.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(deployment.url, "_blank")}
                      >
                        View
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
