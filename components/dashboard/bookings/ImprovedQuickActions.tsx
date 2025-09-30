'use client'

import { Button } from '@/components/ui/button'
import { 
  Eye, 
  FileText, 
  CheckCircle, 
  Play, 
  MessageSquare,
  Download,
  Edit,
  Calendar,
  DollarSign,
  Send,
  CreditCard
} from 'lucide-react'

export interface ImprovedQuickActionsProps {
  bookingId: string
  onAction: (action: string) => void
  userRole?: 'client' | 'provider' | 'admin'
  status?: string
  approvalStatus?: string
  hasInvoice?: boolean
  invoiceStatus?: string
}

export function ImprovedQuickActions({ 
  bookingId, 
  onAction, 
  userRole = 'client',
  status = 'pending',
  approvalStatus,
  hasInvoice = false,
  invoiceStatus
}: ImprovedQuickActionsProps) {
  
  // Determine available actions based on role and status
  const getAvailableActions = () => {
    const actions = []
    
    // Note: View Details is triggered by the card-level Eye button.
    // Avoid duplicating it here to prevent two "View Details" entries.
    
    // Role-specific actions
    switch (userRole) {
      case 'admin':
        // Admin can do everything
        if (status === 'pending' || approvalStatus === 'pending') {
          actions.push({
            key: 'approve',
            label: 'Approve',
            icon: CheckCircle,
            variant: 'default' as const
          })
        }
        
        if (status === 'approved' && !hasInvoice) {
          actions.push({
            key: 'create_invoice',
            label: 'Create Invoice',
            icon: FileText,
            variant: 'default' as const
          })
        }
        
        if (hasInvoice && invoiceStatus === 'draft') {
          actions.push({
            key: 'send_invoice',
            label: 'Send Invoice',
            icon: Send,
            variant: 'default' as const
          })
        }
        
        if (hasInvoice && invoiceStatus === 'issued') {
          actions.push({
            key: 'mark_paid',
            label: 'Mark Paid',
            icon: CreditCard,
            variant: 'default' as const
          })
        }
        
        if (status === 'approved' || status === 'in_progress') {
          actions.push({
            key: 'start_work',
            label: 'Start Work',
            icon: Play,
            variant: 'default' as const
          })
        }
        
        actions.push({
          key: 'edit',
          label: 'Edit',
          icon: Edit,
          variant: 'outline' as const
        })
        break
        
      case 'provider':
        // Provider actions
        if (status === 'pending' || approvalStatus === 'pending') {
          actions.push({
            key: 'approve',
            label: 'Approve',
            icon: CheckCircle,
            variant: 'default' as const
          })
        }
        
        if (status === 'approved' && !hasInvoice) {
          actions.push({
            key: 'create_invoice',
            label: 'Create Invoice',
            icon: FileText,
            variant: 'default' as const
          })
        }
        
        if (hasInvoice && invoiceStatus === 'draft') {
          actions.push({
            key: 'send_invoice',
            label: 'Send Invoice',
            icon: Send,
            variant: 'default' as const
          })
        }
        
        if (status === 'approved' || status === 'in_progress') {
          actions.push({
            key: 'update_progress',
            label: 'Update Progress',
            icon: Play,
            variant: 'outline' as const
          })
        }
        break
        
      case 'client':
        // Client actions
        if (hasInvoice && invoiceStatus === 'issued') {
          actions.push({
            key: 'pay_invoice',
            label: 'Pay Invoice',
            icon: DollarSign,
            variant: 'default' as const
          })
        }
        
        if (hasInvoice) {
          actions.push({
            key: 'view_invoice',
            label: 'View Invoice',
            icon: FileText,
            variant: 'outline' as const
          })
        }
        
        if (status === 'pending') {
          actions.push({
            key: 'edit',
            label: 'Edit Request',
            icon: Edit,
            variant: 'outline' as const
          })
        }
        break
    }
    
    // Common actions for all roles
    actions.push({
      key: 'message',
      label: 'Message',
      icon: MessageSquare,
      variant: 'outline' as const
    })
    
    if (status === 'completed') {
      actions.push({
        key: 'download',
        label: 'Download',
        icon: Download,
        variant: 'outline' as const
      })
    }
    
    return actions
  }
  
  const actions = getAvailableActions()
  
  // Show only the most important actions (max 3-4)
  const primaryActions = actions.slice(0, 3)
  const hasMoreActions = actions.length > 3
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {primaryActions.map((action) => {
        const Icon = action.icon
        return (
          <Button
            key={action.key}
            variant={action.variant}
            size="sm"
            onClick={() => onAction(action.key)}
            className="h-8 px-3 text-xs"
          >
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            {action.label}
          </Button>
        )
      })}
      
      {hasMoreActions && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAction('more_actions')}
          className="h-8 px-3 text-xs"
        >
          More
        </Button>
      )}
    </div>
  )
}

export default ImprovedQuickActions
