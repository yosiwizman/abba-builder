import { useState, useEffect } from 'react';
import { 
  Github, 
  Globe, 
  Database, 
  Train, 
  Zap, 
  Cloud,
  Check,
  X,
  Settings,
  Plus,
  ExternalLink,
  Key,
  Link2,
  Loader2,
  Server,
  Box,
  Brain,
  Mail,
  Search,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'connected' | 'disconnected' | 'error';
  category: 'vcs' | 'hosting' | 'database' | 'backend';
  configFields?: ConfigField[];
  features?: string[];
  docsUrl?: string;
}

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

const integrations: Integration[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Connect your GitHub account to deploy from repositories',
    icon: Github,
    status: 'disconnected',
    category: 'vcs',
    features: ['Repository sync', 'Automatic deployments', 'Pull request previews'],
    docsUrl: 'https://docs.github.com',
    configFields: [
      { key: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...', required: true },
      { key: 'org', label: 'Organization (optional)', type: 'text', placeholder: 'my-org' }
    ]
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy your applications with Vercel\'s edge network',
    icon: Globe,
    status: 'disconnected',
    category: 'hosting',
    features: ['Edge deployments', 'Serverless functions', 'Analytics'],
    docsUrl: 'https://vercel.com/docs',
    configFields: [
      { key: 'token', label: 'API Token', type: 'password', placeholder: 'Bearer ...', required: true },
      { key: 'team', label: 'Team ID (optional)', type: 'text', placeholder: 'team_...' }
    ]
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Open source Firebase alternative with PostgreSQL',
    icon: Database,
    status: 'disconnected',
    category: 'database',
    features: ['PostgreSQL database', 'Realtime subscriptions', 'Authentication', 'Storage'],
    docsUrl: 'https://supabase.com/docs',
    configFields: [
      { key: 'url', label: 'Project URL', type: 'text', placeholder: 'https://xxx.supabase.co', required: true },
      { key: 'anon_key', label: 'Anon Key', type: 'password', required: true },
      { key: 'service_key', label: 'Service Role Key', type: 'password', required: true }
    ]
  },
  {
    id: 'railway',
    name: 'Railway',
    description: 'Deploy apps, databases, and services in clicks',
    icon: Train,
    status: 'disconnected',
    category: 'hosting',
    features: ['One-click deployments', 'Automatic SSL', 'Database provisioning'],
    docsUrl: 'https://docs.railway.app',
    configFields: [
      { key: 'token', label: 'API Token', type: 'password', required: true },
      { key: 'project_id', label: 'Project ID', type: 'text', placeholder: 'prj_...', required: true }
    ]
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Serverless PostgreSQL with branching and autoscaling',
    icon: Zap,
    status: 'disconnected',
    category: 'database',
    features: ['Serverless PostgreSQL', 'Database branching', 'Autoscaling', 'Point-in-time recovery'],
    docsUrl: 'https://neon.tech/docs',
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'database_url', label: 'Database URL', type: 'password', placeholder: 'postgres://...', required: true }
    ]
  },
  {
    id: 'netlify',
    name: 'Netlify',
    description: 'Build, deploy, and manage modern web projects',
    icon: Cloud,
    status: 'disconnected',
    category: 'hosting',
    features: ['Continuous deployment', 'Serverless functions', 'Forms handling'],
    docsUrl: 'https://docs.netlify.com',
    configFields: [
      { key: 'token', label: 'Access Token', type: 'password', required: true },
      { key: 'site_id', label: 'Site ID (optional)', type: 'text' }
    ]
  },
  // Backend Services
  {
    id: 'appwrite',
    name: 'Appwrite',
    description: 'Open-source Firebase alternative with all backend needs',
    icon: Server,
    status: 'disconnected',
    category: 'backend',
    features: ['Authentication', 'Database', 'Storage', 'Functions', 'Realtime', 'Webhooks'],
    docsUrl: 'https://appwrite.io/docs',
    configFields: [
      { key: 'endpoint', label: 'API Endpoint', type: 'text', placeholder: 'https://cloud.appwrite.io/v1', required: true },
      { key: 'project_id', label: 'Project ID', type: 'text', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },
  {
    id: 'pocketbase',
    name: 'PocketBase',
    description: 'Open source backend in a single file',
    icon: Box,
    status: 'disconnected',
    category: 'backend',
    features: ['SQLite database', 'Realtime subscriptions', 'Built-in auth', 'File storage', 'Single binary'],
    docsUrl: 'https://pocketbase.io/docs',
    configFields: [
      { key: 'url', label: 'PocketBase URL', type: 'text', placeholder: 'http://localhost:8090', required: true },
      { key: 'admin_email', label: 'Admin Email', type: 'text', required: true },
      { key: 'admin_password', label: 'Admin Password', type: 'password', required: true }
    ]
  },
  {
    id: 'strapi',
    name: 'Strapi',
    description: 'Leading open-source headless CMS',
    icon: Server,
    status: 'disconnected',
    category: 'backend',
    features: ['Content Types Builder', 'RESTful & GraphQL APIs', 'Media Library', 'Role-based access', 'Plugins'],
    docsUrl: 'https://docs.strapi.io',
    configFields: [
      { key: 'url', label: 'Strapi URL', type: 'text', placeholder: 'http://localhost:1337', required: true },
      { key: 'api_token', label: 'API Token', type: 'password', required: true }
    ]
  },
  {
    id: 'hasura',
    name: 'Hasura',
    description: 'Instant GraphQL APIs on your data',
    icon: Database,
    status: 'disconnected',
    category: 'backend',
    features: ['Instant GraphQL', 'Real-time subscriptions', 'Authorization', 'Event triggers', 'Remote schemas'],
    docsUrl: 'https://hasura.io/docs',
    configFields: [
      { key: 'graphql_endpoint', label: 'GraphQL Endpoint', type: 'text', placeholder: 'https://your-app.hasura.app/v1/graphql', required: true },
      { key: 'admin_secret', label: 'Admin Secret', type: 'password', required: true }
    ]
  },
  // AI/ML Services
  {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'The AI community building the future',
    icon: Brain,
    status: 'disconnected',
    category: 'backend',
    features: ['Model hosting', 'Inference API', 'Datasets', 'Spaces', '100K+ models'],
    docsUrl: 'https://huggingface.co/docs',
    configFields: [
      { key: 'api_token', label: 'Access Token', type: 'password', placeholder: 'hf_...', required: true },
      { key: 'org', label: 'Organization (optional)', type: 'text' }
    ]
  },
  {
    id: 'replicate',
    name: 'Replicate',
    description: 'Run AI models with an API',
    icon: Brain,
    status: 'disconnected',
    category: 'backend',
    features: ['Image generation', 'Text generation', 'Audio/Video processing', 'Pay-per-use'],
    docsUrl: 'https://replicate.com/docs',
    configFields: [
      { key: 'api_token', label: 'API Token', type: 'password', required: true }
    ]
  },
  // Developer Tools
  {
    id: 'prisma',
    name: 'Prisma',
    description: 'Next-generation ORM for Node.js & TypeScript',
    icon: Database,
    status: 'disconnected',
    category: 'backend',
    features: ['Type-safe database access', 'Auto-completion', 'Migrations', 'Visual database browser'],
    docsUrl: 'https://www.prisma.io/docs',
    configFields: [
      { key: 'database_url', label: 'Database Connection URL', type: 'password', placeholder: 'postgresql://...', required: true }
    ]
  },
  {
    id: 'clerk',
    name: 'Clerk',
    description: 'Complete user management and authentication',
    icon: Shield,
    status: 'disconnected',
    category: 'backend',
    features: ['Pre-built components', 'Social logins', 'Multi-factor auth', 'User profiles', 'Organizations'],
    docsUrl: 'https://clerk.com/docs',
    configFields: [
      { key: 'publishable_key', label: 'Publishable Key', type: 'text', placeholder: 'pk_...', required: true },
      { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'sk_...', required: true }
    ]
  },
  // Email Services
  {
    id: 'resend',
    name: 'Resend',
    description: 'Email for developers',
    icon: Mail,
    status: 'disconnected',
    category: 'backend',
    features: ['React email templates', 'Webhooks', 'Email analytics', 'Domain verification'],
    docsUrl: 'https://resend.com/docs',
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 're_...', required: true }
    ]
  },
  // Search
  {
    id: 'meilisearch',
    name: 'Meilisearch',
    description: 'Lightning-fast search API',
    icon: Search,
    status: 'disconnected',
    category: 'backend',
    features: ['Typo tolerance', 'Filters & facets', 'Geo search', 'Multi-tenancy', 'Instant search'],
    docsUrl: 'https://docs.meilisearch.com',
    configFields: [
      { key: 'host', label: 'Host URL', type: 'text', placeholder: 'http://localhost:7700', required: true },
      { key: 'api_key', label: 'Master Key', type: 'password', required: true }
    ]
  },
  // Monitoring
  {
    id: 'sentry',
    name: 'Sentry',
    description: 'Application monitoring and error tracking',
    icon: Shield,
    status: 'disconnected',
    category: 'backend',
    features: ['Error tracking', 'Performance monitoring', 'Release tracking', 'User feedback'],
    docsUrl: 'https://docs.sentry.io',
    configFields: [
      { key: 'dsn', label: 'DSN', type: 'text', placeholder: 'https://...@sentry.io/...', required: true },
      { key: 'org', label: 'Organization Slug', type: 'text', required: true },
      { key: 'project', label: 'Project Slug', type: 'text', required: true },
      { key: 'auth_token', label: 'Auth Token (optional)', type: 'password' }
    ]
  }
];

