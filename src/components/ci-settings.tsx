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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Shield,
  Github,
  GitBranch,
} from "lucide-react";
// Removed useToast - not available

enum CIProviderType {
  GITHUB_ACTIONS = "github-actions",
  JENKINS = "jenkins",
  CIRCLECI = "circleci",
  GITLAB_CI = "gitlab-ci",
}

interface CIProvider {
  id: string;
  name: string;
  type: CIProviderType;
  isActive: boolean;
  isAuthenticated: boolean;
}

interface CICredentials {
  token?: string;
  username?: string;
  password?: string;
  baseUrl?: string;
  owner?: string;
  repo?: string;
}

export function CISettings() {
  const [providers, setProviders] = useState<CIProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<CIProviderType>(
    CIProviderType.GITHUB_ACTIONS,
  );
  const [credentials, setCredentials] = useState<CICredentials>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  // const { toast } = useToast();

  // Load existing providers on component mount
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const result = await window.electron.invoke("ci:get-providers");
      setProviders(result || []);

      // Set active provider if exists
      const activeProvider = result?.find((p: CIProvider) => p.isActive);
      if (activeProvider) {
        setSelectedProvider(activeProvider.type);
      }
    } catch (error) {
      console.error("Failed to load providers:", error);
    }
  };

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value as CIProviderType);
    setCredentials({});
    setTestResult(null);
  };

  const handleCredentialChange = (
    field: keyof CICredentials,
    value: string,
  ) => {
    setCredentials((prev) => ({ ...prev, [field]: value }));
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const config = {
        providerId: `${selectedProvider}-${Date.now()}`,
        type: selectedProvider,
        auth: {
          type: credentials.token ? "token" : "basic",
          token: credentials.token,
          username: credentials.username,
          password: credentials.password,
        },
        repository: credentials.baseUrl,
        owner: credentials.owner,
        repo: credentials.repo,
      };

      const result = await window.electron.invoke(
        "ci:configure-provider",
        config,
      );

      setTestResult({
        success: result.success,
        message: result.success
          ? "Connection successful! Provider authenticated."
          : result.error || "Connection failed. Please check your credentials.",
      });

      if (result.success) {
        await loadProviders();
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const saveConfiguration = async () => {
    if (!testResult?.success) {
      console.error(
        "Configuration Not Tested: Please test the connection before saving.",
      );
      alert("Please test the connection before saving.");
      return;
    }

    setIsLoading(true);

    try {
      const providerId = `${selectedProvider}-main`;

      // Configure the provider
      const config = {
        providerId,
        type: selectedProvider,
        auth: {
          type: credentials.token ? "token" : "basic",
          token: credentials.token,
          username: credentials.username,
          password: credentials.password,
        },
        repository: credentials.baseUrl,
        owner: credentials.owner,
        repo: credentials.repo,
      };

      await window.electron.invoke("ci:configure-provider", config);

      // Set as active provider
      await window.electron.invoke("ci:set-active-provider", providerId);

       console.log(
        "Configuration Saved: CI/CD provider has been configured successfully.",
      );
      alert("CI/CD provider has been configured successfully.");

      await loadProviders();

      // Clear sensitive data
      setCredentials({});
      setTestResult(null);
    } catch (error) {
      console.error("Save Failed:", error);
      alert(
        error instanceof Error ? error.message : "Failed to save configuration",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderIcon = (type: CIProviderType) => {
    switch (type) {
      case CIProviderType.GITHUB_ACTIONS:
        return <Github className="w-5 h-5" />;
      case CIProviderType.JENKINS:
        return <GitBranch className="w-5 h-5" />;
      default:
        return <GitBranch className="w-5 h-5" />;
    }
  };

  const renderCredentialFields = () => {
    switch (selectedProvider) {
      case CIProviderType.GITHUB_ACTIONS:
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="token">Personal Access Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={credentials.token || ""}
                onChange={(e) =>
                  handleCredentialChange("token", e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                Generate a token with 'repo' scope at{" "}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub Settings
                </a>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner">Repository Owner</Label>
                <Input
                  id="owner"
                  placeholder="username or org"
                  value={credentials.owner || ""}
                  onChange={(e) =>
                    handleCredentialChange("owner", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="repo">Repository Name</Label>
                <Input
                  id="repo"
                  placeholder="repository-name"
                  value={credentials.repo || ""}
                  onChange={(e) =>
                    handleCredentialChange("repo", e.target.value)
                  }
                />
              </div>
            </div>
          </>
        );

      case CIProviderType.JENKINS:
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Jenkins URL</Label>
              <Input
                id="baseUrl"
                placeholder="https://jenkins.example.com"
                value={credentials.baseUrl || ""}
                onChange={(e) =>
                  handleCredentialChange("baseUrl", e.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={credentials.username || ""}
                  onChange={(e) =>
                    handleCredentialChange("username", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">API Token</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password || ""}
                  onChange={(e) =>
                    handleCredentialChange("password", e.target.value)
                  }
                />
              </div>
            </div>
          </>
        );

      default:
        return (
          <Alert>
            <AlertDescription>
              Support for {selectedProvider} is coming soon!
            </AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          CI/CD Provider Configuration
        </CardTitle>
        <CardDescription>
          Configure your continuous integration and deployment provider
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="provider">CI/CD Provider</Label>
          <Select value={selectedProvider} onValueChange={handleProviderChange}>
            <SelectTrigger id="provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CIProviderType.GITHUB_ACTIONS}>
                <div className="flex items-center gap-2">
                  <Github className="w-4 h-4" />
                  GitHub Actions
                </div>
              </SelectItem>
              <SelectItem value={CIProviderType.JENKINS}>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Jenkins
                </div>
              </SelectItem>
              <SelectItem value={CIProviderType.CIRCLECI} disabled>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  CircleCI (Coming Soon)
                </div>
              </SelectItem>
              <SelectItem value={CIProviderType.GITLAB_CI} disabled>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  GitLab CI (Coming Soon)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Credential Fields */}
        <div className="space-y-4">{renderCredentialFields()}</div>

        {/* Test Result Alert */}
        {testResult && (
          <Alert
            className={
              testResult.success ? "border-green-500" : "border-red-500"
            }
          >
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <AlertDescription>{testResult.message}</AlertDescription>
            </div>
          </Alert>
        )}

        {/* Active Providers List */}
        {providers.length > 0 && (
          <div className="space-y-2">
            <Label>Configured Providers</Label>
            <div className="space-y-2">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-2 rounded border bg-card"
                >
                  <div className="flex items-center gap-2">
                    {getProviderIcon(provider.type)}
                    <span className="font-medium">{provider.name}</span>
                    {provider.isActive && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {provider.isAuthenticated ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={testConnection}
            disabled={
              isTesting || (!credentials.token && !credentials.username)
            }
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>

          <Button
            onClick={saveConfiguration}
            disabled={isLoading || !testResult?.success}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
