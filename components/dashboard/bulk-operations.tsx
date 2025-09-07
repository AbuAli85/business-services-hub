'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react'
import { Milestone } from '@/types/progress'

interface BulkOperationsProps {
  milestones: Milestone[]
  onBulkUpdate: (milestoneIds: string[], updates: Partial<Milestone>) => void
  onBulkDelete: (milestoneIds: string[]) => void
  userRole: 'provider' | 'client'
}

export function BulkOperations({
  milestones,
  onBulkUpdate,
  onBulkDelete,
  userRole
}: BulkOperationsProps) {
  const [selectedMilestones, setSelectedMilestones] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<string>('')

  const handleSelectAll = () => {
    if (selectedMilestones.length === milestones.length) {
      setSelectedMilestones([])
    } else {
      setSelectedMilestones(milestones.map(m => m.id))
    }
  }

  const handleSelectMilestone = (milestoneId: string) => {
    setSelectedMilestones(prev => 
      prev.includes(milestoneId) 
        ? prev.filter(id => id !== milestoneId)
        : [...prev, milestoneId]
    )
  }

  const handleBulkAction = () => {
    if (selectedMilestones.length === 0 || !bulkAction) return

    switch (bulkAction) {
      case 'mark_completed':
        onBulkUpdate(selectedMilestones, { status: 'completed' })
        break
      case 'mark_in_progress':
        onBulkUpdate(selectedMilestones, { status: 'in_progress' })
        break
      case 'mark_pending':
        onBulkUpdate(selectedMilestones, { status: 'not_started' })
        break
      case 'delete':
        onBulkDelete(selectedMilestones)
        break
    }

    setSelectedMilestones([])
    setBulkAction('')
  }

  if (userRole !== 'provider') {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Bulk Operations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedMilestones.length === milestones.length && milestones.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">
                Select All ({selectedMilestones.length}/{milestones.length})
              </span>
            </div>
            {selectedMilestones.length > 0 && (
              <Badge variant="outline">
                {selectedMilestones.length} selected
              </Badge>
            )}
          </div>

          {/* Milestone List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedMilestones.includes(milestone.id)}
                  onChange={() => handleSelectMilestone(milestone.id)}
                  className="w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{milestone.title}</div>
                  <div className="text-xs text-gray-500">{milestone.status}</div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {milestone.progress}%
                </Badge>
              </div>
            ))}
          </div>

          {/* Bulk Actions */}
          {selectedMilestones.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mark_completed">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Mark as Completed
                      </div>
                    </SelectItem>
                    <SelectItem value="mark_in_progress">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        Mark as In Progress
                      </div>
                    </SelectItem>
                    <SelectItem value="mark_pending">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-gray-600" />
                        Mark as Pending
                      </div>
                    </SelectItem>
                    <SelectItem value="delete">
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-red-600" />
                        Delete Selected
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}