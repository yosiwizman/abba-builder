export class VersionControlService {
  autoSaveInterval = 5 * 60 * 1000; // 5 minutes
  maxVersions = 100;
  versions = new Map<number, { id: string; name: string; timestamp: number }[]>();
  private timers = new Map<number, any>();

  async startAutoSave(appId: number) {
    if (this.timers.has(appId)) return;
    const timer = setInterval(async () => {
      try {
        const content = await this.getCurrentContent(appId);
        const shouldSave = await (window as any).electron.invoke('langchain:analyze-changes', content);
        if (shouldSave) {
          await this.createVersion(appId, content);
        }
      } catch (e) {
        console.warn('Auto-save failed', e);
      }
    }, this.autoSaveInterval);
    this.timers.set(appId, timer);
  }

  async stopAutoSave(appId: number) {
    const t = this.timers.get(appId);
    if (t) {
      clearInterval(t);
      this.timers.delete(appId);
    }
  }

  async createCheckpoint(appId: number, name?: string) {
    const content = await this.getCurrentContent(appId);
    const res = await (window as any).electron.invoke('version:create-checkpoint', {
      appId,
      name: name || `Checkpoint ${new Date().toLocaleString()}`,
      content,
      timestamp: Date.now(),
    });
    return res;
  }

  async rollback(appId: number, versionId: string) {
    return await (window as any).electron.invoke('version:rollback', { appId, versionId });
  }

  async list(appId: number) {
    return await (window as any).electron.invoke('version:list', { appId });
  }

  // Aggregate current project content (lightweight)
  private async getCurrentContent(appId: number): Promise<string> {
    try {
      const app = await (window as any).electron.invoke('get-app', appId);
      const files: string[] = app?.files || [];
      const subset = files.slice(0, 50); // limit for performance
      const contents: string[] = [];
      for (const fp of subset) {
        try {
          const text = await (window as any).electron.invoke('read-app-file', { appId, filePath: fp });
          contents.push(`FILE:${fp}\n${String(text).slice(0, 4000)}`);
        } catch {}
      }
      return contents.join('\n\n');
    } catch {
      return '';
    }
  }

  private async createVersion(appId: number, _content: string) {
    // delegate to checkpoint (commit)
    return this.createCheckpoint(appId, 'Auto-save');
  }
}

