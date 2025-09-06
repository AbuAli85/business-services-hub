"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface StepperProps {
  steps: {
    id: number
    title: string
    description: string
    isCompleted: boolean
    isActive: boolean
  }[]
  className?: string
}

export function Stepper({ steps, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn("mb-8", className)}>
      <ol className="flex items-center justify-between">
        {steps.map((step, stepIdx) => (
          <li key={step.id} className={cn(
            "relative flex-1",
            stepIdx !== steps.length - 1 && "pr-8 sm:pr-20"
          )}>
            {/* Connector line */}
            {stepIdx !== steps.length - 1 && (
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className={cn(
                  "h-0.5 w-full transition-colors duration-200",
                  step.isCompleted ? "bg-blue-600" : "bg-gray-200"
                )} />
              </div>
            )}
            
            {/* Step content */}
            <div className="relative flex items-start">
              <span className="flex h-9 items-center">
                <span className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200",
                  step.isCompleted
                    ? "border-blue-600 bg-blue-600 text-white"
                    : step.isActive
                    ? "border-blue-600 bg-white text-blue-600 ring-2 ring-blue-600 ring-offset-2"
                    : "border-gray-300 bg-white text-gray-500"
                )}>
                  {step.isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </span>
              </span>
              <span className="ml-4 flex min-w-0 flex-col">
                <span className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  step.isActive ? "text-blue-600" : step.isCompleted ? "text-gray-900" : "text-gray-500"
                )}>
                  {step.title}
                </span>
                <span className="text-sm text-gray-500">{step.description}</span>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}
