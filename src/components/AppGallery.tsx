import React, { useState, useEffect } from "react";
import { useLoadApps } from "@/hooks/useLoadApps";
import { useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import {
  Loader2,
  Code2,
  Calendar,
  FileText,
  ExternalLink,
  Play,
  Trash2,
  Camera,
} from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";
import { toast } from "sonner";
import { useAppScreenshot } from "@/hooks/useAppScreenshot";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AppCardProps {
  app: {
    id: number;
    name: string;
    createdAt: string;
    description?: string;
    framework?: string;
    screenshot?: string; // Base64 encoded screenshot
  };
  onDelete: (id: number) => void;
  onOpen: (id: number) => void;
  onCapture?: (id: number) => void;
}

function AppCard({ app, onDelete, onOpen, onCapture }: AppCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    try {
      await IpcClient.getInstance().deleteApp(app.id);
      toast.success(`Deleted app: ${app.name}`);
      onDelete(app.id);
    } catch (error) {
      toast.error("Failed to delete app");
      console.error("Delete error:", error);
    }
    setShowDeleteDialog(false);
  };

  // Generate a placeholder background based on app name
  const getPlaceholderColor = (name: string) => {
    const colors = [
      "bg-gradient-to-br from-purple-400 to-pink-400",
      "bg-gradient-to-br from-blue-400 to-cyan-400",
      "bg-gradient-to-br from-green-400 to-emerald-400",
      "bg-gradient-to-br from-orange-400 to-red-400",
      "bg-gradient-to-br from-indigo-400 to-purple-400",
      "bg-gradient-to-br from-teal-400 to-green-400",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
        <div className="relative">
          {/* Preview area - shows screenshot if available, otherwise placeholder */}
          {app.screenshot ? (
            <div
              className="h-48 rounded-t-lg overflow-hidden bg-gray-100"
              onClick={() => onOpen(app.id)}
            >
              <img
                src={app.screenshot}
                alt={`${app.name} preview`}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  // If image fails to load, hide it and show placeholder
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : (
            <div
              className={`h-48 rounded-t-lg ${getPlaceholderColor(app.name)} flex items-center justify-center`}
              onClick={() => onOpen(app.id)}
            >
              <div className="text-white text-center">
                <Code2 className="h-12 w-12 mx-auto mb-2 opacity-80" />
                <p className="text-lg font-semibold opacity-90">{app.name}</p>
              </div>
            </div>
          )}

          {/* Action buttons overlay */}
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/90 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(app.id);
              }}
            >
              <Play className="h-4 w-4" />
            </Button>
            {onCapture && (
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/90 hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onCapture(app.id);
                }}
                title="Capture preview"
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/90 hover:bg-white text-red-600 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{app.name}</CardTitle>
          <CardDescription className="text-sm">
            {app.description || "No description available"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(app.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
            {app.framework && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>{app.framework}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete App</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{app.name}"? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function AppGallery() {
  const { apps, loading, error, refreshApps } = useLoadApps();
  const [selectedAppId, setSelectedAppId] = useAtom(selectedAppIdAtom);
  const navigate = useNavigate();
  const { getStoredScreenshot, captureAndSaveScreenshot } = useAppScreenshot();
  const [appsWithScreenshots, setAppsWithScreenshots] = useState<any[]>([]);

  // Load screenshots from localStorage when apps change
  useEffect(() => {
    if (apps && apps.length > 0) {
      const appsWithScreens = apps.map((app) => ({
        ...app,
        screenshot: getStoredScreenshot(app.id),
      }));
      setAppsWithScreenshots(appsWithScreens);
    }
  }, [apps, getStoredScreenshot]);

  const handleOpenApp = (appId: number) => {
    setSelectedAppId(appId);
    navigate({ to: "/chat", search: {} });
  };

  const handleDeleteApp = async (appId: number) => {
    // Refresh the apps list after deletion
    await refreshApps();
  };

  const handleCapture = async (appId: number) => {
    const shot = await captureAndSaveScreenshot(appId);
    if (shot) {
      setAppsWithScreenshots((prev) =>
        prev.map((app) =>
          app.id === appId ? { ...app, screenshot: shot } : app,
        ),
      );
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
      <div className="text-center py-8">
        <p className="text-red-600">Error loading apps: {error}</p>
        <Button onClick={() => refreshApps()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="text-center py-12">
        <Code2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Apps Yet</h3>
        <p className="text-muted-foreground mb-4">
          Start building your first app to see it here
        </p>
        <Button onClick={() => navigate({ to: "/" })}>
          Create Your First App
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">App Gallery</h2>
        <p className="text-muted-foreground">
          All your created apps in one place. Click on any app to open it.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Note: Visual previews would require running each app. Currently
          showing placeholder designs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {(appsWithScreenshots.length > 0 ? appsWithScreenshots : apps).map(
          (app) => (
            <AppCard
              key={app.id}
              app={app}
              onDelete={handleDeleteApp}
              onOpen={handleOpenApp}
              onCapture={handleCapture}
            />
          ),
        )}
      </div>
    </div>
  );
}
