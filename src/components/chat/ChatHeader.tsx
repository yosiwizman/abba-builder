import {
  PanelRightOpen,
  History,
  PlusCircle,
  GitBranch,
  Info,
} from "lucide-react";
import { PanelRightClose } from "lucide-react";
import { useAtom, useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { useVersions } from "@/hooks/useVersions";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { IpcClient } from "@/ipc/ipc_client";
import { useRouter } from "@tanstack/react-router";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { useChats } from "@/hooks/useChats";
import { showError, showSuccess } from "@/lib/toast";
import { useEffect, useState } from "react";
import { useStreamChat } from "@/hooks/useStreamChat";
import { useCurrentBranch } from "@/hooks/useCurrentBranch";
import { useCheckoutVersion } from "@/hooks/useCheckoutVersion";
import { useRenameBranch } from "@/hooks/useRenameBranch";
import { isAnyCheckoutVersionInProgressAtom } from "@/store/appAtoms";
import { LoadingBar } from "../ui/LoadingBar";

interface ChatHeaderProps {
  isVersionPaneOpen: boolean;
  isPreviewOpen: boolean;
  onTogglePreview: () => void;
  onVersionClick: () => void;
}

export function ChatHeader({
  isVersionPaneOpen,
  isPreviewOpen,
  onTogglePreview,
  onVersionClick,
}: ChatHeaderProps) {
  const appId = useAtomValue(selectedAppIdAtom);
  const { versions, loading: versionsLoading } = useVersions(appId);
  const [isSaving, setIsSaving] = useState(false);
  const { navigate } = useRouter();
  const [selectedChatId, setSelectedChatId] = useAtom(selectedChatIdAtom);
  const { refreshChats } = useChats(appId);
  const { isStreaming } = useStreamChat();
  const isAnyCheckoutVersionInProgress = useAtomValue(
    isAnyCheckoutVersionInProgressAtom,
  );

  const {
    branchInfo,
    isLoading: branchInfoLoading,
    refetchBranchInfo,
  } = useCurrentBranch(appId);

  const { checkoutVersion, isCheckingOutVersion } = useCheckoutVersion();
  const { renameBranch, isRenamingBranch } = useRenameBranch();

  useEffect(() => {
    if (appId) {
      refetchBranchInfo();
    }
  }, [appId, selectedChatId, isStreaming, refetchBranchInfo]);

  const handleCheckoutMainBranch = async () => {
    if (!appId) return;
    await checkoutVersion({ appId, versionId: "main" });
  };

  const handleRenameMasterToMain = async () => {
    if (!appId) return;
    // If this throws, it will automatically show an error toast
    await renameBranch({ oldBranchName: "master", newBranchName: "main" });

    showSuccess("Master branch renamed to main");
  };

  const handleNewChat = async () => {
    if (appId) {
      try {
        const chatId = await IpcClient.getInstance().createChat(appId);
        setSelectedChatId(chatId);
        navigate({
          to: "/chat",
          search: { id: chatId },
        });
        await refreshChats();
      } catch (error) {
        showError(`Failed to create new chat: ${(error as any).toString()}`);
      }
    } else {
      navigate({ to: "/" });
    }
  };

  // REMINDER: KEEP UP TO DATE WITH app_handlers.ts
  const versionPostfix = versions.length === 100_000 ? `+` : "";

  const isNotMainBranch = branchInfo && branchInfo.branch !== "main";

  const currentBranchName = branchInfo?.branch;

  // Cost summary state (Phase 3)
  const [costSummary, setCostSummary] = useState<{ spentToday: number; dailyLimit: number } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const summary = await (window as any).electron.invoke('costs:get-summary');
        setCostSummary(summary);
      } catch {}
    })();
  }, []);

  return (
    <div className="flex flex-col w-full @container">
      <LoadingBar isVisible={isAnyCheckoutVersionInProgress} />
      {/* If the version pane is open, it's expected to not always be on the main branch. */}
      {isNotMainBranch && !isVersionPaneOpen && (
        <div className="flex flex-col @sm:flex-row items-center justify-between px-4 py-2 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2 text-sm">
            <GitBranch size={16} />
            <span>
              {currentBranchName === "<no-branch>" && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center  gap-1">
                          {isAnyCheckoutVersionInProgress ? (
                            <>
                              <span>
                                Please wait, switching back to latest version...
                              </span>
                            </>
                          ) : (
                            <>
                              <strong>Warning:</strong>
                              <span>You are not on a branch</span>
                              <Info size={14} />
                            </>
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {isAnyCheckoutVersionInProgress
                            ? "Version checkout is currently in progress"
                            : "Checkout main branch, otherwise changes will not be saved properly"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
              {currentBranchName && currentBranchName !== "<no-branch>" && (
                <span>
                  You are on branch: <strong>{currentBranchName}</strong>.
                </span>
              )}
              {branchInfoLoading && <span>Checking branch...</span>}
            </span>
          </div>
          {currentBranchName === "master" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRenameMasterToMain}
              disabled={isRenamingBranch || branchInfoLoading}
            >
              {isRenamingBranch ? "Renaming..." : "Rename master to main"}
            </Button>
          ) : isAnyCheckoutVersionInProgress && !isCheckingOutVersion ? null : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckoutMainBranch}
              disabled={isCheckingOutVersion || branchInfoLoading}
            >
              {isCheckingOutVersion
                ? "Checking out..."
                : "Switch to main branch"}
            </Button>
          )}
        </div>
      )}

      {/* Why is this pt-0.5? Because the loading bar is h-1 (it always takes space) and we want the vertical spacing to be consistent.*/}
      <div className="@container flex items-center justify-between pb-1.5 pt-0.5">
        <div className="flex items-center space-x-2">
          {/* Cost meter */}
          {costSummary && (
            <div className="flex items-center gap-2 pr-3 border-r">
              <span className="text-xs">${costSummary.spentToday.toFixed(2)} / ${costSummary.dailyLimit.toFixed(2)}</span>
              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded">
                <div className="h-1.5 bg-green-500 rounded" style={{ width: `${Math.min(100, (costSummary.spentToday / costSummary.dailyLimit) * 100)}%` }} />
              </div>
            </div>
          )}

          {/* Auto-save indicator */}
          <div
            className={`w-2 h-2 rounded-full ${isSaving ? 'bg-yellow-400' : 'bg-green-400'}`}
            title={isSaving ? 'Saving…' : 'Saved'}
          />

          <Button
            onClick={handleNewChat}
            variant="ghost"
            className="hidden @2xs:flex items-center justify-start gap-2 mx-2 py-3"
          >
            <PlusCircle size={16} />
            <span>New Chat</span>
          </Button>

          {/* Save checkpoint */}
          <Button
            variant="ghost"
            className="hidden @2xs:flex items-center gap-1 text-sm px-2 py-1"
            onClick={async () => {
              if (!appId) return;
              try {
                setIsSaving(true);
                await IpcClient.getInstance().invoke('version:create-checkpoint', { appId, name: 'Manual checkpoint' });
                showSuccess('Checkpoint created');
              } catch (e) {
                showError(e);
              } finally {
                setTimeout(() => setIsSaving(false), 800);
              }
            }}
          >
            <GitBranch size={16} />
            Save Checkpoint
          </Button>

          {/* Version history dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="hidden @6xs:flex cursor-pointer items-center gap-1 text-sm px-2 py-1 rounded-md"
              >
                <History size={16} />
                {versionsLoading ? '...' : `Version ${versions.length}${versionPostfix}`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[300px]">
              {(versions || []).slice(0, 10).map((v) => (
                <DropdownMenuItem
                  key={v.oid}
                  onClick={async () => {
                    if (!appId) return;
                    try {
                      await IpcClient.getInstance().revertVersion({ appId, previousVersionId: v.oid });
                      showSuccess(`Reverted to ${v.oid.slice(0,7)}`);
                    } catch (e) {
                      showError(e);
                    }
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-xs">{v.oid.slice(0,7)}</span>
                    <span className="text-xs opacity-80 truncate">{(v.message || '').split('\n')[0]}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button
          data-testid="toggle-preview-panel-button"
          onClick={onTogglePreview}
          className="cursor-pointer p-2 hover:bg-(--background-lightest) rounded-md"
        >
          {isPreviewOpen ? (
            <PanelRightClose size={20} />
          ) : (
            <PanelRightOpen size={20} />
          )}
        </button>
      </div>
    </div>
  );
}
