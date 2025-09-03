import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Star,
  GitFork,
  Eye,
  GitPullRequest,
  AlertCircle,
  Users,
  Download,
  Code,
  Package,
  Shield,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stars_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  language: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  license?: {
    name: string;
    spdx_id: string;
  };
  topics: string[];
  default_branch: string;
  visibility: string;
}

interface GitHubContributor {
  login: string;
  avatar_url: string;
  contributions: number;
  html_url: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  download_count: number;
  prerelease: boolean;
  html_url: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  html_url: string;
}

interface OSSGitHubIntegrationProps {
  className?: string;
}

export function OSSGitHubIntegration({ className }: OSSGitHubIntegrationProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoData, setRepoData] = useState<GitHubRepo | null>(null);
  const [contributors, setContributors] = useState<GitHubContributor[]>([]);
  const [releases, setReleases] = useState<GitHubRelease[]>([]);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [pullRequests, setPullRequests] = useState<GitHubIssue[]>([]);

  const fetchRepoData = async () => {
    if (!repoUrl) return;

    setLoading(true);
    setError(null);

    try {
      // Extract owner and repo from URL
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) {
        throw new Error("Invalid GitHub repository URL");
      }

      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, "");

      // Fetch repository data
      const repoResponse = await fetch(
        `https://api.github.com/repos/${owner}/${cleanRepo}`,
      );
      if (!repoResponse.ok) throw new Error("Failed to fetch repository data");
      const repoJson = await repoResponse.json();
      setRepoData({
        ...repoJson,
        stars_count: repoJson.stargazers_count,
        watchers_count: repoJson.subscribers_count,
      });

      // Fetch contributors
      const contribResponse = await fetch(
        `https://api.github.com/repos/${owner}/${cleanRepo}/contributors?per_page=10`,
      );
      if (contribResponse.ok) {
        const contribJson = await contribResponse.json();
        setContributors(contribJson);
      }

      // Fetch releases
      const releasesResponse = await fetch(
        `https://api.github.com/repos/${owner}/${cleanRepo}/releases?per_page=5`,
      );
      if (releasesResponse.ok) {
        const releasesJson = await releasesResponse.json();
        const releasesWithDownloads = releasesJson.map((release: any) => ({
          ...release,
          download_count: release.assets.reduce(
            (sum: number, asset: any) => sum + asset.download_count,
            0,
          ),
        }));
        setReleases(releasesWithDownloads);
      }

      // Fetch issues
      const issuesResponse = await fetch(
        `https://api.github.com/repos/${owner}/${cleanRepo}/issues?state=open&per_page=10`,
      );
      if (issuesResponse.ok) {
        const issuesJson = await issuesResponse.json();
        const actualIssues = issuesJson.filter(
          (issue: any) => !issue.pull_request,
        );
        const prs = issuesJson.filter((issue: any) => issue.pull_request);
        setIssues(actualIssues);
        setPullRequests(prs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            GitHub Repository Integration
          </CardTitle>
          <CardDescription>
            Connect to any public GitHub repository to view stats, contributors,
            and activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter GitHub repository URL (e.g., https://github.com/facebook/react)"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && fetchRepoData()}
            />
            <Button onClick={fetchRepoData} disabled={loading || !repoUrl}>
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Connect"
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {repoData && (
        <>
          {/* Repository Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{repoData.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {repoData.description}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={repoData.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View on GitHub
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {formatNumber(repoData.stars_count)}
                    </p>
                    <p className="text-sm text-muted-foreground">Stars</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <GitFork className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {formatNumber(repoData.forks_count)}
                    </p>
                    <p className="text-sm text-muted-foreground">Forks</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {formatNumber(repoData.watchers_count)}
                    </p>
                    <p className="text-sm text-muted-foreground">Watchers</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {formatNumber(repoData.open_issues_count)}
                    </p>
                    <p className="text-sm text-muted-foreground">Open Issues</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {repoData.language && (
                  <Badge variant="outline">
                    <Code className="h-3 w-3 mr-1" />
                    {repoData.language}
                  </Badge>
                )}
                {repoData.license && (
                  <Badge variant="outline">
                    <Shield className="h-3 w-3 mr-1" />
                    {repoData.license.name}
                  </Badge>
                )}
                {repoData.topics.map((topic) => (
                  <Badge key={topic} variant="secondary">
                    {topic}
                  </Badge>
                ))}
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                <p>Created: {formatDate(repoData.created_at)}</p>
                <p>Last updated: {formatDate(repoData.updated_at)}</p>
                <p>Last push: {formatDate(repoData.pushed_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Tabs */}
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="contributors">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="contributors">Contributors</TabsTrigger>
                  <TabsTrigger value="releases">Releases</TabsTrigger>
                  <TabsTrigger value="issues">Issues</TabsTrigger>
                  <TabsTrigger value="pulls">Pull Requests</TabsTrigger>
                </TabsList>

                <TabsContent value="contributors" className="space-y-4 mt-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Top Contributors
                  </h3>
                  {contributors.map((contributor) => (
                    <div
                      key={contributor.login}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={contributor.avatar_url}
                          alt={contributor.login}
                          className="h-10 w-10 rounded-full"
                        />
                        <div>
                          <a
                            href={contributor.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline"
                          >
                            {contributor.login}
                          </a>
                          <p className="text-sm text-muted-foreground">
                            {contributor.contributions} contributions
                          </p>
                        </div>
                      </div>
                      <Progress
                        value={
                          (contributor.contributions /
                            contributors[0]?.contributions) *
                          100
                        }
                        className="w-32"
                      />
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="releases" className="space-y-4 mt-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Recent Releases
                  </h3>
                  {releases.length > 0 ? (
                    releases.map((release) => (
                      <div
                        key={release.tag_name}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <a
                            href={release.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline"
                          >
                            {release.name || release.tag_name}
                          </a>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(release.published_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {release.prerelease && (
                            <Badge variant="outline">Pre-release</Badge>
                          )}
                          <div className="flex items-center gap-1 text-sm">
                            <Download className="h-3 w-3" />
                            {formatNumber(release.download_count)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No releases found</p>
                  )}
                </TabsContent>

                <TabsContent value="issues" className="space-y-4 mt-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Open Issues
                  </h3>
                  {issues.length > 0 ? (
                    issues.map((issue) => (
                      <div
                        key={issue.number}
                        className="p-3 rounded-lg border space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <a
                            href={issue.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline flex-1"
                          >
                            #{issue.number} {issue.title}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <img
                            src={issue.user.avatar_url}
                            alt={issue.user.login}
                            className="h-4 w-4 rounded-full"
                          />
                          <span>{issue.user.login}</span>
                          <span>•</span>
                          <span>{formatDate(issue.created_at)}</span>
                        </div>
                        {issue.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {issue.labels.map((label) => (
                              <Badge
                                key={label.name}
                                variant="outline"
                                style={{
                                  borderColor: `#${label.color}`,
                                  color: `#${label.color}`,
                                }}
                              >
                                {label.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No open issues</p>
                  )}
                </TabsContent>

                <TabsContent value="pulls" className="space-y-4 mt-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <GitPullRequest className="h-5 w-5" />
                    Open Pull Requests
                  </h3>
                  {pullRequests.length > 0 ? (
                    pullRequests.map((pr) => (
                      <div
                        key={pr.number}
                        className="p-3 rounded-lg border space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <a
                            href={pr.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline flex-1"
                          >
                            #{pr.number} {pr.title}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <img
                            src={pr.user.avatar_url}
                            alt={pr.user.login}
                            className="h-4 w-4 rounded-full"
                          />
                          <span>{pr.user.login}</span>
                          <span>•</span>
                          <span>{formatDate(pr.created_at)}</span>
                        </div>
                        {pr.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {pr.labels.map((label) => (
                              <Badge
                                key={label.name}
                                variant="outline"
                                style={{
                                  borderColor: `#${label.color}`,
                                  color: `#${label.color}`,
                                }}
                              >
                                {label.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">
                      No open pull requests
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
