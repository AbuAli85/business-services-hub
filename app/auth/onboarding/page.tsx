'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function OnboardingForm() {
  const [step, setStep] = useState(1)
  
  console.log('🔍 Minimal component rendering, step:', step)
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-8">Minimal Test Component</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Step: {step}</h2>
        
        <div className="space-y-4">
          <button
            onClick={() => {
              alert('MINIMAL BUTTON 1 CLICKED!')
              setStep(2)
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            MINIMAL BUTTON 1
          </button>
          
          <button
            onClick={() => {
              alert('MINIMAL BUTTON 2 CLICKED!')
              setStep(3)
            }}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            MINIMAL BUTTON 2
          </button>
          
          <div
            onClick={() => {
              alert('MINIMAL DIV CLICKED!')
              setStep(1)
            }}
            className="bg-yellow-400 text-black px-4 py-2 rounded cursor-pointer"
          >
            MINIMAL DIV
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <button 
        onClick={() => {
          alert('SIMPLE BUTTON WORKS!')
          console.log('Simple button clicked!')
        }}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        SIMPLE TEST BUTTON
      </button>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      }>
        <OnboardingForm />
      </Suspense>
    </div>
  )
}