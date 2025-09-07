import { ipcMain } from 'electron';
import LC from '../../services/langchain-orchestrator.js';
const LangChainOrchestrator = (LC as any).LangChainOrchestrator || (LC as any).default?.LangChainOrchestrator;

export function registerSearchHandlers() {
  ipcMain.handle('langchain:search-github', async (_event, query: string) => {
    const orchestrator = new LangChainOrchestrator();
    await orchestrator.initialize();
    return await orchestrator.searchGitHub(query);
  });

  ipcMain.handle('langchain:search-npm', async (_event, query: string) => {
    const orchestrator = new LangChainOrchestrator();
    await orchestrator.initialize();
    return await orchestrator.searchNPM(query);
  });

  ipcMain.handle('langchain:search-web', async (_event, query: string) => {
    const orchestrator = new LangChainOrchestrator();
    await orchestrator.initialize();
    return await orchestrator.searchWeb(query);
  });

  ipcMain.handle(
    'langchain:search-and-build',
    async (_event, { description }: { description: string }) => {
      const orchestrator = new LangChainOrchestrator();
      await orchestrator.initialize();
      const searchResults = await orchestrator.searchAndUse(
        `Find best open source libraries for: ${description}`,
      );
      return await orchestrator.generateFromPrompt(
        `Build app using these libraries: ${JSON.stringify(searchResults)}`,
      );
    },
  );

  ipcMain.handle('langchain:enhance-prompt', async (_event, prompt: string) => {
    const orchestrator = new LangChainOrchestrator();
    await orchestrator.initialize();
    const understood = await orchestrator.enhancePrompt(prompt);
    return {
      original: prompt,
      understood,
      confidence: 0.9,
    };
  });

  ipcMain.handle('langchain:analyze-changes', async (_event, content: string) => {
    const orchestrator = new LangChainOrchestrator();
    await orchestrator.initialize();
    if (typeof orchestrator.analyzeChanges === 'function') {
      return await orchestrator.analyzeChanges(content);
    }
    // Fallback heuristic: save when content is non-empty
    return !!content && content.length > 0;
  });
}

