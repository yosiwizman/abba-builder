import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Plus,
  Eye,
  Play,
  Settings,
} from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";
import { BuildDetailsModal } from "./ci-build-details";
import { CIProviderConfig } from "./ci-provider-config";
import type {
  CIBuild,
  CIDeployment,
  CIStatistics,
} from "@/types/ci-dashboard.types";

export function CIDashboard() {
  const [builds, setBuilds] = useState<CIBuild[]>([]);
  const [deployments, setDeployments] = useState<CIDeployment[]>([]);
  const [statistics, setStatistics] = useState<CIStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const [showBuildDetails, setShowBuildDetails] = useState(false);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);
  const [triggerProject, setTriggerProject] = useState("frontend-app");
  const [triggerBranch, setTriggerBranch] = useState("main");
  const [triggering, setTriggering] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const ipcClient = IpcClient.getInstance();

      // Load all data in parallel
      const [buildsData, deploymentsData, statsData] = await Promise.all([
        ipcClient.getCIBuilds(),
        ipcClient.getCIDeployments(),
        ipcClient.getCIStatistics(),
      ]);

      setBuilds(buildsData);
      setDeployments(deploymentsData);
      setStatistics(statsData);
    } catch (err) {
      console.error("Failed to load CI/CD dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  const handleTriggerBuild = async () => {
    try {
      setTriggering(true);
      const ipcClient = IpcClient.getInstance();
      await ipcClient.triggerCIBuild(triggerProject, triggerBranch);
      setShowTriggerDialog(false);
      // Refresh data after a short delay to show the new build
      setTimeout(() => loadDashboardData(true), 500);
    } catch (error) {
      console.error("Failed to trigger build:", error);
    } finally {
      setTriggering(false);
    }
  };

  const handleViewBuildDetails = (buildId: string) => {
    setSelectedBuildId(buildId);
    setShowBuildDetails(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failure":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "success":
      case "active":
        return "default";
      case "failure":
        return "destructive";
      case "pending":
      case "inactive":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CI/CD Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your builds and deployments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowConfigDialog(true)}
            size="sm"
            variant="outline"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button
            onClick={() => setShowTriggerDialog(true)}
            size="sm"
            variant="default"
          >
            <Plus className="h-4 w-4 mr-2" />
            Trigger Build
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            size="sm"
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Total Builds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalBuilds}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.successRate}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Avg Build Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.averageBuildTime}s
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Builds */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Builds</CardTitle>
          <CardDescription>Latest CI/CD pipeline executions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {builds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No builds available
              </p>
            ) : (
              builds.map((build) => (
                <div
                  key={build.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(build.status)}
                    <div>
                      <p className="font-medium">{build.project}</p>
                      <p className="text-sm text-muted-foreground">
                        {build.branch} • {build.timestamp}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleViewBuildDetails(build.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {build.duration && (
                      <span className="text-sm text-muted-foreground">
                        {build.duration}s
                      </span>
                    )}
                    <Badge variant={getStatusBadgeVariant(build.status)}>
                      {build.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Deployments */}
      <Card>
        <CardHeader>
          <CardTitle>Active Deployments</CardTitle>
          <CardDescription>
            Current deployment status across environments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {deployments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No deployments available
              </p>
            ) : (
              deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{deployment.environment}</p>
                    <p className="text-sm text-muted-foreground">
                      v{deployment.version} • {deployment.timestamp}
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(deployment.status)}>
                    {deployment.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trigger Build Dialog */}
      <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trigger New Build</DialogTitle>
            <DialogDescription>
              Start a new CI/CD pipeline build for a project
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project" className="text-right">
                Project
              </Label>
              <Input
                id="project"
                value={triggerProject}
                onChange={(e) => setTriggerProject(e.target.value)}
                className="col-span-3"
                placeholder="e.g., frontend-app"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="branch" className="text-right">
                Branch
              </Label>
              <Input
                id="branch"
                value={triggerBranch}
                onChange={(e) => setTriggerBranch(e.target.value)}
                className="col-span-3"
                placeholder="e.g., main"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleTriggerBuild}
              disabled={triggering || !triggerProject || !triggerBranch}
            >
              {triggering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Trigger Build
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Build Details Modal */}
      <BuildDetailsModal
        buildId={selectedBuildId}
        isOpen={showBuildDetails}
        onClose={() => {
          setShowBuildDetails(false);
          setSelectedBuildId(null);
        }}
      />

      {/* Provider Configuration Dialog */}
      <CIProviderConfig
        open={showConfigDialog}
        onClose={() => setShowConfigDialog(false)}
        onConfigured={() => {
          // Refresh data after configuration
          loadDashboardData(true);
        }}
      />
    </div>
  );
}