export default function IntegrationsPage() {
  const [integrationsList, setIntegrationsList] = useState(integrations);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    loadIntegrationStatuses();
  }, []);

  const loadIntegrationStatuses = async () => {
    try {
      const statuses = await window.electron.invoke('integrations:get-statuses');
      setIntegrationsList(prev => 
        prev.map(integration => ({
          ...integration,
          status: statuses[integration.id] || 'disconnected'
        }))
      );
    } catch (error) {
      console.error('Failed to load integration statuses:', error);
    }
  };

  const handleConnect = async (integration: Integration) => {
    if (!validateConfig(integration)) {
      toast.error('Invalid Configuration: Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electron.invoke('integrations:connect', {
        provider: integration.id,
        config: configValues
      });

      if (result.success) {
        toast.success(`${integration.name} has been connected to your workspace`);
        
        setIntegrationsList(prev =>
          prev.map(item =>
            item.id === integration.id
              ? { ...item, status: 'connected' }
              : item
          )
        );
        setSelectedIntegration(null);
        setConfigValues({});
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect to ' + integration.name);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    setLoading(true);
    try {
      await window.electron.invoke('integrations:disconnect', {
        provider: integration.id
      });

      toast.success(`${integration.name} has been disconnected`);

      setIntegrationsList(prev =>
        prev.map(item =>
          item.id === integration.id
            ? { ...item, status: 'disconnected' }
            : item
        )
      );
    } catch (error: any) {
      toast.error(`Disconnection Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const validateConfig = (integration: Integration): boolean => {
    if (!integration.configFields) return true;
    
    return integration.configFields
      .filter(field => field.required)
      .every(field => configValues[field.key]?.trim());
  };

  const filteredIntegrations = activeCategory === 'all' 
    ? integrationsList 
    : integrationsList.filter(i => i.category === activeCategory);

  const categories = [
    { id: 'all', label: 'All Integrations' },
    { id: 'vcs', label: 'Version Control' },
    { id: 'hosting', label: 'Hosting & Deployment' },
    { id: 'database', label: 'Databases' },
    { id: 'backend', label: 'Backend Services' }
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your favorite services to enhance your development workflow
        </p>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration) => {
          const Icon = integration.icon;
          const isConnected = integration.status === 'connected';
          
          return (
            <Card key={integration.id} className="relative overflow-hidden">
              {isConnected && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-green-500" />
              )}
              
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
                    }`}>
                      <Icon className={`h-6 w-6 ${
                        isConnected ? 'text-green-600 dark:text-green-400' : ''
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <Badge variant={isConnected ? 'default' : 'secondary'} className="mt-1">
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <CardDescription className="mb-4">
                  {integration.description}
                </CardDescription>
                
                {integration.features && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Features:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {integration.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant={isConnected ? "outline" : "default"}
                        className="flex-1"
                        onClick={() => {
                          setSelectedIntegration(integration);
                          setConfigValues({});
                        }}
                      >
                        {isConnected ? (
                          <>
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Connect
                          </>
                        )}
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          Configure {integration.name}
                        </DialogTitle>
                        <DialogDescription>
                          Enter your {integration.name} credentials to connect your account
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        {integration.configFields?.map((field) => (
                          <div key={field.key} className="space-y-2">
                            <Label htmlFor={field.key}>
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            <Input
                              id={field.key}
                              type={field.type}
                              placeholder={field.placeholder}
                              value={configValues[field.key] || ''}
                              onChange={(e) => setConfigValues({
                                ...configValues,
                                [field.key]: e.target.value
                              })}
                              disabled={loading}
                            />
                          </div>
                        ))}
                        
                        {integration.docsUrl && (
                          <Alert>
                            <AlertDescription>
                              <a 
                                href={integration.docsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                              >
                                View documentation
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      
                      <DialogFooter>
                        {isConnected && (
                          <Button
                            variant="destructive"
                            onClick={() => handleDisconnect(integration)}
                            disabled={loading}
                          >
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Disconnect'
                            )}
                          </Button>
                        )}
                        <Button
                          onClick={() => handleConnect(integration)}
                          disabled={loading || !validateConfig(integration)}
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            isConnected ? 'Update' : 'Connect'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {integration.docsUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <a 
                        href={integration.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
