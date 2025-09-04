import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Plus, Settings, GitBranch, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { IpcClient } from "@/ipc/ipc_client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/lib/toast";

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: 'manual' | 'push' | 'pull_request' | 'schedule' | 'webhook';
  branch?: string;
  schedule?: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  lastRun?: Date;
  nextRun?: Date;
  steps: WorkflowStep[];
  parameters?: Record<string, any>;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'build' | 'test' | 'deploy' | 'script' | 'approval';
  status?: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  command?: string;
  environment?: string;
  dependsOn?: string[];
}

export default function WorkflowsPage() {
  const router = useRouter();
  const ipcClient = IpcClient.getInstance();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Form state for new workflow
  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    description: "",
    trigger: "manual" as Workflow['trigger'],
    branch: "main",
    schedule: "",
    steps: [] as WorkflowStep[],
  });

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      // For now, use mock data. Later this will connect to the CI/CD system
      const mockWorkflows: Workflow[] = [
        {
          id: "1",
          name: "Build and Test",
          description: "Runs build and test suite on every push",
          trigger: "push",
          branch: "main",
          status: "success",
          lastRun: new Date(Date.now() - 3600000),
          steps: [
            { id: "1-1", name: "Install Dependencies", type: "build", status: "success" },
            { id: "1-2", name: "Run Tests", type: "test", status: "success" },
            { id: "1-3", name: "Build Application", type: "build", status: "success" },
          ],
        },
        {
          id: "2",
          name: "Deploy to Production",
          description: "Deploy application to production environment",
          trigger: "manual",
          status: "idle",
          lastRun: new Date(Date.now() - 86400000),
          steps: [
            { id: "2-1", name: "Build Docker Image", type: "build" },
            { id: "2-2", name: "Run E2E Tests", type: "test" },
            { id: "2-3", name: "Deploy to Staging", type: "deploy", environment: "staging" },
            { id: "2-4", name: "Manual Approval", type: "approval" },
            { id: "2-5", name: "Deploy to Production", type: "deploy", environment: "production" },
          ],
        },
        {
          id: "3",
          name: "Nightly Build",
          description: "Automated nightly build and test",
          trigger: "schedule",
          schedule: "0 2 * * *",
          status: "running",
          nextRun: new Date(Date.now() + 43200000),
          steps: [
            { id: "3-1", name: "Clean Workspace", type: "script", status: "success" },
            { id: "3-2", name: "Full Build", type: "build", status: "running" },
            { id: "3-3", name: "Integration Tests", type: "test", status: "pending" },
            { id: "3-4", name: "Generate Reports", type: "script", status: "pending" },
          ],
        },
      ];
      setWorkflows(mockWorkflows);
      if (mockWorkflows.length > 0) {
        setSelectedWorkflow(mockWorkflows[0]);
      }
    } catch (error) {
      console.error("Failed to load workflows:", error);
      showError("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  };

  const runWorkflow = async (workflow: Workflow) => {
    try {
      // Trigger the workflow through CI/CD integration
      const result = await ipcClient.invoke("ci:trigger-build", {
        branch: workflow.branch || "main",
        parameters: workflow.parameters,
      });
      
      if (result.success) {
        showSuccess(`Workflow "${workflow.name}" started successfully`);
        loadWorkflows(); // Reload to get updated status
      } else {
        showError(result.error || "Failed to start workflow");
      }
    } catch (error) {
      showError("Failed to trigger workflow");
    }
  };

  const createWorkflow = async () => {
    if (!newWorkflow.name) {
      showError("Workflow name is required");
      return;
    }

    try {
      // Save workflow configuration
      const workflow: Workflow = {
        id: Date.now().toString(),
        ...newWorkflow,
        status: "idle",
        steps: newWorkflow.steps.length > 0 ? newWorkflow.steps : [
          { id: "step-1", name: "Build", type: "build" },
          { id: "step-2", name: "Test", type: "test" },
        ],
      };

      // In a real implementation, this would save to a backend
      workflows.push(workflow);
      setWorkflows([...workflows]);
      setIsCreating(false);
      setNewWorkflow({
        name: "",
        description: "",
        trigger: "manual",
        branch: "main",
        schedule: "",
        steps: [],
      });
      showSuccess("Workflow created successfully");
    } catch (error) {
      showError("Failed to create workflow");
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      failed: "destructive",
      running: "secondary",
      idle: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen px-8 py-4">
      <div className="max-w-7xl mx-auto">
        <Button
          onClick={() => router.history.back()}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Workflows
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage and monitor your CI/CD workflows
            </p>
          </div>
          <Button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Workflow
          </Button>
        </div>

        {isCreating ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create New Workflow</CardTitle>
              <CardDescription>
                Define a new automated workflow for your project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Workflow Name</Label>
                <Input
                  id="name"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                  placeholder="e.g., Build and Deploy"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                  placeholder="Describe what this workflow does"
                />
              </div>

              <div>
                <Label htmlFor="trigger">Trigger Type</Label>
                <Select
                  value={newWorkflow.trigger}
                  onValueChange={(value: Workflow['trigger']) => 
                    setNewWorkflow({ ...newWorkflow, trigger: value })
                  }
                >
                  <SelectTrigger id="trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="push">On Push</SelectItem>
                    <SelectItem value="pull_request">On Pull Request</SelectItem>
                    <SelectItem value="schedule">Scheduled</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newWorkflow.trigger === 'schedule' && (
                <div>
                  <Label htmlFor="schedule">Schedule (Cron)</Label>
                  <Input
                    id="schedule"
                    value={newWorkflow.schedule}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, schedule: e.target.value })}
                    placeholder="e.g., 0 2 * * * (2 AM daily)"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  value={newWorkflow.branch}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, branch: e.target.value })}
                  placeholder="main"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={createWorkflow}>Create Workflow</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setNewWorkflow({
                      name: "",
                      description: "",
                      trigger: "manual",
                      branch: "main",
                      schedule: "",
                      steps: [],
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workflow List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-lg font-semibold mb-3">Available Workflows</h2>
            {workflows.map((workflow) => (
              <Card
                key={workflow.id}
                className={`cursor-pointer transition-colors ${
                  selectedWorkflow?.id === workflow.id
                    ? "border-primary"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
                onClick={() => setSelectedWorkflow(workflow)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{workflow.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {workflow.description}
                      </CardDescription>
                    </div>
                    {getStatusBadge(workflow.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {workflow.branch || "main"}
                    </div>
                    {workflow.lastRun && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(workflow.lastRun).toLocaleString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Workflow Details */}
          <div className="lg:col-span-2">
            {selectedWorkflow ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{selectedWorkflow.name}</CardTitle>
                      <CardDescription>{selectedWorkflow.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {selectedWorkflow.trigger === 'manual' && (
                        <Button
                          size="sm"
                          onClick={() => runWorkflow(selectedWorkflow)}
                          disabled={selectedWorkflow.status === 'running'}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Run Now
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="steps">Steps</TabsTrigger>
                      <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500">Trigger</Label>
                          <p className="font-medium capitalize">{selectedWorkflow.trigger}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Branch</Label>
                          <p className="font-medium">{selectedWorkflow.branch || "main"}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Status</Label>
                          <div className="mt-1">{getStatusBadge(selectedWorkflow.status)}</div>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Last Run</Label>
                          <p className="font-medium">
                            {selectedWorkflow.lastRun
                              ? new Date(selectedWorkflow.lastRun).toLocaleString()
                              : "Never"}
                          </p>
                        </div>
                        {selectedWorkflow.schedule && (
                          <div>
                            <Label className="text-xs text-gray-500">Schedule</Label>
                            <p className="font-mono text-sm">{selectedWorkflow.schedule}</p>
                          </div>
                        )}
                        {selectedWorkflow.nextRun && (
                          <div>
                            <Label className="text-xs text-gray-500">Next Run</Label>
                            <p className="font-medium">
                              {new Date(selectedWorkflow.nextRun).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="steps" className="mt-4">
                      <div className="space-y-3">
                        {selectedWorkflow.steps.map((step, index) => (
                          <div
                            key={step.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex-shrink-0">
                              {getStatusIcon(step.status)}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{step.name}</div>
                              <div className="text-xs text-gray-500">
                                Type: {step.type}
                                {step.environment && ` • Environment: ${step.environment}`}
                              </div>
                            </div>
                            {index < selectedWorkflow.steps.length - 1 && (
                              <div className="text-gray-400">→</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-4">
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>Workflow history will appear here</p>
                        <p className="text-sm mt-1">Run history and logs from past executions</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Settings className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">Select a workflow to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
