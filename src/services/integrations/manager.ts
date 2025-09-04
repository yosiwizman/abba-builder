import { IntegrationProvider, ConnectionResult, IntegrationStatus } from './types';
import { GitHubIntegration } from './github';
import { VercelIntegration } from './vercel';
import { SupabaseIntegration } from './supabase';

export class IntegrationManager {
  private providers: Map<string, IntegrationProvider> = new Map();
  private static instance: IntegrationManager;

  private constructor() {
    // Initialize all providers
    this.registerProvider(new GitHubIntegration());
    this.registerProvider(new VercelIntegration());
    this.registerProvider(new SupabaseIntegration());
    // Add more providers as they are implemented
  }

  static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  private registerProvider(provider: IntegrationProvider) {
    this.providers.set(provider.id, provider);
  }

  async connect(providerId: string, config: Record<string, any>): Promise<ConnectionResult> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return {
        success: false,
        error: `Unknown provider: ${providerId}`,
      };
    }

    return provider.connect(config);
  }

  async disconnect(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (provider) {
      await provider.disconnect();
    }
  }

  async getStatus(providerId: string): Promise<IntegrationStatus> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return {
        connected: false,
        error: `Unknown provider: ${providerId}`,
      };
    }

    return provider.getStatus();
  }

  async getAllStatuses(): Promise<Record<string, 'connected' | 'disconnected' | 'error'>> {
    const statuses: Record<string, 'connected' | 'disconnected' | 'error'> = {};
    
    for (const [id, provider] of this.providers) {
      try {
        const status = await provider.getStatus();
        statuses[id] = status.connected ? 'connected' : 
                       status.error ? 'error' : 'disconnected';
      } catch {
        statuses[id] = 'disconnected';
      }
    }

    return statuses;
  }

  getProvider(providerId: string): IntegrationProvider | undefined {
    return this.providers.get(providerId);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
