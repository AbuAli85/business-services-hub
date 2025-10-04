/**
 * Documents Tab Component
 * Manages project documents and files
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Upload, Download } from 'lucide-react'

interface DocumentsTabProps {
  bookingId: string
}

export function DocumentsTab({ bookingId }: DocumentsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Documents</CardTitle>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No documents yet</p>
              <p className="text-sm">Upload documents to share with your team</p>
              <Button className="mt-4" variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload First Document
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

