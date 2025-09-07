import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function MonitoringDashboard() {
  const [errors, setErrors] = useState<Array<{ id: number; error: string; context: string | null; resolved: number; created_at: number }>>([]);
  const [analytics, setAnalytics] = useState<{ totalErrors: number; unresolvedErrors: number; errorsToday: number; last24h: number } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const errs = await (window as any).electron.invoke('learning:get-errors', 100);
        setErrors(Array.isArray(errs) ? errs : []);
        const a = await (window as any).electron.invoke('learning:get-analytics');
        setAnalytics(a);
      } catch (e) {
        console.error('Failed to load monitoring data', e);
      }
    }
    load();
  }, []);

  const resolved = errors.filter(e => e.resolved).length;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">System Health (Using Existing Learning System)</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle>Errors Today</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{analytics?.errorsToday ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Unresolved</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{analytics?.unresolvedErrors ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Last 24h</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{analytics?.last24h ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Logged</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{analytics?.totalErrors ?? 0}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Errors</CardTitle></CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <div className="text-sm text-muted-foreground">No errors logged yet.</div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {errors.map(err => (
                <div key={err.id} className="p-3 rounded border">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">#{err.id} • {new Date((err.created_at || 0) * 1000).toLocaleString()}</div>
                    <div className="text-xs">{err.resolved ? 'Resolved' : 'Unresolved'}</div>
                  </div>
                  <pre className="text-xs whitespace-pre-wrap mt-2">{err.error}</pre>
                  {err.context && (
                    <pre className="text-xs whitespace-pre-wrap bg-muted mt-2 p-2 rounded">{err.context}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

