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
  DollarSign
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

interface InsightsResponse {
  insights: Insight[];
  metadata: {
    total: number;
    severity_counts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    type_counts: Record<string, number>;
    generated_at: string;
  };
  analytics: {
    recent_anomalies: any[];
    revenue_forecast: any[];
  };
}

const SmartInsightsPanel: React.FC = () => {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/insights?limit=20');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setInsights(data);
    } catch (err) {
      setError('Failed to fetch insights');
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
      await fetchInsights();
    } catch (err) {
      setError('Failed to generate insights');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchInsights();
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

  const filteredInsights = insights?.insights.filter(insight => 
    filter === 'all' || insight.severity === filter
  ) || [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Smart Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading insights...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Smart Insights
            {insights?.metadata.total ? (
              <Badge variant="outline" className="ml-2">
                {insights.metadata.total}
              </Badge>
            ) : null}
          </CardTitle>
          <div className="flex gap-2">
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
              {insights?.metadata.severity_counts[severity as keyof typeof insights.metadata.severity_counts] ? (
                <Badge variant="secondary" className="ml-1">
                  {insights.metadata.severity_counts[severity as keyof typeof insights.metadata.severity_counts]}
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

        {insights?.metadata.generated_at && (
          <div className="text-sm text-gray-500 mb-4">
            Last updated: {new Date(insights.metadata.generated_at).toLocaleString()}
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
        {insights?.metadata && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Insight Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Total Insights</div>
                <div className="font-medium">{insights.metadata.total}</div>
              </div>
              <div>
                <div className="text-gray-500">Critical</div>
                <div className="font-medium text-red-600">{insights.metadata.severity_counts.critical}</div>
              </div>
              <div>
                <div className="text-gray-500">High Priority</div>
                <div className="font-medium text-orange-600">{insights.metadata.severity_counts.high}</div>
              </div>
              <div>
                <div className="text-gray-500">Confidence</div>
                <div className="font-medium">
                  {insights.insights.length > 0 
                    ? Math.round(insights.insights.reduce((sum, i) => sum + i.confidence_score, 0) / insights.insights.length * 100)
                    : 0}%
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// InsightCard component
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

export default SmartInsightsPanel;
