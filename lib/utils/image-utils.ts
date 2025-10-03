/**
 * Utility functions for image handling and optimization
 */

/**
 * Get optimized image URL from Supabase storage
 * @param url - Original image URL
 * @param width - Desired width
 * @param height - Desired height
 * @param quality - Image quality (1-100)
 */
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  height?: number,
  quality: number = 75
): string {
  if (!url) return ''
  
  // If it's a Supabase storage URL, we can add transformation parameters
  if (url.includes('supabase.co/storage')) {
    const params = new URLSearchParams()
    if (width) params.append('width', width.toString())
    if (height) params.append('height', height.toString())
    params.append('quality', quality.toString())
    
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${params.toString()}`
  }
  
  // For other URLs, return as-is
  return url
}

/**
 * Get image dimensions from URL or fallback to defaults
 */
export function getImageDimensions(url: string): { width: number; height: number } {
  // You could implement actual dimension detection here
  // For now, return reasonable defaults
  return { width: 400, height: 300 }
}

/**
 * Check if URL is a valid image
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif']
  const urlLower = url.toLowerCase()
  
  return imageExtensions.some(ext => urlLower.includes(ext)) || url.startsWith('data:image')
}

/**
 * Generate placeholder image URL
 */
export function getPlaceholderImage(text?: string, width: number = 400, height: number = 300): string {
  const bgColor = '94a3b8' // gray-400
  const textColor = 'ffffff'
  const displayText = text || 'Image'
  
  return `https://via.placeholder.com/${width}x${height}/${bgColor}/${textColor}?text=${encodeURIComponent(displayText)}`
}

/**
 * Convert image to base64
 */
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

/**
 * Compress image file
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    
    reader.onload = (event) => {
      const img = new window.Image()
      img.src = event.target?.result as string
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          file.type,
          quality
        )
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
  })
}

export default {
  getOptimizedImageUrl,
  getImageDimensions,
  isValidImageUrl,
  getPlaceholderImage,
  imageToBase64,
  compressImage,
}

