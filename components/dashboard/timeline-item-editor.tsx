'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TimelineItem } from '@/lib/timeline-service';
import { 
  Save, 
  X, 
  Calendar,
  User,
  Target,
  Clock
} from 'lucide-react';

interface TimelineItemEditorProps {
  item: TimelineItem;
  onSave: (updates: Partial<TimelineItem>) => void;
  onCancel: () => void;
}

export default function TimelineItemEditor({
  item,
  onSave,
  onCancel
}: TimelineItemEditorProps) {
  const [editedItem, setEditedItem] = useState<TimelineItem>(item);

  const handleSave = () => {
    onSave(editedItem);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="w-5 h-5" />
          <span>Edit Timeline Item</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={editedItem.title}
              onChange={(e) => setEditedItem({...editedItem, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Timeline item title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={editedItem.description}
              onChange={(e) => setEditedItem({...editedItem, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              aria-label="Timeline item description"
            />
          </div>
        </div>

        {/* Status and Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={editedItem.status}
              onChange={(e) => setEditedItem({...editedItem, status: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Timeline item status"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={editedItem.priority}
              onChange={(e) => setEditedItem({...editedItem, priority: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Timeline item priority"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={editedItem.start_date}
              onChange={(e) => setEditedItem({...editedItem, start_date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Timeline item start date"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={editedItem.end_date}
              onChange={(e) => setEditedItem({...editedItem, end_date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Timeline item end date"
            />
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Progress Percentage
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="100"
              value={editedItem.progress_percentage}
              onChange={(e) => setEditedItem({...editedItem, progress_percentage: parseInt(e.target.value)})}
              className="w-full"
              aria-label="Timeline item progress percentage"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>0%</span>
              <span className="font-bold text-blue-600">{editedItem.progress_percentage}%</span>
              <span>100%</span>
            </div>
          </div>
          <Progress value={editedItem.progress_percentage} className="h-2" />
        </div>

        {/* Assigned To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assigned To (Optional)
          </label>
          <input
            type="text"
            value={editedItem.assigned_to || ''}
            onChange={(e) => setEditedItem({...editedItem, assigned_to: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter assignee name or email"
            aria-label="Timeline item assigned to"
          />
        </div>

        {/* Preview */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Preview</h4>
          <div className="flex items-center space-x-2 mb-2">
            <Badge className={getStatusColor(editedItem.status)}>
              {editedItem.status.replace('_', ' ')}
            </Badge>
            <Badge className={getPriorityColor(editedItem.priority)}>
              {editedItem.priority}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{editedItem.description}</p>
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(editedItem.start_date).toLocaleDateString()}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(editedItem.end_date).toLocaleDateString()}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Target className="w-3 h-3" />
              <span>{editedItem.progress_percentage}%</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
