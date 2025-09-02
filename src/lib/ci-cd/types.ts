/**
 * CI/CD Provider Integration Types
 * Defines the contract for all CI/CD provider implementations
 */

export interface CIProvider {
  name: string;
  type: CIProviderType;
  
  // Authentication
  authenticate(config: AuthConfig): Promise<boolean>;
  isAuthenticated(): boolean;
  
  // Builds
  getBuilds(options?: BuildQueryOptions): Promise<Build[]>;
  getBuildDetails(buildId: string): Promise<BuildDetails>;
  triggerBuild(options: TriggerBuildOptions): Promise<Build>;
  cancelBuild(buildId: string): Promise<boolean>;
  
  // Deployments
  getDeployments(options?: DeploymentQueryOptions): Promise<Deployment[]>;
  triggerDeployment(options: TriggerDeploymentOptions): Promise<Deployment>;
  rollbackDeployment(deploymentId: string): Promise<boolean>;
  
  // Webhooks/Real-time
  subscribeToUpdates(callback: UpdateCallback): () => void;
  
  // Statistics
  getStatistics(options?: StatisticsOptions): Promise<Statistics>;
}

export enum CIProviderType {
  GITHUB_ACTIONS = 'github-actions',
  JENKINS = 'jenkins',
  CIRCLECI = 'circleci',
  GITLAB_CI = 'gitlab-ci',
  AZURE_DEVOPS = 'azure-devops',
  BITBUCKET_PIPELINES = 'bitbucket-pipelines'
}

export interface AuthConfig {
  type: 'token' | 'oauth' | 'basic' | 'app';
  token?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  privateKey?: string;
  appId?: string;
  installationId?: string;
}

export interface Build {
  id: string;
  number: number;
  status: BuildStatus;
  branch: string;
  commit: string;
  commitMessage?: string;
  author?: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  url?: string;
  artifacts?: Artifact[];
}

export enum BuildStatus {
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILURE = 'failure',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped'
}

export interface BuildDetails extends Build {
  logs?: string;
  steps?: BuildStep[];
  environment?: Record<string, string>;
  triggerInfo?: TriggerInfo;
}

export interface BuildStep {
  name: string;
  status: BuildStatus;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  logs?: string;
}

export interface Artifact {
  name: string;
  size: number;
  url: string;
  type: string;
}

export interface BuildQueryOptions {
  branch?: string;
  status?: BuildStatus;
  limit?: number;
  offset?: number;
  since?: Date;
  until?: Date;
}

export interface TriggerBuildOptions {
  branch: string;
  commit?: string;
  message?: string;
  parameters?: Record<string, any>;
}

export interface Deployment {
  id: string;
  environment: string;
  status: DeploymentStatus;
  version: string;
  deployedBy: string;
  deployedAt: Date;
  buildId?: string;
  url?: string;
}

export enum DeploymentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILURE = 'failure',
  ROLLED_BACK = 'rolled_back'
}

export interface DeploymentQueryOptions {
  environment?: string;
  status?: DeploymentStatus;
  limit?: number;
  offset?: number;
}

export interface TriggerDeploymentOptions {
  environment: string;
  version: string;
  buildId?: string;
  parameters?: Record<string, any>;
}

export interface TriggerInfo {
  type: 'manual' | 'webhook' | 'schedule' | 'api';
  actor?: string;
  event?: string;
}

export interface Statistics {
  totalBuilds: number;
  successRate: number;
  averageDuration: number;
  failureRate: number;
  buildsPerDay: number;
  topFailureReasons?: FailureReason[];
}

export interface FailureReason {
  reason: string;
  count: number;
  percentage: number;
}

export interface StatisticsOptions {
  period?: 'day' | 'week' | 'month' | 'year';
  branch?: string;
}

export type UpdateCallback = (update: ProviderUpdate) => void;

export interface ProviderUpdate {
  type: 'build' | 'deployment';
  action: 'started' | 'completed' | 'failed' | 'cancelled';
  data: Build | Deployment;
}

// Provider Registry
export interface ProviderConfig {
  type: CIProviderType;
  auth: AuthConfig;
  baseUrl?: string;
  options?: Record<string, any>;
}

export interface ProviderFactory {
  create(config: ProviderConfig): CIProvider;
  supports(type: CIProviderType): boolean;
}
