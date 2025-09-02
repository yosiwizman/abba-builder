import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Rocket,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  GitBranch,
  Server,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Deployment {
  id: string;
  environment: string;
  version: string;
  status: "pending" | "deploying" | "active" | "failed" | "inactive";
  deployedBy?: string;
  deployedAt: string;
  buildId?: string;
  url?: string;
}

interface Environment {
  name: string;
  displayName: string;
  description: string;
  url?: string;
  isProduction: boolean;
}

const ENVIRONMENTS: Environment[] = [
  {
    name: "development",
    displayName: "Development",
    description: "Development environment for testing",
    url: "https://dev.example.com",
    isProduction: false,
  },
  {
    name: "staging",
    displayName: "Staging",
    description: "Pre-production environment",
    url: "https://staging.example.com",
    isProduction: false,
  },
  {
    name: "production",
    displayName: "Production",
    description: "Live production environment",
    url: "https://app.example.com",
    isProduction: true,
  },
];

export function DeploymentManager() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  // Deploy dialog state
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState("development");
  const [deployVersion, setDeployVersion] = useState("");
  const [deployBuildId, setDeployBuildId] = useState("");

  // Rollback dialog state
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<Deployment | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadDeployments();
  }, []);

  const loadDeployments = async () => {
    try {
      setLoading(true);
      const data = await window.electron.invoke("ci:get-deployments", {
        limit: 50,
      });
      setDeployments(data || []);
    } catch (error) {
      console.error("Failed to load deployments:", error);
      toast({
        title: "Failed to Load Deployments",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!deployVersion) {
      toast({
        title: "Version Required",
        description: "Please enter a version number",
        variant: "destructive",
      });
      return;
    }

    setDeploying(true);

    try {
      const result = await window.electron.invoke("ci:trigger-deployment", {
        environment: selectedEnvironment,
        version: deployVersion,
        buildId: deployBuildId || undefined,
      });

      if (result.success) {
        toast({
          title: "Deployment Triggered",
          description: `Deployment ${result.deploymentId} started for ${selectedEnvironment}`,
        });

        setShowDeployDialog(false);
        setDeployVersion("");
        setDeployBuildId("");

        // Refresh deployments after a delay
        setTimeout(() => loadDeployments(), 2000);
      } else {
        throw new Error(result.error || "Deployment failed");
      }
    } catch (error) {
      toast({
        title: "Deployment Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to trigger deployment",
        variant: "destructive",
      });
    } finally {
      setDeploying(false);
    }
  };

  const handleRollback = async () => {
    if (!rollbackTarget) return;

    setRollingBack(true);

    try {
      // In a real implementation, this would call a rollback-specific endpoint
      const result = await window.electron.invoke("ci:trigger-deployment", {
        environment: rollbackTarget.environment,
        version: rollbackTarget.version,
        buildId: rollbackTarget.buildId,
        isRollback: true,
      });

      if (result.success) {
        toast({
          title: "Rollback Initiated",
          description: `Rolling back ${rollbackTarget.environment} to v${rollbackTarget.version}`,
        });

        setShowRollbackDialog(false);
        setRollbackTarget(null);

        // Refresh deployments
        setTimeout(() => loadDeployments(), 2000);
      } else {
        throw new Error(result.error || "Rollback failed");
      }
    } catch (error) {
      toast({
        title: "Rollback Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to initiate rollback",
        variant: "destructive",
      });
    } finally {
      setRollingBack(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "deploying":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "active":
        return "default";
      case "failed":
        return "destructive";
      case "pending":
      case "deploying":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getEnvironmentDeployments = (envName: string) => {
    return deployments
      .filter((d) => d.environment === envName)
      .sort(
        (a, b) =>
          new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime(),
      );
  };

  const openRollbackDialog = (deployment: Deployment) => {
    setRollbackTarget(deployment);
    setShowRollbackDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Deployment Management
          </h2>
          <p className="text-muted-foreground">
            Deploy and manage your application across environments
          </p>
        </div>
        <Button onClick={() => setShowDeployDialog(true)}>
          <Rocket className="h-4 w-4 mr-2" />
          New Deployment
        </Button>
      </div>

      {/* Environment Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {ENVIRONMENTS.map((env) => {
          const envDeployments = getEnvironmentDeployments(env.name);
          const currentDeployment = envDeployments[0];

          return (
            <Card key={env.name} className="relative">
              {env.isProduction && (
                <div className="absolute top-4 right-4">
                  <Badge variant="destructive">Production</Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  {env.displayName}
                </CardTitle>
                <CardDescription>{env.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Current Deployment */}
                {currentDeployment ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Current Version
                      </span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(currentDeployment.status)}
                        <Badge
                          variant={getStatusBadgeVariant(
                            currentDeployment.status,
                          )}
                        >
                          {currentDeployment.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">
                          v{currentDeployment.version}
                        </span>
                      </div>

                      {currentDeployment.buildId && (
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Build: {currentDeployment.buildId}
                          </span>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        {currentDeployment.deployedBy && (
                          <span>by {currentDeployment.deployedBy} • </span>
                        )}
                        {currentDeployment.deployedAt}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {env.url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => window.open(env.url, "_blank")}
                        >
                          View Site
                        </Button>
                      )}

                      {envDeployments.length > 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openRollbackDialog(envDeployments[1])}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Rollback
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No deployments yet</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setSelectedEnvironment(env.name);
                        setShowDeployDialog(true);
                      }}
                    >
                      Deploy First Version
                    </Button>
                  </div>
                )}

                {/* Deployment History */}
                {envDeployments.length > 1 && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Previous Deployments
                    </p>
                    <div className="space-y-1">
                      {envDeployments.slice(1, 4).map((deployment) => (
                        <div
                          key={deployment.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="font-mono">
                            v{deployment.version}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(
                              deployment.deployedAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Deploy Dialog */}
      <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Deployment</DialogTitle>
            <DialogDescription>
              Deploy a specific version to an environment
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="environment" className="text-right">
                Environment
              </Label>
              <Select
                value={selectedEnvironment}
                onValueChange={setSelectedEnvironment}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENVIRONMENTS.map((env) => (
                    <SelectItem key={env.name} value={env.name}>
                      <div className="flex items-center gap-2">
                        {env.displayName}
                        {env.isProduction && (
                          <Badge variant="destructive" className="text-xs">
                            Production
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="version" className="text-right">
                Version
              </Label>
              <Input
                id="version"
                value={deployVersion}
                onChange={(e) => setDeployVersion(e.target.value)}
                className="col-span-3"
                placeholder="e.g., 1.2.3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="buildId" className="text-right">
                Build ID
              </Label>
              <Input
                id="buildId"
                value={deployBuildId}
                onChange={(e) => setDeployBuildId(e.target.value)}
                className="col-span-3"
                placeholder="Optional - link to specific build"
              />
            </div>

            {selectedEnvironment === "production" && (
              <Alert className="border-yellow-500">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You are deploying to production. This action will affect live
                  users.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeployDialog(false)}
              disabled={deploying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeploy}
              disabled={deploying || !deployVersion}
            >
              {deploying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Deploy
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rollback</DialogTitle>
            <DialogDescription>
              Are you sure you want to rollback this deployment?
            </DialogDescription>
          </DialogHeader>

          {rollbackTarget && (
            <div className="py-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This will rollback{" "}
                  <strong>{rollbackTarget.environment}</strong> to{" "}
                  <strong>v{rollbackTarget.version}</strong> deployed on{" "}
                  {new Date(rollbackTarget.deployedAt).toLocaleString()}.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRollbackDialog(false);
                setRollbackTarget(null);
              }}
              disabled={rollingBack}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRollback}
              disabled={rollingBack}
            >
              {rollingBack ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rolling Back...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Confirm Rollback
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
