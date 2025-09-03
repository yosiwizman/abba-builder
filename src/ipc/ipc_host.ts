import { registerAppHandlers } from "./handlers/app_handlers";
import { registerChatHandlers } from "./handlers/chat_handlers";
import { registerChatStreamHandlers } from "./handlers/chat_stream_handlers";
import { registerSettingsHandlers } from "./handlers/settings_handlers";
import { registerShellHandlers } from "./handlers/shell_handler";
import { registerDependencyHandlers } from "./handlers/dependency_handlers";
import { registerGithubHandlers } from "./handlers/github_handlers";
import { registerVercelHandlers } from "./handlers/vercel_handlers";
import { registerNodeHandlers } from "./handlers/node_handlers";
import { registerProposalHandlers } from "./handlers/proposal_handlers";
import { registerDebugHandlers } from "./handlers/debug_handlers";
import { registerSupabaseHandlers } from "./handlers/supabase_handlers";
import { registerNeonHandlers } from "./handlers/neon_handlers";
import { registerLocalModelHandlers } from "./handlers/local_model_handlers";
import { registerTokenCountHandlers } from "./handlers/token_count_handlers";
import { registerWindowHandlers } from "./handlers/window_handlers";
import { registerUploadHandlers } from "./handlers/upload_handlers";
import { registerVersionHandlers } from "./handlers/version_handlers";
import { registerLanguageModelHandlers } from "./handlers/language_model_handlers";
import { registerReleaseNoteHandlers } from "./handlers/release_note_handlers";
import { registerImportHandlers } from "./handlers/import_handlers";
import { registerSessionHandlers } from "./handlers/session_handlers";
import { registerProHandlers } from "./handlers/pro_handlers";
import { registerContextPathsHandlers } from "./handlers/context_paths_handlers";
import { registerAppUpgradeHandlers } from "./handlers/app_upgrade_handlers";
import { registerCapacitorHandlers } from "./handlers/capacitor_handlers";
import { registerProblemsHandlers } from "./handlers/problems_handlers";
import { registerAppEnvVarsHandlers } from "./handlers/app_env_vars_handlers";
import { registerTemplateHandlers } from "./handlers/template_handlers";
import { registerPortalHandlers } from "./handlers/portal_handlers";
import { registerPromptHandlers } from "./handlers/prompt_handlers";
import { registerHelpBotHandlers } from "./handlers/help_bot_handlers";
import { registerGitHubLauncherHandlers } from "./handlers/github_launcher_handlers";
import { registerEnhancedHandlers } from "./handlers/enhanced_handlers";
import { registerKnowledgeHubHandlers } from "./handlers/knowledge_hub_handlers";
import { registerProjectLibraryHandlers } from "./handlers/project_library_handlers";
import { registerLibraryUpdaterHandlers } from "./handlers/library_updater_handlers";
import { registerBackgroundProcessingHandlers } from "./handlers/background_processing_handlers";
import { registerRendererLogHandlers } from "./handlers/renderer_log_handlers";
import { registerCIHandlers } from "./handlers/ci_handlers";
import { registerCIHandlersV2 } from "./handlers/ci_handlers_v2";
import { registerMessageStreamingHandlers } from "./handlers/message_streaming_handler";
import { registerBlockchainHandlers } from './handlers/blockchain_handlers';
import { registerAIContractHandlers } from './handlers/ai_contract_handlers';

export async function setupApiEndpoints(_userId?: string): Promise<void> {
  // Register all IPC handlers by category
  registerAppHandlers();
  registerChatHandlers();
  registerChatStreamHandlers();
  registerMessageStreamingHandlers();
  registerSettingsHandlers();
  registerShellHandlers();
  registerDependencyHandlers();
  registerGithubHandlers();
  registerVercelHandlers();
  registerNodeHandlers();
  registerProblemsHandlers();
  registerProposalHandlers();
  registerDebugHandlers();
  registerSupabaseHandlers();
  registerNeonHandlers();
  registerLocalModelHandlers();
  registerTokenCountHandlers();
  registerWindowHandlers();
  registerUploadHandlers();
  registerVersionHandlers();
  registerLanguageModelHandlers();
  registerReleaseNoteHandlers();
  registerImportHandlers();
  registerSessionHandlers();
  registerProHandlers();
  registerContextPathsHandlers();
  registerAppUpgradeHandlers();
  registerCapacitorHandlers();
  registerAppEnvVarsHandlers();
  registerTemplateHandlers();
  registerPortalHandlers();
  registerPromptHandlers();
  registerHelpBotHandlers();
  registerGitHubLauncherHandlers();
  registerEnhancedHandlers();
  await registerKnowledgeHubHandlers();
  registerProjectLibraryHandlers();
  registerLibraryUpdaterHandlers();
  registerBackgroundProcessingHandlers();
  registerBlockchainHandlers();
  registerAIContractHandlers();
  registerRendererLogHandlers();
  // Use V2 handlers if available, fallback to V1
  try {
    registerCIHandlersV2();
  } catch (error) {
    console.warn(
      "Failed to register V2 CI handlers, falling back to V1:",
      error,
    );
    registerCIHandlers();
  }
}
