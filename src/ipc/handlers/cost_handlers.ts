import { ipcMain } from 'electron';
import CostProtectionService from '@/services/cost-protection-service';

export function registerCostHandlers() {
  const cps = new CostProtectionService();
  ipcMain.handle('costs:get-summary', async () => {
    try {
      return cps.getSummary();
    } catch (e) {
      return { spentToday: 0, dailyLimit: 10 };
    }
  });
}

