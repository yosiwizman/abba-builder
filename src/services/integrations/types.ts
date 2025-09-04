export interface IntegrationProvider {
  id: string;
  name: string;
  connect(config: Record<string, any>): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  test(): Promise<boolean>;
  getStatus(): Promise<IntegrationStatus>;
}

export interface ConnectionResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface IntegrationStatus {
  connected: boolean;
  lastCheck?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface GitHubConfig {
  token: string;
  org?: string;
}

export interface VercelConfig {
  token: string;
  team?: string;
}

export interface SupabaseConfig {
  url: string;
  anon_key: string;
  service_key: string;
}

export interface RailwayConfig {
  token: string;
  project_id: string;
}

export interface NeonConfig {
  api_key: string;
  database_url: string;
}

export interface NetlifyConfig {
  token: string;
  site_id?: string;
}
