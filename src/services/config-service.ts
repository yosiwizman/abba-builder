interface AppConfig {
  // Application
  nodeEnv: string;
  port: number;
  appUrl: string;
  
  // API Keys
  openaiApiKey?: string;
  anthropicApiKey?: string;
  claudeApiKey?: string;
  githubToken?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  
  // Database
  databaseUrl: string;
  redisUrl: string;
  
  // Authentication
  jwtSecret: string;
  sessionSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  
  // External Services
  vercelToken?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  neonDatabaseUrl?: string;
  
  // Blockchain
  infuraProjectId?: string;
  alchemyApiKey?: string;
  etherscanApiKey?: string;
  
  // Analytics & Monitoring
  sentryDsn?: string;
  posthogApiKey?: string;
  mixpanelToken?: string;
  
  // Storage
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  s3BucketName?: string;
  
  // Email
  sendgridApiKey?: string;
  emailFrom?: string;
  
  // Payment
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  
  // Feature Flags
  enableAnalytics: boolean;
  enableErrorTracking: boolean;
  enableRedisCache: boolean;
  enableGithubIntegration: boolean;
}

export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig;
  
  private constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }
  
  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }
  
  private loadConfiguration(): AppConfig {
    return {
      // Application
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '5173'),
      appUrl: process.env.APP_URL || 'http://localhost:5173',
      
      // API Keys
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
      claudeApiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
      githubToken: process.env.GITHUB_TOKEN,
      githubClientId: process.env.GITHUB_CLIENT_ID,
      githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
      
      // Database
      databaseUrl: process.env.DATABASE_URL || 'sqlite:./data/dyad.db',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      
      // Authentication
      jwtSecret: process.env.JWT_SECRET || this.generateRandomSecret(),
      sessionSecret: process.env.SESSION_SECRET || this.generateRandomSecret(),
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      
      // External Services
      vercelToken: process.env.VERCEL_TOKEN,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      neonDatabaseUrl: process.env.NEON_DATABASE_URL,
      
      // Blockchain
      infuraProjectId: process.env.INFURA_PROJECT_ID,
      alchemyApiKey: process.env.ALCHEMY_API_KEY,
      etherscanApiKey: process.env.ETHERSCAN_API_KEY,
      
      // Analytics & Monitoring
      sentryDsn: process.env.SENTRY_DSN,
      posthogApiKey: process.env.POSTHOG_API_KEY,
      mixpanelToken: process.env.MIXPANEL_TOKEN,
      
      // Storage
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION || 'us-east-1',
      s3BucketName: process.env.S3_BUCKET_NAME,
      
      // Email
      sendgridApiKey: process.env.SENDGRID_API_KEY,
      emailFrom: process.env.EMAIL_FROM || 'noreply@dyad.sh',
      
      // Payment
      stripeSecretKey: process.env.STRIPE_SECRET_KEY,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      
      // Feature Flags
      enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
      enableErrorTracking: process.env.ENABLE_ERROR_TRACKING === 'true',
      enableRedisCache: process.env.ENABLE_REDIS_CACHE !== 'false', // Default true
      enableGithubIntegration: process.env.ENABLE_GITHUB_INTEGRATION !== 'false', // Default true
    };
  }
  
  private generateRandomSecret(): string {
    if (this.isDevelopment()) {
      console.warn('⚠️ Using generated secret for development. Set JWT_SECRET and SESSION_SECRET in production!');
      return 'dev-secret-' + Math.random().toString(36).substring(7);
    }
    throw new Error('JWT_SECRET and SESSION_SECRET must be set in production');
  }
  
  private validateConfiguration(): void {
    const errors: string[] = [];
    
    // Only validate critical settings in production
    if (this.isProduction()) {
      if (!this.config.jwtSecret || this.config.jwtSecret.startsWith('dev-secret-')) {
        errors.push('JWT_SECRET must be set in production');
      }
      
      if (!this.config.sessionSecret || this.config.sessionSecret.startsWith('dev-secret-')) {
        errors.push('SESSION_SECRET must be set in production');
      }
      
      if (!this.config.databaseUrl) {
        errors.push('DATABASE_URL must be set in production');
      }
    }
    
    // Warnings for missing optional services
    if (!this.config.claudeApiKey && !this.config.openaiApiKey) {
      console.warn('⚠️ No AI API keys configured. AI features will be limited.');
    }
    
    if (!this.config.githubToken) {
      console.warn('⚠️ GitHub token not configured. GitHub integration will be limited.');
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuration errors:\\n${errors.join('\\n')}`);
    }
  }
  
  // Getters for configuration values
  get(key: keyof AppConfig): any {
    return this.config[key];
  }
  
  getAll(): AppConfig {
    return { ...this.config };
  }
  
  // Environment helpers
  isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }
  
  isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }
  
  isTest(): boolean {
    return this.config.nodeEnv === 'test';
  }
  
  // Service availability checks
  hasOpenAI(): boolean {
    return !!this.config.openaiApiKey;
  }
  
  hasClaude(): boolean {
    return !!this.config.claudeApiKey;
  }
  
  hasGitHub(): boolean {
    return !!this.config.githubToken;
  }
  
  hasRedis(): boolean {
    return this.config.enableRedisCache;
  }
  
  hasAnalytics(): boolean {
    return this.config.enableAnalytics && (!!this.config.sentryDsn || !!this.config.posthogApiKey);
  }
  
  // Safe config for client-side
  getPublicConfig(): Partial<AppConfig> {
    return {
      nodeEnv: this.config.nodeEnv,
      appUrl: this.config.appUrl,
      githubClientId: this.config.githubClientId,
      supabaseUrl: this.config.supabaseUrl,
      supabaseAnonKey: this.config.supabaseAnonKey,
      stripePublishableKey: this.config.stripePublishableKey,
      enableAnalytics: this.config.enableAnalytics,
      enableGithubIntegration: this.config.enableGithubIntegration,
    };
  }
}
