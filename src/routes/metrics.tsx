import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Activity, Brain, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface MetricData {
  timestamp: string;
  successRate: number;
  iterations: number;
  tokensUsed: number;
  executionTime: number;
  selfHealingActivations: number;
  knowledgeBaseHits: number;
}

interface SystemHealth {
  orchestrator: 'operational' | 'degraded' | 'offline';
  claude: 'connected' | 'fallback' | 'offline';
  python: 'available' | 'unavailable';
  testing: 'active' | 'idle';
  knowledge: 'synced' | 'updating' | 'stale';
}

export default function MetricsPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    orchestrator: 'operational',
    claude: 'fallback',
    python: 'available',
    testing: 'idle',
    knowledge: 'synced',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await window.api.invoke('enhanced:get-metrics');
      if (data?.metrics) {
        setMetrics(data.metrics.slice(-50)); // Last 50 data points
      }
      if (data?.health) {
        setSystemHealth(data.health);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentSuccessRate = metrics[metrics.length - 1]?.successRate || 0;
  const avgSuccessRate = metrics.reduce((acc, m) => acc + m.successRate, 0) / (metrics.length || 1);
  const totalIterations = metrics.reduce((acc, m) => acc + m.iterations, 0);
  const totalTokens = metrics.reduce((acc, m) => acc + m.tokensUsed, 0);
  const avgExecutionTime = metrics.reduce((acc, m) => acc + m.executionTime, 0) / (metrics.length || 1);
  const selfHealingEvents = metrics.reduce((acc, m) => acc + m.selfHealingActivations, 0);
  const knowledgeUtilization = metrics.reduce((acc, m) => acc + m.knowledgeBaseHits, 0);

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'operational':
      case 'connected':
      case 'available':
      case 'active':
      case 'synced':
        return 'text-green-500';
      case 'degraded':
      case 'fallback':
      case 'idle':
      case 'updating':
        return 'text-yellow-500';
      default:
        return 'text-red-500';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Enhanced System Metrics</h1>
            <p className="text-sm text-muted-foreground">
              Real-time performance monitoring for Abba's enhanced AI orchestration
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          Last updated: {new Date().toLocaleTimeString()}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentSuccessRate.toFixed(1)}%</div>
                <Progress value={currentSuccessRate} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {avgSuccessRate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Total Iterations</CardTitle>
                  <Activity className="w-4 h-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalIterations.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Multi-stage reasoning cycles
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Self-Healing</CardTitle>
                  <Shield className="w-4 h-4 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selfHealingEvents}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-recovery activations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Knowledge Hits</CardTitle>
                  <Brain className="w-4 h-4 text-indigo-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{knowledgeUtilization}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pattern matches from KB
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Current status of enhanced components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getHealthColor(systemHealth.orchestrator)} animate-pulse`} />
                  <div>
                    <p className="text-xs text-muted-foreground">Orchestrator</p>
                    <p className="text-sm font-medium capitalize">{systemHealth.orchestrator}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getHealthColor(systemHealth.claude)}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">Claude API</p>
                    <p className="text-sm font-medium capitalize">{systemHealth.claude}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getHealthColor(systemHealth.python)}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">Python Bridge</p>
                    <p className="text-sm font-medium capitalize">{systemHealth.python}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getHealthColor(systemHealth.testing)}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">Testing Bot</p>
                    <p className="text-sm font-medium capitalize">{systemHealth.testing}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getHealthColor(systemHealth.knowledge)}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">Knowledge Base</p>
                    <p className="text-sm font-medium capitalize">{systemHealth.knowledge}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <Tabs defaultValue="success" className="w-full">
            <TabsList>
              <TabsTrigger value="success">Success Rate</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="tokens">Token Usage</TabsTrigger>
              <TabsTrigger value="healing">Self-Healing</TabsTrigger>
            </TabsList>

            <TabsContent value="success" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Success Rate Over Time</CardTitle>
                  <CardDescription>
                    Percentage of successful code generation attempts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height="300">
                    <AreaChart data={metrics}>
                      <defs>
                        <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="successRate"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#successGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Execution Time</CardTitle>
                  <CardDescription>
                    Average time per generation cycle (seconds)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height="300">
                    <LineChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="executionTime"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tokens" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Token Consumption</CardTitle>
                  <CardDescription>
                    Claude API token usage per generation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height="300">
                    <BarChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="tokensUsed" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="healing" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Self-Healing Activity</CardTitle>
                  <CardDescription>
                    Automatic error recovery and optimization events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height="300">
                    <BarChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="selfHealingActivations" fill="#f59e0b" />
                      <Bar dataKey="knowledgeBaseHits" fill="#6366f1" />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Feature Highlights */}
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Features</CardTitle>
              <CardDescription>
                Abba's advanced AI orchestration capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium">200K Token Context</p>
                      <p className="text-sm text-muted-foreground">
                        Deep understanding with Claude's extended context window
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Brain className="w-5 h-5 text-indigo-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Multi-Stage Reasoning</p>
                      <p className="text-sm text-muted-foreground">
                        Analyze → Plan → Implement → Optimize pipeline
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Automated Testing</p>
                      <p className="text-sm text-muted-foreground">
                        Bot-driven validation simulating human interaction
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Self-Healing System</p>
                      <p className="text-sm text-muted-foreground">
                        Production monitoring with automatic recovery
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">97% Success Rate</p>
                      <p className="text-sm text-muted-foreground">
                        Industry-leading code generation accuracy
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Brain className="w-5 h-5 text-pink-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Learning Knowledge Base</p>
                      <p className="text-sm text-muted-foreground">
                        Continuously improving from past generations
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
