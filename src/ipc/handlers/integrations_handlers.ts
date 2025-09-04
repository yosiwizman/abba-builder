import { ipcMain, safeStorage } from 'electron';
import { IntegrationManager } from '../../services/integrations/manager';
import Store from 'electron-store';

const store = new Store({ name: 'integrations' });
const manager = IntegrationManager.getInstance();

// Encrypt sensitive data before storing
function encryptConfig(config: Record<string, any>): Record<string, any> {
  const encrypted: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && (
      key.includes('token') || 
      key.includes('key') || 
      key.includes('secret') ||
      key.includes('password')
    )) {
      // Encrypt sensitive fields
      encrypted[key] = safeStorage.encryptString(value).toString('base64');
    } else {
      encrypted[key] = value;
    }
  }
  
  return encrypted;
}

// Decrypt sensitive data after retrieval
function decryptConfig(config: Record<string, any>): Record<string, any> {
  const decrypted: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && (
      key.includes('token') || 
      key.includes('key') || 
      key.includes('secret') ||
      key.includes('password')
    )) {
      try {
        // Decrypt sensitive fields
        const buffer = Buffer.from(value, 'base64');
        decrypted[key] = safeStorage.decryptString(buffer);
      } catch {
        // If decryption fails, use the original value
        decrypted[key] = value;
      }
    } else {
      decrypted[key] = value;
    }
  }
  
  return decrypted;
}

export function registerIntegrationHandlers() {
  // Connect to an integration provider
  ipcMain.handle('integrations:connect', async (event, { provider, config }) => {
    try {
      // Validate required fields
      if (!provider || !config) {
        throw new Error('Provider and config are required');
      }

      // Connect to the provider
      const result = await manager.connect(provider, config);
      
      if (result.success) {
        // Store encrypted credentials
        const encryptedConfig = encryptConfig(config);
        store.set(`providers.${provider}`, {
          config: encryptedConfig,
          connectedAt: new Date().toISOString(),
          metadata: result.data,
        });
      }
      
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to integration',
      };
    }
  });

  // Disconnect from an integration provider
  ipcMain.handle('integrations:disconnect', async (event, { provider }) => {
    try {
      await manager.disconnect(provider);
      
      // Remove stored credentials
      store.delete(`providers.${provider}`);
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to disconnect',
      };
    }
  });

  // Get status of a specific integration
  ipcMain.handle('integrations:get-status', async (event, { provider }) => {
    try {
      // Check if we have stored credentials
      const storedData = store.get(`providers.${provider}`) as any;
      
      if (storedData) {
        // Reconnect using stored credentials
        const config = decryptConfig(storedData.config);
        await manager.connect(provider, config);
      }
      
      return await manager.getStatus(provider);
    } catch (error: any) {
      return {
        connected: false,
        error: error.message,
      };
    }
  });

  // Get statuses of all integrations
  ipcMain.handle('integrations:get-statuses', async (event) => {
    try {
      // Reconnect all stored integrations
      const providers = store.get('providers', {}) as Record<string, any>;
      
      for (const [provider, data] of Object.entries(providers)) {
        try {
          const config = decryptConfig(data.config);
          await manager.connect(provider, config);
        } catch {
          // Ignore connection errors for individual providers
        }
      }
      
      return await manager.getAllStatuses();
    } catch (error: any) {
      console.error('Failed to get integration statuses:', error);
      return {};
    }
  });

  // List available providers
  ipcMain.handle('integrations:list-providers', async () => {
    return manager.listProviders();
  });

  // Get stored integration data (without sensitive info)
  ipcMain.handle('integrations:get-stored-data', async (event, { provider }) => {
    const data = store.get(`providers.${provider}`) as any;
    if (!data) return null;
    
    // Return metadata without sensitive config
    return {
      connectedAt: data.connectedAt,
      metadata: data.metadata,
    };
  });

  // GitHub-specific handlers
  ipcMain.handle('integrations:github:list-repos', async (event, { org }) => {
    try {
      const github = manager.getProvider('github') as any;
      if (!github) throw new Error('GitHub integration not available');
      
      return await github.listRepositories(org);
    } catch (error: any) {
      throw new Error(`Failed to list repositories: ${error.message}`);
    }
  });

  ipcMain.handle('integrations:github:create-repo', async (event, { name, description, isPrivate }) => {
    try {
      const github = manager.getProvider('github') as any;
      if (!github) throw new Error('GitHub integration not available');
      
      return await github.createRepository(name, description, isPrivate);
    } catch (error: any) {
      throw new Error(`Failed to create repository: ${error.message}`);
    }
  });

  // Vercel-specific handlers
  ipcMain.handle('integrations:vercel:list-projects', async (event, { teamId }) => {
    try {
      const vercel = manager.getProvider('vercel') as any;
      if (!vercel) throw new Error('Vercel integration not available');
      
      return await vercel.listProjects(teamId);
    } catch (error: any) {
      throw new Error(`Failed to list projects: ${error.message}`);
    }
  });

  ipcMain.handle('integrations:vercel:deploy', async (event, { projectName, files, teamId }) => {
    try {
      const vercel = manager.getProvider('vercel') as any;
      if (!vercel) throw new Error('Vercel integration not available');
      
      return await vercel.createDeployment(projectName, files, teamId);
    } catch (error: any) {
      throw new Error(`Failed to create deployment: ${error.message}`);
    }
  });

  // Supabase-specific handlers
  ipcMain.handle('integrations:supabase:query', async (event, { table, query }) => {
    try {
      const supabase = manager.getProvider('supabase') as any;
      if (!supabase) throw new Error('Supabase integration not available');
      
      return await supabase.queryData(table, query);
    } catch (error: any) {
      throw new Error(`Failed to query data: ${error.message}`);
    }
  });

  ipcMain.handle('integrations:supabase:insert', async (event, { table, data }) => {
    try {
      const supabase = manager.getProvider('supabase') as any;
      if (!supabase) throw new Error('Supabase integration not available');
      
      return await supabase.insertData(table, data);
    } catch (error: any) {
      throw new Error(`Failed to insert data: ${error.message}`);
    }
  });
}
