'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface FallbackImageProps {
  src: string
  alt: string
  fill?: boolean
  width?: number
  height?: number
  className?: string
  sizes?: string
  priority?: boolean
  fallbackSrc?: string
  onError?: () => void
}

export function FallbackImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className,
  sizes,
  priority = false,
  fallbackSrc = '/images/service-placeholder.jpg',
  onError,
  ...props
}: FallbackImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    if (!hasError) {
      setHasError(true)
      setImgSrc(fallbackSrc)
      onError?.()
    }
  }

  // If we have an error and no fallback, show a placeholder div
  if (hasError && imgSrc === fallbackSrc) {
    return (
      <div 
        className={cn(
          "bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center",
          fill ? "absolute inset-0" : "",
          className
        )}
        style={!fill ? { width, height } : undefined}
      >
        <div className="text-center text-gray-500">
          <svg 
            className="mx-auto h-12 w-12 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
          <p className="mt-2 text-xs">Image unavailable</p>
        </div>
      </div>
    )
  }

  const imageProps = {
    src: imgSrc,
    alt,
    className: cn("object-cover", className),
    sizes,
    priority,
    onError: handleError,
    ...props
  }

  if (fill) {
    return <Image fill {...imageProps} />
  }

  return (
    <Image 
      width={width} 
      height={height} 
      {...imageProps} 
    />
  )
}
