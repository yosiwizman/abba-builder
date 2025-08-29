/**
 * Health Check API Endpoint
 * Provides system health data for the dashboard
 */

import { ipcMain } from 'electron';
import SystemDebugger from '../utils/system-debugger';

let cachedHealth: any = null;
let lastCheckTime = 0;
const CACHE_DURATION = 10000; // Cache for 10 seconds

export function setupHealthAPI() {
  // Register IPC handler for health checks
  ipcMain.handle('system:health-check', async () => {
    const now = Date.now();
    
    // Return cached result if still valid
    if (cachedHealth && (now - lastCheckTime) < CACHE_DURATION) {
      return cachedHealth;
    }
    
    try {
      const systemDebugger = new SystemDebugger();
      const result = await systemDebugger.runDiagnostics();
      
      cachedHealth = result;
      lastCheckTime = now;
      
      return result;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  });
  
  // Auto-fix endpoint
  ipcMain.handle('system:auto-fix', async () => {
    try {
      const systemDebugger = new SystemDebugger();
      const fixes = await systemDebugger.autoFix();
      
      // Clear cache after fixes
      cachedHealth = null;
      
      return { success: true, fixes };
    } catch (error) {
      console.error('Auto-fix failed:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get specific health metric
  ipcMain.handle('system:metric', async (_event, metricName: string) => {
    try {
      const systemDebugger = new SystemDebugger();
      const result = await systemDebugger.runDiagnostics();
      
      const metric = result.checks.find((check: any) => 
        check.name.toLowerCase().includes(metricName.toLowerCase())
      );
      
      return metric || null;
    } catch (error) {
      console.error('Metric fetch failed:', error);
      return null;
    }
  });
}

// Export for use in renderer process
export const healthAPI = {
  checkHealth: () => (window as any).electronAPI?.invoke('system:health-check'),
  autoFix: () => (window as any).electronAPI?.invoke('system:auto-fix'),
  getMetric: (name: string) => (window as any).electronAPI?.invoke('system:metric', name),
};
