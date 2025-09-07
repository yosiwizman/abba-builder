import { ipcMain } from 'electron';
import { createClerkClient } from '@clerk/backend';

import LC2 from '../../services/langchain-orchestrator.js';
const LangChainOrchestrator = (LC2 as any).LangChainOrchestrator || (LC2 as any).default?.LangChainOrchestrator;

export function registerAuthHandlers() {
  let clerk: ReturnType<typeof createClerkClient> | null = null;

  ipcMain.handle('auth:setup', async (_event, config: { secretKey: string }) => {
    const orchestrator = new LangChainOrchestrator();
    await orchestrator.initialize();
    const authConfig = await orchestrator.manageAuthentication('setup-provider', config);

    // Initialize Clerk backend with secret key (main process only)
    if (config?.secretKey) {
      clerk = createClerkClient({ secretKey: config.secretKey });
    }
    return { success: true, config: authConfig };
  });

  ipcMain.handle('auth:validate-user', async (_event, userId: string) => {
    const orchestrator = new LangChainOrchestrator();
    await orchestrator.initialize();
    if (!clerk) {
      // Allow validation without Clerk instance by passing minimal data
      return await orchestrator.validateUser({ id: userId });
    }
    const user = await clerk.users.getUser(userId);
    const validation = await orchestrator.validateUser(user);
    return validation;
  });

  ipcMain.handle('auth:get-limits', async (_event, user: any) => {
    const orchestrator = new LangChainOrchestrator();
    await orchestrator.initialize();
    return await orchestrator.generateAPILimits(user || {});
  });

  // Mirror LangChain-specific channels for renderer convenience
  ipcMain.handle('langchain:setup-auth', async (_event, data: any) => {
    const orchestrator = new LangChainOrchestrator();
    await orchestrator.initialize();
    return await orchestrator.manageAuthentication('setup-provider', data);
  });

  ipcMain.handle('langchain:validate-user', async (_event, user: any) => {
    const orchestrator = new LangChainOrchestrator();
    await orchestrator.initialize();
    return await orchestrator.validateUser(user);
  });
}
