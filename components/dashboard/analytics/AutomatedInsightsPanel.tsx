'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  CheckCircle, 
  Info,
  Loader2,
  Sparkles,
  BarChart3,
  Users,
  DollarSign,
  Clock,
  Bell,
  Settings,
  Eye,
  Zap
} from 'lucide-react';

interface Insight {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  summary: string;
  recommendation: string;
  confidence_score: number;
  is_resolved: boolean;
  created_at: string;
}

interface AutomationStats {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  avg_duration_ms: number;
  total_insights_generated: number;
  last_run_at: string;
  last_run_status: string;
  success_rate: number;
}

interface RecentInsightsResponse {
  insights: Insight[];
  automation_stats: AutomationStats;
  notification_stats: {
    total_notifications: number;
    sent_notifications: number;
    failed_notifications: number;
    success_rate: number;
  };
  metadata: {
    hours_back: number;
    fetched_at: string;
  };
}

const AutomatedInsightsPanel: React.FC = () => {
  const [data, setData] = useState<RecentInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [showLogs, setShowLogs] = useState(false);

  const fetchRecentInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/insights/recent?hours=24&minSeverity=medium');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError('Failed to fetch recent insights');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force_regenerate: true }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Insights generated:', result);
      
      // Refresh insights after generation
      await fetchRecentInsights();
    } catch (err) {
      setError('Failed to generate insights');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const triggerNotifications = async () => {
    setNotifying(true);
    try {
      const response = await fetch('/api/insights/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          hours_back: 24,
          min_severity: 'high',
          test_mode: false
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Notifications triggered:', result);
      
      // Refresh data after notification
      await fetchRecentInsights();
    } catch (err) {
      setError('Failed to trigger notifications');
      console.error(err);
    } finally {
      setNotifying(false);
    }
  };

  useEffect(() => {
    fetchRecentInsights();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchRecentInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <TrendingDown className="h-4 w-4" />;
      case 'medium': return <Info className="h-4 w-4" />;
      case 'low': return <TrendingUp className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking_slowdown': return <TrendingDown className="h-4 w-4" />;
      case 'booking_spike': return <TrendingUp className="h-4 w-4" />;
      case 'revenue_anomaly': return <DollarSign className="h-4 w-4" />;
      case 'provider_overload': return <Users className="h-4 w-4" />;
      case 'milestone_delay': return <BarChart3 className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const formatLastRun = (lastRunAt: string) => {
    if (!lastRunAt) return 'Never';
    const date = new Date(lastRunAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  };

  const filteredInsights = data?.insights.filter(insight => 
    filter === 'all' || insight.severity === filter
  ) || [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Automated Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading automated insights...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Automation Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {data?.automation_stats.success_rate || 0}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
              <div className="text-xs text-gray-500 mt-1">
                {data?.automation_stats.total_runs || 0} total runs
              </div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {data?.automation_stats.total_insights_generated || 0}
              </div>
              <div className="text-sm text-gray-600">Insights Generated</div>
              <div className="text-xs text-gray-500 mt-1">
                Last run: {formatLastRun(data?.automation_stats.last_run_at || '')}
              </div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {data?.notification_stats.success_rate || 0}%
              </div>
              <div className="text-sm text-gray-600">Notification Rate</div>
              <div className="text-xs text-gray-500 mt-1">
                {data?.notification_stats.sent_notifications || 0} sent
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Insights Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Smart Insights
              {data?.insights.length ? (
                <Badge variant="outline" className="ml-2">
                  {data.insights.length}
                </Badge>
              ) : null}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={triggerNotifications}
                disabled={notifying}
                size="sm"
                variant="outline"
              >
                {notifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                {notifying ? 'Sending...' : 'Notify'}
              </Button>
              <Button
                onClick={generateInsights}
                disabled={generating}
                size="sm"
                variant="outline"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {generating ? 'Generating...' : 'Generate'}
              </Button>
              <Button
                onClick={() => setShowLogs(!showLogs)}
                size="sm"
                variant="outline"
              >
                <Eye className="h-4 w-4" />
                Logs
              </Button>
            </div>
          </div>
          
          {/* Filter buttons */}
          <div className="flex gap-2 mt-4">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((severity) => (
              <Button
                key={severity}
                onClick={() => setFilter(severity)}
                variant={filter === severity ? 'default' : 'outline'}
                size="sm"
                className="capitalize"
              >
                {severity}
                {data?.insights.filter(i => i.severity === severity).length ? (
                  <Badge variant="secondary" className="ml-1">
                    {data.insights.filter(i => i.severity === severity).length}
                  </Badge>
                ) : null}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {data?.metadata && (
            <div className="text-sm text-gray-500 mb-4">
              Last updated: {new Date(data.metadata.fetched_at).toLocaleString()}
              {data.automation_stats.last_run_at && (
                <span className="ml-4">
                  • Last automation run: {formatLastRun(data.automation_stats.last_run_at)}
                  <Badge 
                    variant={data.automation_stats.last_run_status === 'success' ? 'default' : 'destructive'}
                    className="ml-2"
                  >
                    {data.automation_stats.last_run_status || 'unknown'}
                  </Badge>
                </span>
              )}
            </div>
          )}

          {filteredInsights.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No insights available</h3>
              <p className="text-gray-500 mb-4">
                {filter === 'all' 
                  ? "Generate insights to see AI-powered recommendations and alerts."
                  : `No ${filter} severity insights found.`
                }
              </p>
              {filter === 'all' && (
                <Button onClick={generateInsights} disabled={generating}>
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  Generate Insights
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}

          {/* Summary Statistics */}
          {data?.insights && data.insights.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Insight Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Total Insights</div>
                  <div className="font-medium">{data.insights.length}</div>
                </div>
                <div>
                  <div className="text-gray-500">Critical</div>
                  <div className="font-medium text-red-600">
                    {data.insights.filter(i => i.severity === 'critical').length}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">High Priority</div>
                  <div className="font-medium text-orange-600">
                    {data.insights.filter(i => i.severity === 'high').length}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Avg Confidence</div>
                  <div className="font-medium">
                    {Math.round(
                      data.insights.reduce((sum, i) => sum + i.confidence_score, 0) / data.insights.length * 100
                    )}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Panel */}
      {showLogs && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Automation Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LogsViewer />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// InsightCard component (reused from previous implementation)
const InsightCard: React.FC<{ insight: Insight }> = ({ insight }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <TrendingDown className="h-4 w-4" />;
      case 'medium': return <Info className="h-4 w-4" />;
      case 'low': return <TrendingUp className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking_slowdown': return <TrendingDown className="h-4 w-4" />;
      case 'booking_spike': return <TrendingUp className="h-4 w-4" />;
      case 'revenue_anomaly': return <DollarSign className="h-4 w-4" />;
      case 'provider_overload': return <Users className="h-4 w-4" />;
      case 'milestone_delay': return <BarChart3 className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {getTypeIcon(insight.type)}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{insight.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getSeverityColor(insight.severity)}>
                {getSeverityIcon(insight.severity)}
                <span className="ml-1 capitalize">{insight.severity}</span>
              </Badge>
              <Badge variant="outline" className="text-xs">
                {Math.round(insight.confidence_score * 100)}% confidence
              </Badge>
            </div>
          </div>
        </div>
        {insight.is_resolved && (
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
        )}
      </div>
      
      <p className="text-gray-700 mb-3">{insight.summary}</p>
      
      {insight.recommendation && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-blue-900 mb-1">Recommendation</div>
              <div className="text-sm text-blue-800">{insight.recommendation}</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="text-xs text-gray-500 mt-3">
        {new Date(insight.created_at).toLocaleString()}
      </div>
    </div>
  );
};

// LogsViewer component
const LogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/insights/logs?limit=20&days=7');
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs || []);
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) {
    return <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div className="flex items-center gap-3">
            <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
              {log.status}
            </Badge>
            <span className="text-sm">
              {log.total_insights} insights generated
            </span>
            <span className="text-xs text-gray-500">
              {log.duration_ms}ms
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(log.run_at).toLocaleString()}
          </span>
        </div>
      ))}
      {logs.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No logs available
        </div>
      )}
    </div>
  );
};

export default AutomatedInsightsPanel;
