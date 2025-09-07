'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { TimelineService, TimelineItem } from '@/lib/timeline-service';
import TimelineManagement from '@/components/dashboard/timeline-management';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Zap } from 'lucide-react';

export default function ProviderTimelinePage() {
  const params = useParams();
  const bookingId = params.id as string;
  
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadTimeline = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      
      setError(null);
      const data = await TimelineService.getTimeline(bookingId);
      setTimeline(data);
    } catch (err) {
      console.error('Error loading timeline:', err);
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      loadTimeline();
    }
  }, [bookingId]);

  const handleTimelineUpdate = (updatedTimeline: TimelineItem[]) => {
    setTimeline(updatedTimeline);
  };

  const handleSave = async (updatedTimeline: TimelineItem[]) => {
    try {
      await TimelineService.saveTimeline(bookingId, updatedTimeline);
      // Reload to get the updated data from server
      await loadTimeline(true);
    } catch (err) {
      console.error('Error saving timeline:', err);
      setError('Failed to save timeline changes');
      throw err;
    }
  };

  const handleRefresh = () => {
    loadTimeline(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Timeline</h3>
            <p className="text-gray-600">Please wait while we fetch your project timeline...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Timeline</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bookings
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="hover:bg-blue-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Project Timeline Management</h1>
              <p className="text-gray-600 mt-1">Manage your project milestones and timeline</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Real-time connected</span>
            </div>
          </div>
        </div>

        {/* Timeline Management */}
        <TimelineManagement
          bookingId={bookingId}
          initialTimeline={timeline}
          onTimelineUpdate={handleTimelineUpdate}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
