// Type definitions for the Electron preload script API
// This extends the Window interface to include the electron object exposed by preload.ts

export interface IElectronAPI {
  ipcRenderer: {
    invoke(channel: string, ...args: any[]): Promise<any>;
    on(channel: string, listener: (...args: any[]) => void): () => void;
    removeAllListeners(channel: string): void;
    removeListener(channel: string, listener: (...args: any[]) => void): void;
  };
  // Top-level convenience methods mirrored by preload for compatibility
  invoke(channel: string, ...args: any[]): Promise<any>;
  on(channel: string, listener: (...args: any[]) => void): () => void;
  removeAllListeners(channel: string): void;
  removeListener(channel: string, listener: (...args: any[]) => void): void;
  // Send-only channels (preload allow-listed)
  send(channel: string, ...args: any[]): void;
}

declare global {
  interface Window {
    electron: IElectronAPI;
    electronAPI?: IElectronAPI; // Legacy alias used by some components
    api?: any; // Legacy API support for components still using window.api
  }
}


