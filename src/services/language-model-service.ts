import { DEFAULT_PROVIDERS } from '@/data/default-providers';
import { getLanguageModelProviders, getLanguageModelsByProviders, getLanguageModels } from '@/ipc/shared/language_model_helpers';
import type { LanguageModelProvider, LanguageModel } from '@/ipc/ipc_types';

export class LanguageModelService {
  async getProviders(): Promise<LanguageModelProvider[]> {
    try {
      const providers = await getLanguageModelProviders();
      return providers || [];
    } catch (err) {
      console.error('[LanguageModelService] Error loading providers:', err);
      // Convert DEFAULT_PROVIDERS to the provider shape as a minimal fallback
      return (DEFAULT_PROVIDERS || []).map((p) => ({
        id: p.id,
        name: p.name,
        type: 'cloud',
      })) as LanguageModelProvider[];
    }
  }

  async getModelsByProviders(): Promise<Record<string, LanguageModel[]>> {
    try {
      const byProvider = await getLanguageModelsByProviders();
      return byProvider || {};
    } catch (err) {
      console.error('[LanguageModelService] Error loading models by providers:', err);
      return {};
    }
  }

  async getModels(providerId: string): Promise<LanguageModel[]> {
    try {
      const models = await getLanguageModels({ providerId });
      return models || [];
    } catch (err) {
      console.error(`[LanguageModelService] Error loading models for provider ${providerId}:`, err);
      return [];
    }
  }

  async getSelectedModel(): Promise<any> {
    // Placeholder for future persistence; return a safe default
    return {
      id: 'default',
      name: 'No Model',
      provider: { name: 'None', id: 'none' },
    };
  }
}

export default new LanguageModelService();
