import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Label } from "./ui/label";
import { Loader2, Github, Rocket, AlertCircle } from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";
import { toast } from "sonner";

interface LaunchResult {
  success: boolean;
  understanding?: string;
  customizations?: string;
  generatedProject?: any;
  setupInstructions?: any;
  error?: string;
  fallback?: string;
}

export function GitHubLauncher() {
  const [githubUrl, setGithubUrl] = useState("");
  const [customizations, setCustomizations] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<LaunchResult | null>(null);

  const handleAnalyze = async () => {
    if (!githubUrl.trim()) {
      toast.error("Please enter a GitHub URL");
      return;
    }

    // Validate GitHub URL format
    if (!githubUrl.includes("github.com/")) {
      toast.error("Please enter a valid GitHub URL");
      return;
    }

    setIsAnalyzing(true);
    setProgress("Starting analysis...");
    setResult(null);

    try {
      const ipcClient = IpcClient.getInstance();

      // Listen for progress updates
      const progressListener = (_event: any, data: any) => {
        setProgress(data.message || "Processing...");
      };

      // Add listener for progress updates
      (window as any).electronAPI?.on(
        "github:launcher:progress",
        progressListener,
      );

      // Analyze and launch the project
      const launchResult = await ipcClient.invoke("github:launcher:analyze", {
        githubUrl,
        customizations,
      });

      setResult(launchResult);

      if (launchResult.success) {
        toast.success("Project analyzed successfully!");
      } else {
        toast.error(launchResult.error || "Analysis failed");
      }

      // Remove progress listener
      (window as any).electronAPI?.removeListener(
        "github:launcher:progress",
        progressListener,
      );
    } catch (error) {
      console.error("GitHub launcher error:", error);
      toast.error("Failed to analyze project");
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsAnalyzing(false);
      setProgress("");
    }
  };

  const handleGenerateProject = async () => {
    if (!result || !result.understanding) {
      toast.error("Please analyze a project first");
      return;
    }

    setIsAnalyzing(true);
    setProgress("Generating customized project...");

    try {
      const ipcClient = IpcClient.getInstance();

      const generatedResult = await ipcClient.invoke(
        "github:launcher:generate",
        {
          understanding: result.understanding,
          customizations: result.customizations || "",
        },
      );

      setResult({
        ...result,
        generatedProject: generatedResult,
      });

      toast.success("Project generated successfully!");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Failed to generate project");
    } finally {
      setIsAnalyzing(false);
      setProgress("");
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Project Launcher
          </CardTitle>
          <CardDescription>
            Clone, analyze, and customize GitHub projects with AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="github-url">GitHub Repository URL</Label>
            <Input
              id="github-url"
              placeholder="https://github.com/owner/repository"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              disabled={isAnalyzing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customizations">Customizations (Optional)</Label>
            <Textarea
              id="customizations"
              placeholder="Describe how you want to customize the project..."
              value={customizations}
              onChange={(e) => setCustomizations(e.target.value)}
              disabled={isAnalyzing}
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !githubUrl.trim()}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Analyze & Launch
                </>
              )}
            </Button>

            {result?.understanding && (
              <Button
                onClick={handleGenerateProject}
                disabled={isAnalyzing}
                variant="secondary"
                className="flex items-center gap-2"
              >
                Generate Code
              </Button>
            )}
          </div>

          {progress && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              {progress}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.success ? (
              <>
                {result.understanding && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Project Understanding</h3>
                    <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                      {result.understanding.substring(0, 500)}...
                    </div>
                  </div>
                )}

                {result.setupInstructions && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Setup Instructions</h3>
                    <div className="text-sm bg-muted p-3 rounded-md">
                      <p>
                        Dependencies: {result.setupInstructions.dependencies}
                      </p>
                      <p>Run: {result.setupInstructions.runInstructions}</p>
                    </div>
                  </div>
                )}

                {result.generatedProject && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Generated Files</h3>
                    <div className="text-sm bg-muted p-3 rounded-md">
                      {result.generatedProject.files?.length > 0 ? (
                        <ul className="list-disc list-inside">
                          {result.generatedProject.files.map(
                            (file: any, idx: number) => (
                              <li key={idx}>{file.name}</li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p>Project code generated successfully</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-semibold">Error</span>
                </div>
                <p className="text-sm">{result.error}</p>
                {result.fallback && (
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">
                      {result.fallback}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
