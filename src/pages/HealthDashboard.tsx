/**
 * Health Dashboard Page
 * Full-page view for system monitoring
 */

import React from 'react';
import SystemHealthDashboard from '../components/SystemHealthDashboard';
import { ArrowLeft, Settings, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HealthDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  
  const exportHealthReport = async () => {
    try {
      // Get current health data
      const response = await fetch('/api/health');
      const data = await response.json();
      
      // Create downloadable report
      const report = {
        timestamp: new Date().toISOString(),
        system: 'Abba AI Builder',
        version: '1.0.0',
        ...data
      };
      
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-report-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <div className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">System Health Monitor</h1>
                <p className="text-xs text-muted-foreground">Real-time enterprise monitoring</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={exportHealthReport}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Export report"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <SystemHealthDashboard />
        
        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-2">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:opacity-90">
                Run Full System Scan
              </button>
              <button className="w-full px-4 py-2 text-sm border rounded hover:bg-accent">
                Clear Cache
              </button>
              <button className="w-full px-4 py-2 text-sm border rounded hover:bg-accent">
                Optimize Performance
              </button>
            </div>
          </div>
          
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-2">System Info</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version:</span>
                <span className="font-mono">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Node:</span>
                <span className="font-mono">{process.versions.node}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Electron:</span>
                <span className="font-mono">{process.versions.electron}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chrome:</span>
                <span className="font-mono">{process.versions.chrome}</span>
              </div>
            </div>
          </div>
          
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-2">Resources</h3>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-primary hover:underline">
                Documentation →
              </a>
              <a href="#" className="block text-primary hover:underline">
                Troubleshooting Guide →
              </a>
              <a href="#" className="block text-primary hover:underline">
                Performance Tips →
              </a>
              <a href="#" className="block text-primary hover:underline">
                Contact Support →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthDashboardPage;
