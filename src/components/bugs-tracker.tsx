import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Bug,
  Calendar,
  User,
  MessageSquare,
  AlertTriangle,
  Info,
  ExternalLink,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { IpcClient } from '@/ipc/ipc_client';

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  closed_at?: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
    description?: string;
  }>;
  assignees: Array<{
    login: string;
    avatar_url: string;
  }>;
  comments: number;
  pull_request?: any;
}

interface ProjectBugs {
  projectId: string;
  projectName: string;
  owner: string;
  issues: GitHubIssue[];
  stats: {
    total: number;
    open: number;
    closed: number;
    critical: number;
    major: number;
    minor: number;
    goodFirstIssue: number;
    helpWanted: number;
  };
  lastFetched?: Date;
}

interface BugsTrackerProps {
  projectId?: string;
  projectName?: string;
  owner?: string;
}

const BugsTracker: React.FC<BugsTrackerProps> = ({
  projectId,
  projectName,
  owner,
}) => {
  const [bugs, setBugs] = useState<ProjectBugs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'open' | 'closed'>('open');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (projectName && owner) {
      fetchBugs();
    }
  }, [projectName, owner]);

  const fetchBugs = async () => {
    if (!projectName || !owner) return;

    setLoading(true);
    setError(null);

    try {
      const ipcClient = IpcClient.getInstance();
      const response = await ipcClient.invoke('fetchProjectBugs', {
        projectName,
        owner,
        includeClosedIssues: stateFilter !== 'open',
      });

      if (response?.success) {
        setBugs(response.data);
      } else {
        // Fallback to direct GitHub API call
        const issues = await fetchGitHubIssues(owner, projectName);
        const processedBugs = processIssues(issues);
        setBugs(processedBugs);
      }
    } catch (err) {
      console.error('Error fetching bugs:', err);
      setError('Failed to fetch bugs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGitHubIssues = async (
    owner: string,
    repo: string
  ): Promise<GitHubIssue[]> => {
    const baseUrl = `https://api.github.com/repos/${owner}/${repo}/issues`;
    const params = new URLSearchParams({
      state: stateFilter === 'all' ? 'all' : stateFilter,
      per_page: '100',
      sort: 'updated',
      direction: 'desc',
    });

    const response = await fetch(`${baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return response.json();
  };

  const processIssues = (issues: GitHubIssue[]): ProjectBugs => {
    const stats = {
      total: issues.length,
      open: 0,
      closed: 0,
      critical: 0,
      major: 0,
      minor: 0,
      goodFirstIssue: 0,
      helpWanted: 0,
    };

    issues.forEach((issue) => {
      if (issue.state === 'open') stats.open++;
      else stats.closed++;

      issue.labels.forEach((label) => {
        const labelName = label.name.toLowerCase();
        if (labelName.includes('critical') || labelName.includes('urgent')) {
          stats.critical++;
        } else if (labelName.includes('major') || labelName.includes('high')) {
          stats.major++;
        } else if (labelName.includes('minor') || labelName.includes('low')) {
          stats.minor++;
        }

        if (labelName === 'good first issue' || labelName.includes('beginner')) {
          stats.goodFirstIssue++;
        }
        if (labelName === 'help wanted') {
          stats.helpWanted++;
        }
      });
    });

    return {
      projectId: projectId || `${owner}/${projectName}`,
      projectName: projectName || '',
      owner: owner || '',
      issues,
      stats,
      lastFetched: new Date(),
    };
  };


  const filterIssues = (issues: GitHubIssue[]): GitHubIssue[] => {
    return issues.filter((issue) => {
      // Filter out pull requests
      if (issue.pull_request) return false;

      // Search filter
      if (
        searchTerm &&
        !issue.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !issue.body?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // State filter
      if (stateFilter !== 'all' && issue.state !== stateFilter) {
        return false;
      }

      // Severity filter
      if (severityFilter !== 'all') {
        const hasLabel = issue.labels.some((label) =>
          label.name.toLowerCase().includes(severityFilter.toLowerCase())
        );
        if (!hasLabel) return false;
      }

      // Label filter
      if (labelFilter !== 'all') {
        const hasLabel = issue.labels.some(
          (label) => label.name === labelFilter
        );
        if (!hasLabel) return false;
      }

      return true;
    });
  };

  const uniqueLabels = bugs
    ? Array.from(
        new Set(bugs.issues.flatMap((issue) => issue.labels.map((l) => l.name)))
      )
    : [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Loading Bugs...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchBugs} className="mt-4" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!bugs || bugs.issues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            No Bugs Found
          </CardTitle>
          <CardDescription>
            {projectName
              ? `No issues found for ${owner}/${projectName}`
              : 'Select a project to view its bugs'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const filteredIssues = filterIssues(bugs.issues);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bug className="w-5 h-5" />
                Bugs Tracker: {bugs.owner}/{bugs.projectName}
              </CardTitle>
              <CardDescription>
                Tracking {bugs.stats.total} issues ({bugs.stats.open} open,{' '}
                {bugs.stats.closed} closed)
                {bugs.lastFetched && (
                  <span className="ml-2">
                    • Updated {formatDistanceToNow(bugs.lastFetched, { addSuffix: true })}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button onClick={fetchBugs} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">{bugs.stats.critical}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Major</p>
                <p className="text-2xl font-bold text-orange-600">{bugs.stats.major}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Good First Issue</p>
                <p className="text-2xl font-bold text-green-600">
                  {bugs.stats.goodFirstIssue}
                </p>
              </div>
              <Star className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Help Wanted</p>
                <p className="text-2xl font-bold text-blue-600">
                  {bugs.stats.helpWanted}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search issues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={stateFilter} onValueChange={(v: any) => setStateFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>

            <Select value={labelFilter} onValueChange={setLabelFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Labels</SelectItem>
                {uniqueLabels.map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <Card>
        <CardHeader>
          <CardTitle>Issues ({filteredIssues.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="good-first">Good First Issues</TabsTrigger>
              <TabsTrigger value="help-wanted">Help Wanted</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {filteredIssues.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="good-first">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {filteredIssues
                    .filter((issue) =>
                      issue.labels.some(
                        (l) =>
                          l.name.toLowerCase() === 'good first issue' ||
                          l.name.toLowerCase().includes('beginner')
                      )
                    )
                    .map((issue) => (
                      <IssueCard key={issue.id} issue={issue} highlight="good-first" />
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="help-wanted">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {filteredIssues
                    .filter((issue) =>
                      issue.labels.some((l) => l.name.toLowerCase() === 'help wanted')
                    )
                    .map((issue) => (
                      <IssueCard key={issue.id} issue={issue} highlight="help-wanted" />
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// Issue Card Component
const IssueCard: React.FC<{
  issue: GitHubIssue;
  highlight?: 'good-first' | 'help-wanted';
}> = ({ issue, highlight }) => {
  const getSeverityFromLabels = (labels: GitHubIssue['labels']): string => {
    for (const label of labels) {
      const name = label.name.toLowerCase();
      if (name.includes('critical') || name.includes('urgent')) return 'critical';
      if (name.includes('major') || name.includes('high')) return 'major';
      if (name.includes('minor') || name.includes('low')) return 'minor';
    }
    return 'normal';
  };


  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        highlight === 'good-first' && 'border-green-500',
        highlight === 'help-wanted' && 'border-blue-500'
      )}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={issue.state === 'open' ? 'default' : 'secondary'}>
                  {issue.state}
                </Badge>
                <span className="text-sm text-muted-foreground">#{issue.number}</span>
              </div>
              <h4 className="font-semibold text-lg hover:text-blue-600 cursor-pointer">
                <a
                  href={issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  {issue.title}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </h4>
            </div>
          </div>

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {issue.labels.map((label) => (
                <Badge
                  key={label.name}
                  variant="outline"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    borderColor: `#${label.color}`,
                    color: `#${label.color}`,
                  }}
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <a
                href={issue.user.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600"
              >
                {issue.user.login}
              </a>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
            </div>
            {issue.comments > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {issue.comments} comments
              </div>
            )}
          </div>

          {/* Assignees */}
          {issue.assignees.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Assigned to:</span>
              <div className="flex -space-x-2">
                {issue.assignees.slice(0, 3).map((assignee) => (
                  <img
                    key={assignee.login}
                    src={assignee.avatar_url}
                    alt={assignee.login}
                    className="w-6 h-6 rounded-full border-2 border-white"
                    title={assignee.login}
                  />
                ))}
                {issue.assignees.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs">
                    +{issue.assignees.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BugsTracker;
