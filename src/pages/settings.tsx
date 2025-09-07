import { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { ProviderSettingsGrid } from "@/components/ProviderSettings";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { IpcClient } from "@/ipc/ipc_client";
import { showSuccess, showError } from "@/lib/toast";
import { AutoApproveSwitch } from "@/components/AutoApproveSwitch";
import { TelemetrySwitch } from "@/components/TelemetrySwitch";
import { MaxChatTurnsSelector } from "@/components/MaxChatTurnsSelector";
import { ThinkingBudgetSelector } from "@/components/ThinkingBudgetSelector";
import { useSettings } from "@/hooks/useSettings";
import { useAppVersion } from "@/hooks/useAppVersion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { GitHubIntegration } from "@/components/GitHubIntegration";
import { VercelIntegration } from "@/components/VercelIntegration";
import { SupabaseIntegration } from "@/components/SupabaseIntegration";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AutoFixProblemsSwitch } from "@/components/AutoFixProblemsSwitch";
import { AutoUpdateSwitch } from "@/components/AutoUpdateSwitch";
import { ReleaseChannelSelector } from "@/components/ReleaseChannelSelector";
import { NeonIntegration } from "@/components/NeonIntegration";
import { RuntimeModeSelector } from "@/components/RuntimeModeSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { useAtomValue } from "jotai";

export default function SettingsPage() {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const appVersion = useAppVersion();
  const { settings, updateSettings } = useSettings();
  const router = useRouter();

  const handleResetEverything = async () => {
    setIsResetting(true);
    try {
      const ipcClient = IpcClient.getInstance();
      await ipcClient.resetAll();
      showSuccess("Successfully reset everything. Restart the application.");
    } catch (error) {
      console.error("Error resetting:", error);
      showError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    } finally {
      setIsResetting(false);
      setIsResetDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen px-8 py-4">
      <div className="max-w-5xl mx-auto">
        <Button
          onClick={() => router.history.back()}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 mb-4 bg-(--background-lightest) py-5"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
        <div className="flex justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
        </div>

        <div className="space-y-6">
          <GeneralSettings appVersion={appVersion} />
          <WorkflowSettings />
          <AISettings />

          {/* Backup Settings */}
          <BackupSettings />

          <div
            id="provider-settings"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm"
          >
            <ProviderSettingsGrid />
          </div>

          <div className="space-y-6">
            <div
              id="telemetry"
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
            >
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Telemetry
              </h2>
              <div className="space-y-2">
                <TelemetrySwitch />
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  This records anonymous usage data to improve the product.
                </div>
              </div>

              <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span className="mr-2 font-medium">Telemetry ID:</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200 font-mono">
                  {settings ? settings.telemetryUserId : "n/a"}
                </span>
              </div>
            </div>
          </div>

          {/* Integrations Section */}
          <div
            id="integrations"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Integrations
            </h2>
            <div className="space-y-4">
              <GitHubIntegration />
              <VercelIntegration />
              <SupabaseIntegration />
              <NeonIntegration />
            </div>
          </div>

          {/* Experiments Section */}
          <div
            id="experiments"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Experiments
            </h2>
            <div className="space-y-4">
              <div className="space-y-1 mt-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-native-git"
                    checked={!!settings?.enableNativeGit}
                    onCheckedChange={(checked) => {
                      updateSettings({
                        enableNativeGit: checked,
                      });
                    }}
                  />
                  <Label htmlFor="enable-native-git">Enable Native Git</Label>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Native Git offers faster performance but requires{" "}
                  <a
                    onClick={() => {
                      IpcClient.getInstance().openExternalUrl(
                        "https://git-scm.com/downloads",
                      );
                    }}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    installing Git
                  </a>
                  .
                </div>
              </div>
            </div>
          </div>

          {/* API Key Helper Links */}
          <div
            id="token-helpers"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              API Key Helper Links
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label>GitHub Token</label>
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  className="text-sm text-blue-500"
                >
                  Get GitHub Token →
                </a>
              </div>

              <div className="space-y-2">
                <label>OpenAI API Key</label>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  className="text-sm text-blue-500"
                >
                  Get OpenAI Key →
                </a>
              </div>

              <div className="space-y-2">
                <label>Anthropic API Key</label>
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  className="text-sm text-blue-500"
                >
                  Get Anthropic Key →
                </a>
              </div>

              <div className="space-y-2">
                <label>Google API Key</label>
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  className="text-sm text-blue-500"
                >
                  Get Google AI Key →
                </a>
              </div>

              <div className="space-y-2">
                <label>Clerk Publishable Key</label>
                <a
                  href="https://dashboard.clerk.com/apps/new"
                  target="_blank"
                  className="text-sm text-blue-500"
                >
                  Get Clerk Keys →
                </a>
              </div>

              <div className="space-y-2">
                <label>SerpAPI Key</label>
                <a
                  href="https://serpapi.com/manage-api-key"
                  target="_blank"
                  className="text-sm text-blue-500"
                >
                  Get SerpAPI Key →
                </a>
              </div>

              <div className="space-y-2">
                <label>Vercel Token</label>
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  className="text-sm text-blue-500"
                >
                  Get Vercel Token →
                </a>
              </div>

              <div className="space-y-2">
                <label>Stripe Secret Key</label>
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  target="_blank"
                  className="text-sm text-blue-500"
                >
                  Get Stripe Keys →
                </a>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div
            id="danger-zone"
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-red-200 dark:border-red-800"
          >
            <h2 className="text-lg font-medium text-red-600 dark:text-red-400 mb-4">
              Danger Zone
            </h2>

            <div className="space-y-4">
              <div className="flex items-start justify-between flex-col sm:flex-row sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Reset Everything
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This will delete all your apps, chats, and settings. This
                    action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => setIsResetDialogOpen(true)}
                  disabled={isResetting}
                  className="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? "Resetting..." : "Reset Everything"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isResetDialogOpen}
        title="Reset Everything"
        message="Are you sure you want to reset everything? This will delete all your apps, chats, and settings. This action cannot be undone."
        confirmText="Reset Everything"
        cancelText="Cancel"
        onConfirm={handleResetEverything}
        onCancel={() => setIsResetDialogOpen(false)}
      />
    </div>
  );
}

