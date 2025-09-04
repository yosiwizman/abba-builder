import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IntegrationProvider, ConnectionResult, IntegrationStatus, SupabaseConfig } from './types';

export class SupabaseIntegration implements IntegrationProvider {
  id = 'supabase';
  name = 'Supabase';
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig | null = null;

  async connect(config: SupabaseConfig): Promise<ConnectionResult> {
    try {
      this.config = config;
      this.client = createClient(config.url, config.anon_key, {
        auth: {
          persistSession: false
        }
      });

      // Test the connection with a simple query
      const { data, error } = await this.client
        .from('_supabase_migrations')
        .select('version')
        .limit(1);

      if (error && !error.message.includes('does not exist')) {
        throw error;
      }
      
      return {
        success: true,
        data: {
          url: config.url,
          connected: true,
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to Supabase',
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.auth.signOut();
      this.client = null;
    }
    this.config = null;
  }

  async test(): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      const { error } = await this.client
        .from('_supabase_migrations')
        .select('version')
        .limit(1);
      
      // If the error is about the table not existing, that's fine
      // It means we can connect to the database
      return !error || error.message.includes('does not exist');
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<IntegrationStatus> {
    const connected = await this.test();
    
    if (!connected) {
      return {
        connected: false,
        error: this.client ? 'Connection failed' : 'Not configured',
      };
    }

    return {
      connected: true,
      lastCheck: new Date(),
      metadata: {
        url: this.config?.url,
      }
    };
  }

  async createTable(tableName: string, schema: any) {
    if (!this.client || !this.config) throw new Error('Supabase client not initialized');

    // Use the service role key for admin operations
    const adminClient = createClient(this.config.url, this.config.service_key);
    
    // This would typically be done via SQL or migrations
    // For demonstration, we'll use the REST API
    const response = await fetch(`${this.config.url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.config.service_key,
        'Authorization': `Bearer ${this.config.service_key}`,
      },
      body: JSON.stringify({
        query: `CREATE TABLE IF NOT EXISTS ${tableName} ${schema}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create table: ${response.statusText}`);
    }

    return true;
  }

  async insertData(table: string, data: any) {
    if (!this.client) throw new Error('Supabase client not initialized');

    const { data: result, error } = await this.client
      .from(table)
      .insert(data);

    if (error) throw error;
    return result;
  }

  async queryData(table: string, query?: any) {
    if (!this.client) throw new Error('Supabase client not initialized');

    let queryBuilder = this.client.from(table).select('*');
    
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        queryBuilder = queryBuilder.eq(key, value);
      });
    }

    const { data, error } = await queryBuilder;
    
    if (error) throw error;
    return data;
  }

  async setupAuth() {
    if (!this.client) throw new Error('Supabase client not initialized');

    // Return auth client for use in the application
    return this.client.auth;
  }

  async setupRealtime(table: string, callback: (payload: any) => void) {
    if (!this.client) throw new Error('Supabase client not initialized');

    const channel = this.client
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        callback
      )
      .subscribe();

    return channel;
  }
}
