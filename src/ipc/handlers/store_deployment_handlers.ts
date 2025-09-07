import { ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function registerStoreDeploymentHandlers() {
  ipcMain.handle('store:deploy-ios', async (_event, { appId, version }: { appId?: number; version?: string }) => {
    // Use LangChain to propose a strategy (best effort)
    try {
      const { LangChainOrchestrator } = require('../../services/langchain-orchestrator');
      const orchestrator = new LangChainOrchestrator();
      await orchestrator.initialize();
      const model = orchestrator.selectBestModel('mobile-build');
      if (model && typeof model.invoke === 'function') {
        await model.invoke(`Create iOS deployment strategy for version ${version || 'latest'}`);
      }
    } catch {}
    try {
      const { stdout } = await execAsync('npm run deploy:ios');
      return { success: true, output: stdout };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('store:deploy-android', async (_event, { appId, version }: { appId?: number; version?: string }) => {
    try {
      const { LangChainOrchestrator } = require('../../services/langchain-orchestrator');
      const orchestrator = new LangChainOrchestrator();
      await orchestrator.initialize();
      const model = orchestrator.selectBestModel('mobile-build');
      if (model && typeof model.invoke === 'function') {
        await model.invoke(`Create Android deployment strategy for version ${version || 'latest'}`);
      }
    } catch {}
    try {
      const { stdout } = await execAsync('npm run deploy:android');
      return { success: true, output: stdout };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('store:deploy-all', async () => {
    const ios = await execAsync('npm run deploy:ios').then(r => r.stdout).catch(e => ({ error: e?.message || String(e) }));
    const android = await execAsync('npm run deploy:android').then(r => r.stdout).catch(e => ({ error: e?.message || String(e) }));
    return { ios, android };
  });
}
