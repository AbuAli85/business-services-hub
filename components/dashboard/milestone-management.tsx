'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Target, Plus, Edit3, Trash2 } from 'lucide-react'
import { Milestone } from '@/types/progress'

interface MilestoneManagementProps {
  milestones: Milestone[]
  onMilestoneUpdate: (milestoneId: string, updates: Partial<Milestone>) => void
  onMilestoneCreate: (milestone: Omit<Milestone, 'id' | 'created_at' | 'updated_at'>) => void
  onMilestoneDelete: (milestoneId: string) => void
  userRole: 'provider' | 'client'
}

export function MilestoneManagement({
  milestones,
  onMilestoneUpdate,
  onMilestoneCreate,
  onMilestoneDelete,
  userRole
}: MilestoneManagementProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Milestone Management
          </span>
          {userRole === 'provider' && (
            <Button
              onClick={() => setShowCreateForm(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {milestones.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No milestones created yet</p>
              {userRole === 'provider' && (
                <p className="text-sm">Click "Add Milestone" to get started</p>
              )}
            </div>
          ) : (
            milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{milestone.title}</h3>
                  <p className="text-sm text-gray-600">{milestone.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{milestone.status}</Badge>
                    <span className="text-sm text-gray-500">
                      {milestone.progress}% complete
                    </span>
                  </div>
                </div>
                {userRole === 'provider' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMilestoneUpdate(milestone.id, { status: 'in_progress' })}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMilestoneDelete(milestone.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}