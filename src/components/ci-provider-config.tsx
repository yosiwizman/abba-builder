import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Github,
  Key,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  RefreshCw
} from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";

interface CIProviderConfigProps {
  open: boolean;
  onClose: () => void;
  onConfigured?: () => void;
}

interface ConfiguredProvider {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  isAuthenticated: boolean;
}

export function CIProviderConfig({ open, onClose, onConfigured }: CIProviderConfigProps) {
  const [providers, setProviders] = useState<ConfiguredProvider[]>([]);
  const [activeTab, setActiveTab] = useState("configure");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [providerId, setProviderId] = useState("");
  const [providerType, setProviderType] = useState("github-actions");
  const [authType, setAuthType] = useState("token");
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const ipcClient = IpcClient.getInstance();

  useEffect(() => {
    if (open) {
      loadProviders();
    }
  }, [open]);

  const loadProviders = async () => {
    try {
      const result = await ipcClient.invoke("ci:get-providers");
      setProviders(result || []);
    } catch (err) {
      console.error("Failed to load providers:", err);
    }
  };

  const handleConfigure = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const config = {
        providerId: providerId || `${providerType}-${Date.now()}`,
        type: providerType,
        auth: {
          type: authType as 'token' | 'oauth' | 'basic',
          token: authType === 'token' ? token : undefined,
          username: authType === 'basic' ? username : undefined,
          password: authType === 'basic' ? password : undefined,
        },
        owner,
        repo,
        repository: providerType === 'github-actions' ? `github.com/${owner}/${repo}` : undefined
      };

      const result = await ipcClient.invoke("ci:configure-provider", config);

      if (result.success) {
        setSuccess("Provider configured successfully!");
        setProviderId("");
        setToken("");
        setOwner("");
        setRepo("");
        setUsername("");
        setPassword("");
        await loadProviders();
        
        if (onConfigured) {
          onConfigured();
        }
        
        setTimeout(() => {
          setActiveTab("manage");
          setSuccess(null);
        }, 2000);
      } else {
        setError(result.error || "Failed to configure provider");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Configuration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const result = await ipcClient.invoke("ci:set-active-provider", id);
      if (result.success) {
        await loadProviders();
        setSuccess(`Provider ${id} is now active`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Failed to set active provider");
    }
  };

  const handleRemoveProvider = async (id: string) => {
    // Note: This would need to be implemented in the backend
    setError("Remove provider not yet implemented");
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test the configuration without saving
      const config = {
        providerId: 'test-' + Date.now(),
        type: providerType,
        auth: {
          type: authType as 'token' | 'oauth' | 'basic',
          token: authType === 'token' ? token : undefined,
          username: authType === 'basic' ? username : undefined,
          password: authType === 'basic' ? password : undefined,
        },
        owner,
        repo,
        repository: providerType === 'github-actions' ? `github.com/${owner}/${repo}` : undefined
      };

      const result = await ipcClient.invoke("ci:configure-provider", config);
      
      if (result.success) {
        setSuccess("Connection test successful!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Connection test failed");
      }
    } catch (err) {
      setError("Connection test failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            CI/CD Provider Configuration
          </DialogTitle>
          <DialogDescription>
            Configure your CI/CD providers to enable real-time build and deployment tracking
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="configure">Configure New</TabsTrigger>
            <TabsTrigger value="manage">Manage Providers</TabsTrigger>
          </TabsList>

          <TabsContent value="configure" className="space-y-4">
            {/* Provider Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="provider-type">Provider Type</Label>
              <Select value={providerType} onValueChange={setProviderType}>
                <SelectTrigger id="provider-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="github-actions">
                    <div className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      GitHub Actions
                    </div>
                  </SelectItem>
                  <SelectItem value="jenkins" disabled>
                    Jenkins (Coming Soon)
                  </SelectItem>
                  <SelectItem value="circleci" disabled>
                    CircleCI (Coming Soon)
                  </SelectItem>
                  <SelectItem value="gitlab-ci" disabled>
                    GitLab CI (Coming Soon)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Provider ID */}
            <div className="space-y-2">
              <Label htmlFor="provider-id">Provider ID (Optional)</Label>
              <Input
                id="provider-id"
                placeholder="e.g., my-github-project"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
              />
            </div>

            {/* GitHub-specific fields */}
            {providerType === "github-actions" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="owner">Repository Owner</Label>
                    <Input
                      id="owner"
                      placeholder="e.g., octocat"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repo">Repository Name</Label>
                    <Input
                      id="repo"
                      placeholder="e.g., hello-world"
                      value={repo}
                      onChange={(e) => setRepo(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Authentication */}
            <div className="space-y-2">
              <Label htmlFor="auth-type">Authentication Type</Label>
              <Select value={authType} onValueChange={setAuthType}>
                <SelectTrigger id="auth-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="token">Personal Access Token</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                  <SelectItem value="oauth" disabled>
                    OAuth (Coming Soon)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {authType === "token" && (
              <div className="space-y-2">
                <Label htmlFor="token">
                  <Key className="h-4 w-4 inline mr-2" />
                  Personal Access Token
                </Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  For GitHub, create a token with 'repo' and 'workflow' scopes
                </p>
              </div>
            )}

            {authType === "basic" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Status Messages */}
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  {success}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            {providers.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    No providers configured yet. Configure one in the "Configure New" tab.
                  </div>
                </CardContent>
              </Card>
            ) : (
              providers.map((provider) => (
                <Card key={provider.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {provider.type === "github-actions" && <Github className="h-4 w-4" />}
                        {provider.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {provider.isActive && (
                          <Badge variant="default">Active</Badge>
                        )}
                        {provider.isAuthenticated ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600">
                            <XCircle className="h-3 w-3 mr-1" />
                            Disconnected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        ID: {provider.id}
                      </div>
                      <div className="flex gap-2">
                        {!provider.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetActive(provider.id)}
                          >
                            Set Active
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveProvider(provider.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {activeTab === "configure" && (
            <>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={loading || !token || (providerType === "github-actions" && (!owner || !repo))}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
              <Button
                onClick={handleConfigure}
                disabled={loading || !token || (providerType === "github-actions" && (!owner || !repo))}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Configure Provider
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
