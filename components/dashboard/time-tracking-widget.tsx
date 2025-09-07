'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Play, Pause, Square } from 'lucide-react'

interface TimeTrackingWidgetProps {
  onTimeLog: (duration: number, description: string) => void
  userRole: 'provider' | 'client'
}

export function TimeTrackingWidget({ onTimeLog, userRole }: TimeTrackingWidgetProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [duration, setDuration] = useState(0)
  const [description, setDescription] = useState('')

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleStop = () => {
    setIsRunning(false)
    if (duration > 0) {
      onTimeLog(duration, description || 'Time logged')
      setDuration(0)
      setDescription('')
    }
  }

  const handleReset = () => {
    setIsRunning(false)
    setDuration(0)
    setDescription('')
  }

  if (userRole !== 'provider') {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-blue-600">
              {formatTime(duration)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {isRunning ? 'Running...' : 'Stopped'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you working on?"
              className="w-full px-3 py-2 border rounded-md text-sm"
              disabled={isRunning}
            />
          </div>

          <div className="flex items-center justify-center gap-2">
            {!isRunning ? (
              <Button
                onClick={handleStart}
                className="bg-green-600 hover:bg-green-700"
                disabled={duration > 0 && !description.trim()}
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            ) : (
              <Button
                onClick={handlePause}
                variant="outline"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}

            {duration > 0 && (
              <>
                <Button
                  onClick={handleStop}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Log Time
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                >
                  Reset
                </Button>
              </>
            )}
          </div>

          {duration > 0 && (
            <div className="text-center">
              <Badge variant="outline">
                {Math.floor(duration / 60)} minutes logged
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}