export function GeneralSettings({ appVersion }: { appVersion: string | null }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      id="general-settings"
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
    >
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        General Settings
      </h2>

      <div className="space-y-4 mb-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Theme
          </label>

          <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
            {(["system", "light", "dark"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setTheme(option)}
                className={`
                px-4 py-1.5 text-sm font-medium rounded-md
                transition-all duration-200
                ${
                  theme === option
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }
              `}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1 mt-4">
        <AutoUpdateSwitch />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          This will automatically update the app when new versions are
          available.
        </div>
      </div>

      <div className="mt-4">
        <ReleaseChannelSelector />
      </div>

      <div className="mt-4">
        <RuntimeModeSelector />
      </div>

      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        <span className="mr-2 font-medium">App Version:</span>
        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200 font-mono">
          {appVersion ? appVersion : "-"}
        </span>
      </div>
    </div>
  );
}

export function WorkflowSettings() {
  return (
    <div
      id="workflow-settings"
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
    >
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Workflow Settings
      </h2>

      <div className="space-y-1">
        <AutoApproveSwitch showToast={false} />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          This will automatically approve code changes and run them.
        </div>
      </div>

      <div className="space-y-1 mt-4">
        <AutoFixProblemsSwitch />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          This will automatically fix TypeScript errors.
        </div>
      </div>
    </div>
  );
}
function BackupSettings() {
  const appId = useAtomValue(selectedAppIdAtom);
  const [frequency, setFrequency] = useState<string>("1hour");
  const [location, setLocation] = useState<string>("local");

  const backupNow = async () => {
    if (!appId) return;
    try {
      await IpcClient.getInstance().invoke("backup:create", appId);
      showSuccess("Backup created successfully");
    } catch (e) {
      showError(e);
    }
  };

  const exportZip = async () => {
    if (!appId) return;
    try {
      const res = await IpcClient.getInstance().invoke("backup:export-zip", appId);
      showSuccess(`ZIP exported: ${res?.path}`);
    } catch (e) {
      showError(e);
    }
  };

  return (
    <div id="backup-settings" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Backup Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm">Backup Frequency</label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5min">Every 5 minutes</SelectItem>
              <SelectItem value="1hour">Every hour</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm">Backup Location</label>
          <Select value={location} onValueChange={(v) => setLocation(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local only</SelectItem>
              <SelectItem value="gdrive">Google Drive</SelectItem>
              <SelectItem value="dropbox">Dropbox</SelectItem>
              <SelectItem value="s3">Amazon S3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={backupNow}>Backup Now</Button>
        <Button variant="outline" onClick={exportZip}>Export as ZIP</Button>
      </div>
    </div>
  );
}

export function AISettings() {
  const { settings, updateSettings, refreshSettings } = useSettings();

  const modelOptions = [
    { label: 'Auto', value: 'auto:auto' },
    { label: 'OpenAI: GPT-4 Turbo', value: 'openai:gpt-4-turbo-preview' },
    { label: 'OpenAI: GPT-3.5 Turbo', value: 'openai:gpt-3.5-turbo' },
    { label: 'Anthropic: Claude 3 Opus', value: 'anthropic:claude-3-opus-20240229' },
    { label: 'Anthropic: Claude 3 Haiku', value: 'anthropic:claude-3-haiku-20240307' },
    { label: 'Google: Gemini Pro', value: 'google:gemini-pro' },
    { label: 'Ollama: llama2', value: 'ollama:llama2' },
  ];

  const getValue = (task: 'code' | 'analysis' | 'quick') => {
    const pref = settings?.preferredModelsByTask?.[task];
    if (pref?.provider && pref?.name) return `${pref.provider}:${pref.name}`;
    const sel = settings?.selectedModel;
    return sel ? `${sel.provider}:${sel.name}` : 'auto:auto';
  };

  const handleModelChange = async (task: 'code' | 'analysis' | 'quick', value: string) => {
    try {
      console.log('Changing model for', task, 'to', value);
      const [provider, name] = value.split(':');
      const updated = {
        preferredModelsByTask: {
          ...settings?.preferredModelsByTask,
          [task]: { provider, name },
        },
        selectedModel: { provider, name },
      } as any;
      console.log('Current model settings:', settings?.preferredModelsByTask);
      console.log('Updating to:', { task, provider, name });
      console.log('Updating settings:', updated);
      await updateSettings(updated);
      await refreshSettings();
      console.log('Settings after save:', await window.electron.invoke('get-user-settings'));
    } catch (e) {
      console.error('Failed to change model:', e);
    }
  };

  return (
    <div
      id="ai-settings"
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
    >
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        AI Settings
      </h2>

      <div className="mt-4">
        <ThinkingBudgetSelector />
      </div>

      <div className="mt-4">
        <MaxChatTurnsSelector />
      </div>

      {/* Simple Model Selector (temporary sprint fix) */}
      <div className="mt-6">
        <h3 className="text-md font-medium mb-3">Model</h3>
        <select
          defaultValue={settings?.selectedModel ? `${settings.selectedModel.provider}:${settings.selectedModel.name}` : 'openai:gpt-3.5-turbo'}
          onChange={(e) => {
            console.log('CHANGING all to', e.target.value);
            const [provider, model] = e.target.value.split(':');
            const newSettings = {
              ...settings,
              selectedModel: { provider, name: model },
            } as any;
            ;(window as any).electron.invoke('set-user-settings', newSettings).then(() => {
              console.log('SAVED!');
              window.location.reload();
            });
          }}
          className="w-full p-2 border rounded"
        >
          <option value="openai:gpt-4">GPT-4</option>
          <option value="openai:gpt-3.5-turbo">GPT-3.5</option>
          <option value="anthropic:claude-3-opus">Claude Opus</option>
          <option value="anthropic:claude-3-haiku">Claude Haiku</option>
        </select>
      </div>

      {/* Consensus and Prompt Enhancement */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Switch
              id="use-multi-model-consensus"
              checked={!!settings?.useMultiModelConsensus}
              onCheckedChange={(checked) => updateSettings({ useMultiModelConsensus: checked })}
            />
            <Label htmlFor="use-multi-model-consensus">Use multiple models for consensus</Label>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Aggregate outputs from multiple models for more reliable results.
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-enhance-prompts"
              checked={settings?.autoEnhancePrompts !== false}
              onCheckedChange={(checked) => updateSettings({ autoEnhancePrompts: checked })}
            />
            <Label htmlFor="auto-enhance-prompts">Auto-enhance my prompts</Label>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Improve simple requests into detailed prompts automatically.
          </div>
        </div>
      </div>
    </div>
  );
}
