'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle, 
  PauseCircle, 
  Square, 
  Timer,
  Clock,
  Zap,
  Target
} from 'lucide-react';

interface ProgressTimerProps {
  onTimeLog: (hours: number, description: string) => void;
  currentTask?: {
    id: string;
    title: string;
    description: string;
  };
}

export default function ProgressTimer({ onTimeLog, currentTask }: ProgressTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [description, setDescription] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    if (time > 0) {
      const hours = time / 3600;
      onTimeLog(hours, description || 'Timer session');
      setTime(0);
      setDescription('');
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    setDescription('');
  };

  const hours = time / 3600;
  const progress = Math.min((time % 3600) / 3600, 1) * 100;

  return (
    <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Timer className="w-5 h-5 text-purple-600" />
          <span>Time Tracker</span>
          {currentTask && (
            <Badge variant="outline" className="ml-auto">
              <Target className="w-3 h-3 mr-1" />
              {currentTask.title}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timer Display */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="text-6xl font-mono font-bold text-purple-600 mb-2">
              {formatTime(time)}
            </div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
          
          {hours > 0 && (
            <div className="text-sm text-gray-600">
              {hours.toFixed(2)} hours logged
            </div>
          )}
        </div>

        {/* Description Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            What are you working on?
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isRunning}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center space-x-3">
          {!isRunning ? (
            <Button
              onClick={handleStart}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 text-lg"
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              Start
            </Button>
          ) : (
            <Button
              onClick={handlePause}
              className="bg-yellow-600 hover:bg-yellow-700 px-6 py-3 text-lg"
            >
              <PauseCircle className="w-5 h-5 mr-2" />
              Pause
            </Button>
          )}
          
          {time > 0 && (
            <Button
              onClick={handleStop}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 text-lg"
            >
              <Square className="w-5 h-5 mr-2" />
              Log Time
            </Button>
          )}
          
          <Button
            onClick={handleReset}
            variant="outline"
            className="px-6 py-3 text-lg"
          >
            Reset
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTimeLog(0.25, 'Quick 15min session')}
            className="text-xs"
          >
            +15min
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTimeLog(0.5, 'Quick 30min session')}
            className="text-xs"
          >
            +30min
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTimeLog(1, 'Quick 1hr session')}
            className="text-xs"
          >
            +1hr
          </Button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center space-x-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-gray-600">
            {isRunning ? 'Timer running...' : 'Timer stopped'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
