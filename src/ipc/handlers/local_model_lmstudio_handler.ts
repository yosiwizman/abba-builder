import { ipcMain } from "electron";
import log from "electron-log";
import type { LocalModelListResponse, LocalModel } from "../ipc_types";
import { LM_STUDIO_BASE_URL } from "../utils/lm_studio_utils";

const logger = log.scope("lmstudio_handler");

export interface LMStudioModel {
  type: "llm" | "embedding" | string;
  id: string;
  object: string;
  publisher: string;
  state: "loaded" | "not-loaded";
  max_context_length: number;
  quantization: string;
  compatibility_type: string;
  arch: string;
  [key: string]: any;
}

export async function fetchLMStudioModels(): Promise<LocalModelListResponse> {
  try {
    const modelsResponse: Response = await fetch(
      `${LM_STUDIO_BASE_URL}/api/v0/models`,
    );
    if (!modelsResponse.ok) {
      logger.warn("LM Studio responded non-OK, returning empty model list");
      return { models: [] };
    }
    const modelsJson = await modelsResponse.json();
    const downloadedModels = modelsJson.data as LMStudioModel[];
    const models: LocalModel[] = downloadedModels
      .filter((model: any) => model.type === "llm")
      .map((model: any) => ({
        modelName: model.id,
        displayName: model.id,
        provider: "lmstudio",
      }));

    logger.info(`Successfully fetched ${models.length} models from LM Studio`);
    return { models };
  } catch (error) {
    // Silent fail to avoid noisy console when LM Studio is not running
    logger.debug("LM Studio fetch failed (likely not running)", error);
    return { models: [] };
  }
}

export function registerLMStudioHandlers() {
  ipcMain.handle(
    "local-models:list-lmstudio",
    async (): Promise<LocalModelListResponse> => {
      return fetchLMStudioModels();
    },
  );
}
