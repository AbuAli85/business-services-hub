'use client'

import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

export interface AmountDisplayProps {
  amount_cents?: number
  currency?: string
  status?: string
  invoice_status?: string
  compact?: boolean
  showStatus?: boolean
  className?: string
}

function formatAmount(amountCents?: number, currency = 'OMR'): string {
  if (!amountCents || amountCents === 0) {
    return `${currency} 0.00`
  }
  
  const amount = amountCents / 100
  
  // Format based on currency
  switch (currency.toUpperCase()) {
    case 'OMR':
      return `OMR ${amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 3 
      })}`
    
    case 'USD':
      return `$${amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
      })}`
    
    case 'EUR':
      return `€${amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
      })}`
    
    case 'GBP':
      return `£${amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
      })}`
    
    default:
      return `${currency} ${amount.toLocaleString('en-US', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
      })}`
  }
}

function getPaymentStatusConfig(status?: string, invoiceStatus?: string) {
  // Determine payment status based on booking status and invoice status
  if (invoiceStatus === 'paid') {
    return {
      label: 'Paid',
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle,
      color: 'text-green-600'
    }
  }
  
  if (invoiceStatus === 'issued') {
    return {
      label: 'Invoice Sent',
      variant: 'secondary' as const,
      className: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: CreditCard,
      color: 'text-blue-600'
    }
  }
  
  if (status === 'completed' && !invoiceStatus) {
    return {
      label: 'Awaiting Invoice',
      variant: 'outline' as const,
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
      color: 'text-amber-600'
    }
  }
  
  if (status === 'approved' || status === 'in_progress') {
    return {
      label: 'Pending Payment',
      variant: 'outline' as const,
      className: 'bg-gray-50 text-gray-600 border-gray-200',
      icon: Clock,
      color: 'text-gray-500'
    }
  }
  
  return {
    label: 'Not Invoiced',
    variant: 'outline' as const,
    className: 'bg-gray-50 text-gray-500 border-gray-200',
    icon: DollarSign,
    color: 'text-gray-400'
  }
}

export function AmountDisplay({ 
  amount_cents, 
  currency = 'OMR', 
  status,
  invoice_status,
  compact = false,
  showStatus = true,
  className = '' 
}: AmountDisplayProps) {
  const formattedAmount = formatAmount(amount_cents, currency)
  const paymentConfig = getPaymentStatusConfig(status, invoice_status)
  const PaymentIcon = paymentConfig.icon
  
  // Handle zero or missing amounts
  const isZeroAmount = !amount_cents || amount_cents === 0
  
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={`font-semibold ${isZeroAmount ? 'text-red-500' : 'text-gray-900'}`}>
          {isZeroAmount ? 'OMR 0.00' : formattedAmount}
        </span>
        {showStatus && (
          <PaymentIcon className={`h-3.5 w-3.5 ${paymentConfig.color}`} />
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Amount */}
      <div className="flex items-center gap-2">
        <DollarSign className={`h-4 w-4 ${isZeroAmount ? 'text-red-400' : 'text-gray-500'}`} />
        <span className={`text-lg font-bold ${isZeroAmount ? 'text-red-600' : 'text-gray-900'}`}>
          {isZeroAmount ? 'OMR 0.00' : formattedAmount}
        </span>
      </div>

      {/* Zero amount warning */}
      {isZeroAmount && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertTriangle className="h-3 w-3" />
          <span>Amount not set</span>
        </div>
      )}

      {/* Payment Status */}
      {showStatus && !isZeroAmount && (
        <Badge 
          variant={paymentConfig.variant}
          className={`${paymentConfig.className} flex items-center gap-1.5 w-fit`}
        >
          <PaymentIcon className="h-3 w-3" />
          {paymentConfig.label}
        </Badge>
      )}
    </div>
  )
}

export function CompactAmountDisplay({ 
  amount_cents, 
  currency = 'OMR',
  className = '' 
}: Pick<AmountDisplayProps, 'amount_cents' | 'currency' | 'className'>) {
  const formattedAmount = formatAmount(amount_cents, currency)
  const isZeroAmount = !amount_cents || amount_cents === 0
  
  return (
    <span className={`font-semibold ${isZeroAmount ? 'text-red-500' : 'text-gray-900'} ${className}`}>
      {isZeroAmount ? 'OMR 0.00' : formattedAmount}
    </span>
  )
}

export function AmountSummary({ 
  amounts, 
  currency = 'OMR',
  className = '' 
}: {
  amounts: (number | undefined)[]
  currency?: string
  className?: string
}) {
  const total = amounts.reduce((sum: number, amount) => sum + (amount || 0), 0)
  const validAmounts = amounts.filter(amount => amount && amount > 0)
  
  return (
    <div className={`text-right ${className}`}>
      <div className="text-lg font-bold text-gray-900">
        {formatAmount(total, currency)}
      </div>
      <div className="text-xs text-gray-500">
        {validAmounts.length} of {amounts.length} items
      </div>
    </div>
  )
}
