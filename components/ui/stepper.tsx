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
    <nav aria-label="Progress" className={cn("mb-10", className)}>
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
                  "h-1 w-full transition-all duration-300 rounded-full",
                  step.isCompleted 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600" 
                    : step.isActive
                    ? "bg-gradient-to-r from-blue-300 to-indigo-300"
                    : "bg-slate-200"
                )} />
              </div>
            )}
            
            {/* Step content */}
            <div className="relative flex items-start">
              <span className="flex h-12 items-center">
                <span className={cn(
                  "relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-all duration-300 shadow-lg",
                  step.isCompleted
                    ? "border-blue-600 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-200"
                    : step.isActive
                    ? "border-blue-600 bg-white text-blue-600 ring-4 ring-blue-100 shadow-blue-100"
                    : "border-slate-300 bg-white text-slate-500 shadow-slate-100"
                )}>
                  {step.isCompleted ? (
                    <Check className="h-6 w-6" />
                  ) : (
                    <span className="text-lg font-bold">{step.id}</span>
                  )}
                </span>
              </span>
              <div className="ml-4 flex min-w-0 flex-col">
                <span className={cn(
                  "text-base font-semibold transition-colors duration-300",
                  step.isActive 
                    ? "text-blue-600" 
                    : step.isCompleted 
                    ? "text-slate-900" 
                    : "text-slate-500"
                )}>
                  {step.title}
                </span>
                <span className={cn(
                  "text-sm transition-colors duration-300",
                  step.isActive 
                    ? "text-blue-500" 
                    : step.isCompleted 
                    ? "text-slate-600" 
                    : "text-slate-400"
                )}>
                  {step.description}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}
