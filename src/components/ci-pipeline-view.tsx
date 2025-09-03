import React, { useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  GitBranch,
  GitCommit,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStep {
  name: string;
  status: "success" | "failure" | "pending" | "running";
  duration?: number;
}

interface CIPipelineViewProps {
  steps?: PipelineStep[];
  branch?: string;
  commit?: string;
  className?: string;
}

const defaultSteps: PipelineStep[] = [
  { name: "Checkout", status: "success", duration: 2 },
  { name: "Install", status: "success", duration: 45 },
  { name: "Build", status: "running", duration: 120 },
  { name: "Test", status: "pending", duration: 60 },
  { name: "Deploy", status: "pending" },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "success":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "failure":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "running":
      return <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />;
    case "pending":
      return <Clock className="h-5 w-5 text-yellow-500" />;
    default:
      return null;
  }
};

const getNodeColor = (status: string) => {
  switch (status) {
    case "success":
      return "#10b981";
    case "failure":
      return "#ef4444";
    case "running":
      return "#f97316";
    case "pending":
      return "#eab308";
    default:
      return "#6b7280";
  }
};

const CustomNode = ({ data }: NodeProps) => {
  return (
    <div
      className={cn(
        "px-4 py-2 shadow-md rounded-md bg-background border-2",
        data.status === "running" && "animate-pulse",
      )}
      style={{ borderColor: getNodeColor(data.status) }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2">
        {getStatusIcon(data.status)}
        <div className="text-sm font-medium">{data.label}</div>
      </div>
      {data.duration && (
        <div className="text-xs text-muted-foreground mt-1">
          {data.duration}s
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export function CIPipelineView({
  steps = defaultSteps,
  branch = "main",
  commit = "abc123",
  className,
}: CIPipelineViewProps) {
  const { nodes: pipelineNodes, edges: pipelineEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    steps.forEach((step, index) => {
      const x = index * 200 + 50;
      const y = 100;

      nodes.push({
        id: `${index}`,
        type: "custom",
        position: { x, y },
        data: {
          label: step.name,
          status: step.status,
          duration: step.duration,
        },
      });

      if (index > 0) {
        edges.push({
          id: `e${index - 1}-${index}`,
          source: `${index - 1}`,
          target: `${index}`,
          animated: step.status === "running" || step.status === "pending",
          style: {
            stroke: getNodeColor(steps[index - 1].status),
            strokeWidth: 2,
          },
        });
      }
    });

    return { nodes, edges };
  }, [steps]);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <GitBranch className="h-4 w-4" />
          <span>{branch}</span>
        </div>
        <div className="flex items-center gap-1">
          <GitCommit className="h-4 w-4" />
          <span>{commit.substring(0, 7)}</span>
        </div>
      </div>
      <div
        className="border rounded-lg bg-muted/10"
        style={{ height: "400px" }}
      >
        <ReactFlow
          nodes={pipelineNodes}
          edges={pipelineEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#aaa" gap={16} />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
