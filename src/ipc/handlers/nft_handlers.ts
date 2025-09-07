import { ipcMain, app } from "electron";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

export function registerNFTHandlers() {
  ipcMain.handle(
    "nft:upload-image",
    async (_event, imageData: string): Promise<{
      success: boolean;
      path?: string;
      url?: string;
      error?: string;
    }> => {
      try {
        const uploadsDir = join(app.getPath("userData"), "nft-uploads");
        await mkdir(uploadsDir, { recursive: true });

        const fileName = `nft-${Date.now()}.png`;
        const filePath = join(uploadsDir, fileName);

        // Handle base64 image data
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        await writeFile(filePath, buffer);

        return { success: true, path: filePath, url: `file://${filePath}` };
      } catch (error: any) {
        return { success: false, error: error?.message || String(error) };
      }
    },
  );

  ipcMain.handle(
    "nft:get-stats",
    async () => {
      // TODO: Replace with real aggregation from DB or chain indexer
      return {
        totalVolume: 0,
        averagePrice: 0,
        totalSales: 0,
        totalCreators: 0,
      };
    },
  );

  ipcMain.handle(
    "nft:generate-contract",
    async (_event, specs: any): Promise<{
      success: boolean;
      code?: string;
      error?: string;
    }> => {
      try {
        const { LangChainOrchestrator } = require("../../services/langchain-orchestrator");
        const orchestrator = new LangChainOrchestrator();
        let result: any;
        if (typeof orchestrator.generateSmartContract === "function") {
          result = await orchestrator.generateSmartContract(specs);
        } else {
          result = await orchestrator.generateFromPrompt(
            `Generate a smart contract with specs: ${JSON.stringify(specs)}`,
          );
        }
        const code = result?.code || result?.output || JSON.stringify(result);
        return { success: true, code };
      } catch (error: any) {
        return { success: false, error: error?.message || String(error) };
      }
    },
  );

  ipcMain.handle("nft:list", async () => {
    // Return empty real list (no mock)
    return [];
  });

  ipcMain.handle("nft:list-collections", async () => {
    return [];
  });
}
