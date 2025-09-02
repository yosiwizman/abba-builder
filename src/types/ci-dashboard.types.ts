// CI/CD Dashboard Type Definitions

export interface CIBuild {
  id: string;
  project: string;
  branch: string;
  status: 'success' | 'failure' | 'pending' | 'running';
  timestamp: string;
  duration?: number;
  commitHash?: string;
  author?: string;
  message?: string;
}

export interface CIDeployment {
  id: string;
  environment: 'production' | 'staging' | 'development' | 'testing';
  version: string;
  status: 'active' | 'inactive' | 'deploying' | 'failed';
  deployedAt: string;
  deployedBy?: string;
  rollbackVersion?: string;
}

export interface CIStatistics {
  totalBuilds: number;
  successRate: number;
  averageBuildTime: number;
  failureRate?: number;
  totalDeployments?: number;
  activeEnvironments?: number;
}

export interface BuildDetails {
  build: CIBuild;
  logs: string[];
}

export interface TriggerBuildRequest {
  project: string;
  branch: string;
}

export interface TriggerBuildResponse {
  success: boolean;
  buildId?: string;
  message?: string;
  error?: string;
}
