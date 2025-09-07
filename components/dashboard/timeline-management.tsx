'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Edit3, 
  Trash2, 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Save, 
  X,
  Clock,
  Target,
  Calendar,
  User,
  CheckCircle2,
  Activity,
  AlertCircle
} from 'lucide-react';

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date: string;
  end_date: string;
  assigned_to?: string;
  progress_percentage: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface TimelineManagementProps {
  bookingId: string;
  initialTimeline: TimelineItem[];
  onTimelineUpdate: (timeline: TimelineItem[]) => void;
  onSave: (timeline: TimelineItem[]) => Promise<void>;
}

export default function TimelineManagement({
  bookingId,
  initialTimeline,
  onTimelineUpdate,
  onSave
}: TimelineManagementProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>(initialTimeline);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<TimelineItem>>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    start_date: '',
    end_date: '',
    progress_percentage: 0
  });

  // Track changes
  useEffect(() => {
    const hasChanges = JSON.stringify(timeline) !== JSON.stringify(initialTimeline);
    setHasChanges(hasChanges);
  }, [timeline, initialTimeline]);

  const handleEdit = (itemId: string) => {
    setEditingItem(itemId);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setTimeline(initialTimeline);
  };

  const handleSaveEdit = (itemId: string, updates: Partial<TimelineItem>) => {
    setTimeline(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, ...updates, updated_at: new Date().toISOString() }
        : item
    ));
    setEditingItem(null);
  };

  const handleDelete = (itemId: string) => {
    if (confirm('Are you sure you want to delete this timeline item?')) {
      setTimeline(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const handleMoveUp = (itemId: string) => {
    setTimeline(prev => {
      const items = [...prev];
      const index = items.findIndex(item => item.id === itemId);
      if (index > 0) {
        [items[index], items[index - 1]] = [items[index - 1], items[index]];
        // Update order_index
        items.forEach((item, idx) => {
          item.order_index = idx;
        });
      }
      return items;
    });
  };

  const handleMoveDown = (itemId: string) => {
    setTimeline(prev => {
      const items = [...prev];
      const index = items.findIndex(item => item.id === itemId);
      if (index < items.length - 1) {
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
        // Update order_index
        items.forEach((item, idx) => {
          item.order_index = idx;
        });
      }
      return items;
    });
  };

  const handleAddNew = () => {
    if (newItem.title && newItem.description) {
      const newTimelineItem: TimelineItem = {
        id: `temp_${Date.now()}`,
        title: newItem.title,
        description: newItem.description,
        status: newItem.status as TimelineItem['status'],
        priority: newItem.priority as TimelineItem['priority'],
        start_date: newItem.start_date || new Date().toISOString().split('T')[0],
        end_date: newItem.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress_percentage: newItem.progress_percentage || 0,
        order_index: timeline.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setTimeline(prev => [...prev, newTimelineItem]);
      setNewItem({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        start_date: '',
        end_date: '',
        progress_percentage: 0
      });
      setShowAddForm(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSave(timeline);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving timeline:', error);
    } finally {
      setIsSaving(false);
    }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Activity className="w-5 h-5 text-blue-600" />;
      case 'on_hold': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'pending': return <Clock className="w-5 h-5 text-gray-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Timeline</h2>
          <p className="text-gray-600">Manage your project milestones and timeline</p>
        </div>
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <Button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Timeline Item
          </Button>
        </div>
      </div>

      {/* Add New Timeline Item Form */}
      {showAddForm && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Add New Timeline Item</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newItem.title || ''}
                  onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter timeline item title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={newItem.priority || 'medium'}
                  onChange={(e) => setNewItem({...newItem, priority: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newItem.description || ''}
                onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Enter timeline item description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={newItem.status || 'pending'}
                  onChange={(e) => setNewItem({...newItem, status: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newItem.start_date || ''}
                  onChange={(e) => setNewItem({...newItem, start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={newItem.end_date || ''}
                  onChange={(e) => setNewItem({...newItem, end_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddNew}
                className="bg-green-600 hover:bg-green-700"
              >
                Add Item
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Items */}
      <div className="space-y-4">
        {timeline.map((item, index) => (
          <Card key={item.id} className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {index + 1}
                  </div>
                  <div>
                    <CardTitle className="text-xl group-hover:text-purple-600 transition-colors duration-200">
                      {item.title}
                    </CardTitle>
                    <p className="text-gray-600 mt-1">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(item.status)}
                  <Badge className={getStatusColor(item.status)}>
                    {item.status.replace('_', ' ')}
                  </Badge>
                  <Badge className={getPriorityColor(item.priority)}>
                    {item.priority}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Progress Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-lg font-bold text-gray-900">{item.progress_percentage}%</span>
                </div>
                <Progress value={item.progress_percentage} className="h-3" />
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {new Date(item.start_date).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-600">Start Date</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {new Date(item.end_date).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-600">End Date</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {item.progress_percentage}%
                  </div>
                  <div className="text-xs text-gray-600">Complete</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {item.priority}
                  </div>
                  <div className="text-xs text-gray-600">Priority</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMoveUp(item.id)}
                    disabled={index === 0}
                    className="hover:bg-gray-50"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMoveDown(item.id)}
                    disabled={index === timeline.length - 1}
                    className="hover:bg-gray-50"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(item.id)}
                    className="hover:bg-blue-50"
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(item.id)}
                    className="hover:bg-red-50 text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {timeline.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Timeline Items</h3>
            <p className="text-gray-600 mb-4">Start by adding your first project timeline item</p>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Item
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
