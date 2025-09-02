import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock, Terminal } from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";

interface BuildDetailsModalProps {
  buildId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Export as CIBuildDetails for backward compatibility
export function CIBuildDetails() {
  const [selectedBuildId, setSelectedBuildId] = React.useState<string | null>(
    null,
  );
  const [isOpen, setIsOpen] = React.useState(false);

  // Mock data for demonstration - replace with real data from IPC
  const builds = [
    {
      id: "build-1",
      project: "Main Application",
      branch: "main",
      status: "success",
      timestamp: new Date().toISOString(),
      duration: 120,
    },
    {
      id: "build-2",
      project: "Feature Branch",
      branch: "feature/new-feature",
      status: "pending",
      timestamp: new Date().toISOString(),
      duration: null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Build History</h2>
      </div>

      <div className="grid gap-4">
        {builds.map((build) => (
          <div
            key={build.id}
            className="p-4 border rounded-lg hover:bg-accent cursor-pointer"
            onClick={() => {
              setSelectedBuildId(build.id);
              setIsOpen(true);
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{build.project}</p>
                <p className="text-sm text-muted-foreground">{build.branch}</p>
              </div>
              <Badge
                variant={
                  build.status === "success"
                    ? "default"
                    : build.status === "pending"
                      ? "secondary"
                      : "destructive"
                }
              >
                {build.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <BuildDetailsModal
        buildId={selectedBuildId}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setSelectedBuildId(null);
        }}
      />
    </div>
  );
}

export function BuildDetailsModal({
  buildId,
  isOpen,
  onClose,
}: BuildDetailsModalProps) {
  const [build, setBuild] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (buildId && isOpen) {
      loadBuildDetails();
    }
  }, [buildId, isOpen]);

  const loadBuildDetails = async () => {
    if (!buildId) return;

    try {
      setLoading(true);
      const ipcClient = IpcClient.getInstance();
      const details = await ipcClient.getCIBuildDetails(buildId);
      setBuild(details.build);
      setLogs(details.logs);
    } catch (error) {
      console.error("Failed to load build details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failure":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "success":
        return "default";
      case "failure":
        return "destructive";
      case "pending":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Build Details
          </DialogTitle>
          {build && (
            <DialogDescription asChild>
              <div className="flex items-center gap-2 mt-2">
                {getStatusIcon(build.status)}
                <span className="font-medium">{build.project}</span> •
                <span>{build.branch}</span> •
                <Badge variant={getStatusBadgeVariant(build.status)}>
                  {build.status}
                </Badge>
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {build && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Build ID
                      </p>
                      <p className="font-mono text-sm">{build.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Timestamp
                      </p>
                      <p className="text-sm">{build.timestamp}</p>
                    </div>
                    {build.duration && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Duration
                        </p>
                        <p className="text-sm">{build.duration} seconds</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">Build Logs</h3>
                    <ScrollArea className="h-96 w-full rounded-lg border bg-black p-4">
                      <div className="font-mono text-xs text-green-400 space-y-1">
                        {logs.map((log, index) => (
                          <div key={index} className="flex gap-2">
                            <span className="text-gray-500 select-none">
                              [{String(index + 1).padStart(3, "0")}]
                            </span>
                            <span
                              className={
                                log.includes("ERROR")
                                  ? "text-red-400"
                                  : log.includes("WARNING")
                                    ? "text-yellow-400"
                                    : ""
                              }
                            >
                              {log}
                            </span>
                          </div>
                        ))}
                        {build.status === "pending" && (
                          <div className="flex gap-2 items-center mt-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-yellow-400">
                              Build in progress...
                            </span>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
