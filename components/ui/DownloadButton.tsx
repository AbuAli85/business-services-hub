'use client'

import React, { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface DownloadButtonProps {
  onDownload: () => Promise<void>
  children?: React.ReactNode
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  disabled?: boolean
}

export function DownloadButton({
  onDownload,
  children = 'Download PDF',
  className,
  variant = 'default',
  size = 'default',
  disabled = false
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (isDownloading || disabled) return

    try {
      setIsDownloading(true)
      await onDownload()
    } catch (error) {
      console.error('Download failed:', error)
      toast.error('Failed to download PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={disabled || isDownloading}
      variant={variant}
      size={size}
      className={cn(
        'flex items-center gap-2',
        className
      )}
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isDownloading ? 'Downloading...' : children}
    </Button>
  )
}

// Specialized component for invoice PDF download
interface InvoiceDownloadButtonProps {
  invoiceId: string
  invoiceNumber?: string
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function InvoiceDownloadButton({
  invoiceId,
  invoiceNumber,
  className,
  variant = 'default',
  size = 'default'
}: InvoiceDownloadButtonProps) {
  const handleDownload = async () => {
    try {
      console.log('📄 Downloading PDF for invoice:', invoiceId, invoiceNumber)
      
      const response = await fetch('/api/invoices/generate-template-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId })
      })

      console.log('📊 PDF generation response status:', response.status)

      if (response.ok) {
        const blob = await response.blob()
        console.log('✅ PDF blob created, size:', blob.size, 'bytes')
        
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${invoiceNumber || invoiceId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast.success('Invoice downloaded successfully')
      } else {
        const errorData = await response.json()
        console.error('❌ PDF generation error:', errorData)
        throw new Error(errorData.error || 'Failed to generate PDF')
      }
    } catch (error) {
      console.error('❌ Download error:', error)
      throw error
    }
  }

  return (
    <DownloadButton
      onDownload={handleDownload}
      className={className}
      variant={variant}
      size={size}
    />
  )
}
