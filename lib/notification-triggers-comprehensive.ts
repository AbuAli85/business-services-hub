import { createNotification } from './notification-service'
import { NotificationType, NotificationData } from '@/types/notifications'

/**
 * Comprehensive notification triggers for all application events
 * This file contains triggers for every possible event in the system
 */

// ============================================================================
// AUTHENTICATION & USER EVENTS
// ============================================================================

export async function triggerUserRegistered(userId: string, userData: { email: string; full_name: string }) {
  return createNotification({
    user_id: userId,
    type: 'system_announcement',
    title: 'Welcome to Business Services Hub!',
    message: `Welcome ${userData.full_name}! Your account has been created successfully.`,
    priority: 'medium',
    data: {
      actor_id: userId,
      actor_name: userData.full_name,
      entity_type: 'user',
      entity_id: userId
    }
  })
}

export async function triggerProfileUpdated(userId: string, changes: string[]) {
  return createNotification({
    user_id: userId,
    type: 'system_announcement',
    title: 'Profile Updated',
    message: `Your profile has been updated: ${changes.join(', ')}`,
    priority: 'low',
    data: {
      actor_id: userId,
      entity_type: 'profile',
      entity_id: userId,
      metadata: { changes }
    }
  })
}

// ============================================================================
// SERVICE EVENTS
// ============================================================================

export async function triggerServiceCreated(serviceId: string, serviceData: { title: string; provider_id: string; provider_name: string }) {
  return createNotification({
    user_id: serviceData.provider_id,
    type: 'system_announcement',
    title: 'Service Created',
    message: `Your service "${serviceData.title}" has been created and is now live!`,
    priority: 'medium',
    data: {
      entity_id: serviceId,
      entity_type: 'service',
      service_name: serviceData.title,
      actor_id: serviceData.provider_id,
      actor_name: serviceData.provider_name
    }
  })
}

export async function triggerServiceUpdated(serviceId: string, serviceData: { title: string; provider_id: string; changes: string[] }) {
  return createNotification({
    user_id: serviceData.provider_id,
    type: 'system_announcement',
    title: 'Service Updated',
    message: `Your service "${serviceData.title}" has been updated: ${serviceData.changes.join(', ')}`,
    priority: 'low',
    data: {
      entity_id: serviceId,
      entity_type: 'service',
      service_name: serviceData.title,
      metadata: { changes: serviceData.changes }
    }
  })
}

export async function triggerServiceDeactivated(serviceId: string, serviceData: { title: string; provider_id: string }) {
  return createNotification({
    user_id: serviceData.provider_id,
    type: 'system_announcement',
    title: 'Service Deactivated',
    message: `Your service "${serviceData.title}" has been deactivated.`,
    priority: 'medium',
    data: {
      entity_id: serviceId,
      entity_type: 'service',
      service_name: serviceData.title
    }
  })
}

// ============================================================================
// BOOKING EVENTS (Enhanced)
// ============================================================================

export async function triggerBookingCreated(bookingId: string, bookingData: {
  client_id: string
  client_name: string
  provider_id: string
  provider_name: string
  service_name: string
  booking_title: string
  scheduled_date?: string
  total_amount?: number
  currency?: string
}) {
  // Notify client
  await createNotification({
    user_id: bookingData.client_id,
    type: 'booking_created',
    title: 'Booking Confirmed',
    message: `Your booking for "${bookingData.service_name}" has been created successfully!`,
    priority: 'high',
    action_url: `/dashboard/bookings/${bookingId}`,
    action_label: 'View Booking',
    data: {
      booking_id: bookingId,
      booking_title: bookingData.booking_title,
      service_name: bookingData.service_name,
      scheduled_date: bookingData.scheduled_date,
      amount: bookingData.total_amount,
      currency: bookingData.currency,
      actor_id: bookingData.client_id,
      actor_name: bookingData.client_name
    }
  })

  // Notify provider
  return createNotification({
    user_id: bookingData.provider_id,
    type: 'booking_created',
    title: 'New Booking Received',
    message: `You have a new booking for "${bookingData.service_name}" from ${bookingData.client_name}`,
    priority: 'high',
    action_url: `/dashboard/provider/${bookingData.provider_id}`,
    action_label: 'View Booking',
    data: {
      booking_id: bookingId,
      booking_title: bookingData.booking_title,
      service_name: bookingData.service_name,
      scheduled_date: bookingData.scheduled_date,
      amount: bookingData.total_amount,
      currency: bookingData.currency,
      actor_id: bookingData.client_id,
      actor_name: bookingData.client_name
    }
  })
}

export async function triggerBookingUpdated(bookingId: string, bookingData: {
  client_id: string
  provider_id: string
  service_name: string
  changes: string[]
  updated_by: string
  updated_by_name: string
}) {
  const notifications = []

  // Notify client
  notifications.push(createNotification({
    user_id: bookingData.client_id,
    type: 'booking_updated',
    title: 'Booking Updated',
    message: `Your booking for "${bookingData.service_name}" has been updated: ${bookingData.changes.join(', ')}`,
    priority: 'medium',
    action_url: `/dashboard/bookings/${bookingId}`,
    action_label: 'View Changes',
    data: {
      booking_id: bookingId,
      service_name: bookingData.service_name,
      actor_id: bookingData.updated_by,
      actor_name: bookingData.updated_by_name,
      metadata: { changes: bookingData.changes }
    }
  }))

  // Notify provider
  notifications.push(createNotification({
    user_id: bookingData.provider_id,
    type: 'booking_updated',
    title: 'Booking Updated',
    message: `Booking for "${bookingData.service_name}" has been updated: ${bookingData.changes.join(', ')}`,
    priority: 'medium',
    action_url: `/dashboard/provider/${bookingData.provider_id}`,
    action_label: 'View Changes',
    data: {
      booking_id: bookingId,
      service_name: bookingData.service_name,
      actor_id: bookingData.updated_by,
      actor_name: bookingData.updated_by_name,
      metadata: { changes: bookingData.changes }
    }
  }))

  return Promise.all(notifications)
}

export async function triggerBookingCancelled(bookingId: string, bookingData: {
  client_id: string
  provider_id: string
  service_name: string
  cancelled_by: string
  cancelled_by_name: string
  reason?: string
}) {
  const notifications = []

  // Notify client
  notifications.push(createNotification({
    user_id: bookingData.client_id,
    type: 'booking_cancelled',
    title: 'Booking Cancelled',
    message: `Your booking for "${bookingData.service_name}" has been cancelled${bookingData.reason ? `: ${bookingData.reason}` : ''}`,
    priority: 'high',
    action_url: `/dashboard/bookings/${bookingId}`,
    action_label: 'View Details',
    data: {
      booking_id: bookingId,
      service_name: bookingData.service_name,
      actor_id: bookingData.cancelled_by,
      actor_name: bookingData.cancelled_by_name,
      metadata: { reason: bookingData.reason }
    }
  }))

  // Notify provider
  notifications.push(createNotification({
    user_id: bookingData.provider_id,
    type: 'booking_cancelled',
    title: 'Booking Cancelled',
    message: `Booking for "${bookingData.service_name}" has been cancelled by ${bookingData.cancelled_by_name}${bookingData.reason ? `: ${bookingData.reason}` : ''}`,
    priority: 'high',
    action_url: `/dashboard/provider/${bookingData.provider_id}`,
    action_label: 'View Details',
    data: {
      booking_id: bookingId,
      service_name: bookingData.service_name,
      actor_id: bookingData.cancelled_by,
      actor_name: bookingData.cancelled_by_name,
      metadata: { reason: bookingData.reason }
    }
  }))

  return Promise.all(notifications)
}

export async function triggerBookingConfirmed(bookingId: string, bookingData: {
  client_id: string
  provider_id: string
  service_name: string
  confirmed_by: string
  confirmed_by_name: string
  scheduled_date?: string
}) {
  const notifications = []

  // Notify client
  notifications.push(createNotification({
    user_id: bookingData.client_id,
    type: 'booking_confirmed',
    title: 'Booking Confirmed!',
    message: `Your booking for "${bookingData.service_name}" has been confirmed${bookingData.scheduled_date ? ` for ${bookingData.scheduled_date}` : ''}!`,
    priority: 'high',
    action_url: `/dashboard/bookings/${bookingId}`,
    action_label: 'View Booking',
    data: {
      booking_id: bookingId,
      service_name: bookingData.service_name,
      scheduled_date: bookingData.scheduled_date,
      actor_id: bookingData.confirmed_by,
      actor_name: bookingData.confirmed_by_name
    }
  }))

  // Notify provider
  notifications.push(createNotification({
    user_id: bookingData.provider_id,
    type: 'booking_confirmed',
    title: 'Booking Confirmed',
    message: `Booking for "${bookingData.service_name}" has been confirmed${bookingData.scheduled_date ? ` for ${bookingData.scheduled_date}` : ''}`,
    priority: 'medium',
    action_url: `/dashboard/provider/${bookingData.provider_id}`,
    action_label: 'View Booking',
    data: {
      booking_id: bookingId,
      service_name: bookingData.service_name,
      scheduled_date: bookingData.scheduled_date,
      actor_id: bookingData.confirmed_by,
      actor_name: bookingData.confirmed_by_name
    }
  }))

  return Promise.all(notifications)
}

export async function triggerBookingReminder(bookingId: string, bookingData: {
  client_id: string
  provider_id: string
  service_name: string
  scheduled_date: string
  reminder_type: '24h' | '1h' | '30min'
}) {
  const notifications = []

  const reminderMessages = {
    '24h': 'Your booking is scheduled for tomorrow',
    '1h': 'Your booking is scheduled in 1 hour',
    '30min': 'Your booking is scheduled in 30 minutes'
  }

  // Notify client
  notifications.push(createNotification({
    user_id: bookingData.client_id,
    type: 'booking_reminder',
    title: 'Booking Reminder',
    message: `${reminderMessages[bookingData.reminder_type]} for "${bookingData.service_name}" on ${bookingData.scheduled_date}`,
    priority: 'high',
    action_url: `/dashboard/bookings/${bookingId}`,
    action_label: 'View Booking',
    data: {
      booking_id: bookingId,
      service_name: bookingData.service_name,
      scheduled_date: bookingData.scheduled_date,
      metadata: { reminder_type: bookingData.reminder_type }
    }
  }))

  // Notify provider
  notifications.push(createNotification({
    user_id: bookingData.provider_id,
    type: 'booking_reminder',
    title: 'Booking Reminder',
    message: `${reminderMessages[bookingData.reminder_type]} for "${bookingData.service_name}" on ${bookingData.scheduled_date}`,
    priority: 'high',
    action_url: `/dashboard/provider/${bookingData.provider_id}`,
    action_label: 'View Booking',
    data: {
      booking_id: bookingId,
      service_name: bookingData.service_name,
      scheduled_date: bookingData.scheduled_date,
      metadata: { reminder_type: bookingData.reminder_type }
    }
  }))

  return Promise.all(notifications)
}

export async function triggerBookingCompleted(bookingId: string, bookingData: {
  client_id: string
  provider_id: string
  service_name: string
  completed_by: string
  completed_by_name: string
}) {
  const notifications = []

  // Notify client
  notifications.push(createNotification({
    user_id: bookingData.client_id,
    type: 'booking_completed',
    title: 'Service Completed!',
    message: `Your service "${bookingData.service_name}" has been completed! Please leave a review.`,
    priority: 'high',
    action_url: `/dashboard/bookings/${bookingId}`,
    action_label: 'Leave Review',
    data: {
      booking_id: bookingId,
      service_name: bookingData.service_name,
      actor_id: bookingData.completed_by,
      actor_name: bookingData.completed_by_name
    }
  }))

  // Notify provider
  notifications.push(createNotification({
    user_id: bookingData.provider_id,
    type: 'booking_completed',
    title: 'Service Completed',
    message: `You have completed the service "${bookingData.service_name}" for ${bookingData.completed_by_name}`,
    priority: 'medium',
    action_url: `/dashboard/provider/${bookingData.provider_id}`,
    action_label: 'View Details',
    data: {
      booking_id: bookingId,
      service_name: bookingData.service_name,
      actor_id: bookingData.completed_by,
      actor_name: bookingData.completed_by_name
    }
  }))

  return Promise.all(notifications)
}

// ============================================================================
// PAYMENT EVENTS
// ============================================================================

export async function triggerPaymentReceived(paymentId: string, paymentData: {
  booking_id: string
  client_id: string
  provider_id: string
  amount: number
  currency: string
  payment_method: string
  transaction_id: string
  service_name: string
}) {
  const notifications = []

  // Notify client
  notifications.push(createNotification({
    user_id: paymentData.client_id,
    type: 'payment_received',
    title: 'Payment Processed',
    message: `Your payment of ${paymentData.amount} ${paymentData.currency} for "${paymentData.service_name}" has been processed successfully.`,
    priority: 'high',
    action_url: `/dashboard/bookings/${paymentData.booking_id}`,
    action_label: 'View Booking',
    data: {
      payment_id: paymentId,
      booking_id: paymentData.booking_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      payment_method: paymentData.payment_method,
      transaction_id: paymentData.transaction_id,
      service_name: paymentData.service_name
    }
  }))

  // Notify provider
  notifications.push(createNotification({
    user_id: paymentData.provider_id,
    type: 'payment_received',
    title: 'Payment Received',
    message: `You have received a payment of ${paymentData.amount} ${paymentData.currency} for "${paymentData.service_name}".`,
    priority: 'high',
    action_url: `/dashboard/provider/${paymentData.provider_id}`,
    action_label: 'View Earnings',
    data: {
      payment_id: paymentId,
      booking_id: paymentData.booking_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      payment_method: paymentData.payment_method,
      transaction_id: paymentData.transaction_id,
      service_name: paymentData.service_name
    }
  }))

  return Promise.all(notifications)
}

export async function triggerPaymentFailed(paymentId: string, paymentData: {
  booking_id: string
  client_id: string
  provider_id: string
  amount: number
  currency: string
  error_message: string
  service_name: string
}) {
  const notifications = []

  // Notify client
  notifications.push(createNotification({
    user_id: paymentData.client_id,
    type: 'payment_failed',
    title: 'Payment Failed',
    message: `Your payment of ${paymentData.amount} ${paymentData.currency} for "${paymentData.service_name}" failed. Please try again.`,
    priority: 'urgent',
    action_url: `/dashboard/bookings/${paymentData.booking_id}`,
    action_label: 'Retry Payment',
    data: {
      payment_id: paymentId,
      booking_id: paymentData.booking_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      service_name: paymentData.service_name,
      metadata: { error_message: paymentData.error_message }
    }
  }))

  // Notify provider
  notifications.push(createNotification({
    user_id: paymentData.provider_id,
    type: 'payment_failed',
    title: 'Payment Failed',
    message: `Payment of ${paymentData.amount} ${paymentData.currency} for "${paymentData.service_name}" failed.`,
    priority: 'high',
    action_url: `/dashboard/provider/${paymentData.provider_id}`,
    action_label: 'View Details',
    data: {
      payment_id: paymentId,
      booking_id: paymentData.booking_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      service_name: paymentData.service_name,
      metadata: { error_message: paymentData.error_message }
    }
  }))

  return Promise.all(notifications)
}

// ============================================================================
// INVOICE EVENTS
// ============================================================================

export async function triggerInvoiceCreated(invoiceId: string, invoiceData: {
  booking_id: string
  client_id: string
  provider_id: string
  invoice_number: string
  amount: number
  currency: string
  due_date: string
  service_name: string
}) {
  const notifications = []

  // Notify client
  notifications.push(createNotification({
    user_id: invoiceData.client_id,
    type: 'invoice_created',
    title: 'New Invoice',
    message: `You have received a new invoice #${invoiceData.invoice_number} for ${invoiceData.amount} ${invoiceData.currency} for "${invoiceData.service_name}". Due: ${invoiceData.due_date}`,
    priority: 'high',
    action_url: `/dashboard/invoices`,
    action_label: 'View Invoice',
    data: {
      invoice_id: invoiceId,
      invoice_number: invoiceData.invoice_number,
      booking_id: invoiceData.booking_id,
      amount: invoiceData.amount,
      currency: invoiceData.currency,
      due_date: invoiceData.due_date,
      service_name: invoiceData.service_name
    }
  }))

  // Notify provider
  notifications.push(createNotification({
    user_id: invoiceData.provider_id,
    type: 'invoice_created',
    title: 'Invoice Created',
    message: `Invoice #${invoiceData.invoice_number} for ${invoiceData.amount} ${invoiceData.currency} has been created for "${invoiceData.service_name}".`,
    priority: 'medium',
    action_url: `/dashboard/invoices`,
    action_label: 'View Invoice',
    data: {
      invoice_id: invoiceId,
      invoice_number: invoiceData.invoice_number,
      booking_id: invoiceData.booking_id,
      amount: invoiceData.amount,
      currency: invoiceData.currency,
      due_date: invoiceData.due_date,
      service_name: invoiceData.service_name
    }
  }))

  return Promise.all(notifications)
}

export async function triggerInvoicePaid(invoiceId: string, invoiceData: {
  booking_id: string
  client_id: string
  provider_id: string
  invoice_number: string
  amount: number
  currency: string
  service_name: string
}) {
  const notifications = []

  // Notify client
  notifications.push(createNotification({
    user_id: invoiceData.client_id,
    type: 'invoice_paid',
    title: 'Invoice Paid',
    message: `Invoice #${invoiceData.invoice_number} for ${invoiceData.amount} ${invoiceData.currency} has been paid successfully.`,
    priority: 'medium',
    action_url: `/dashboard/invoices`,
    action_label: 'View Invoice',
    data: {
      invoice_id: invoiceId,
      invoice_number: invoiceData.invoice_number,
      booking_id: invoiceData.booking_id,
      amount: invoiceData.amount,
      currency: invoiceData.currency,
      service_name: invoiceData.service_name
    }
  }))

  // Notify provider
  notifications.push(createNotification({
    user_id: invoiceData.provider_id,
    type: 'invoice_paid',
    title: 'Invoice Paid',
    message: `Invoice #${invoiceData.invoice_number} for ${invoiceData.amount} ${invoiceData.currency} has been paid by the client.`,
    priority: 'high',
    action_url: `/dashboard/invoices`,
    action_label: 'View Invoice',
    data: {
      invoice_id: invoiceId,
      invoice_number: invoiceData.invoice_number,
      booking_id: invoiceData.booking_id,
      amount: invoiceData.amount,
      currency: invoiceData.currency,
      service_name: invoiceData.service_name
    }
  }))

  return Promise.all(notifications)
}

export async function triggerInvoiceOverdue(invoiceId: string, invoiceData: {
  booking_id: string
  client_id: string
  provider_id: string
  invoice_number: string
  amount: number
  currency: string
  days_overdue: number
  service_name: string
}) {
  const notifications = []

  // Notify client
  notifications.push(createNotification({
    user_id: invoiceData.client_id,
    type: 'invoice_overdue',
    title: 'Invoice Overdue',
    message: `Invoice #${invoiceData.invoice_number} for ${invoiceData.amount} ${invoiceData.currency} is ${invoiceData.days_overdue} days overdue. Please pay immediately.`,
    priority: 'urgent',
    action_url: `/dashboard/invoices`,
    action_label: 'Pay Now',
    data: {
      invoice_id: invoiceId,
      invoice_number: invoiceData.invoice_number,
      booking_id: invoiceData.booking_id,
      amount: invoiceData.amount,
      currency: invoiceData.currency,
      service_name: invoiceData.service_name,
      metadata: { days_overdue: invoiceData.days_overdue }
    }
  }))

  // Notify provider
  notifications.push(createNotification({
    user_id: invoiceData.provider_id,
    type: 'invoice_overdue',
    title: 'Invoice Overdue',
    message: `Invoice #${invoiceData.invoice_number} for ${invoiceData.amount} ${invoiceData.currency} is ${invoiceData.days_overdue} days overdue.`,
    priority: 'high',
    action_url: `/dashboard/invoices`,
    action_label: 'View Invoice',
    data: {
      invoice_id: invoiceId,
      invoice_number: invoiceData.invoice_number,
      booking_id: invoiceData.booking_id,
      amount: invoiceData.amount,
      currency: invoiceData.currency,
      service_name: invoiceData.service_name,
      metadata: { days_overdue: invoiceData.days_overdue }
    }
  }))

  return Promise.all(notifications)
}

// ============================================================================
// MESSAGE EVENTS
// ============================================================================

export async function triggerMessageReceived(messageId: string, messageData: {
  receiver_id: string
  sender_id: string
  sender_name: string
  subject: string
  content: string
  booking_id?: string
}) {
  return createNotification({
    user_id: messageData.receiver_id,
    type: 'message_received',
    title: `New Message from ${messageData.sender_name}`,
    message: messageData.subject,
    priority: 'medium',
    action_url: messageData.booking_id ? `/dashboard/bookings/${messageData.booking_id}` : '/dashboard/messages',
    action_label: 'View Message',
    data: {
      message_id: messageId,
      sender_id: messageData.sender_id,
      sender_name: messageData.sender_name,
      booking_id: messageData.booking_id,
      metadata: { content_preview: messageData.content.substring(0, 100) }
    }
  })
}

// ============================================================================
// TASK EVENTS
// ============================================================================

export async function triggerTaskCreated(taskId: string, taskData: {
  user_id: string
  title: string
  description: string
  due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_by?: string
  assigned_by_name?: string
  project_id?: string
  project_name?: string
}) {
  return createNotification({
    user_id: taskData.user_id,
    type: 'task_created',
    title: 'New Task Assigned',
    message: `You have been assigned a new task: "${taskData.title}"${taskData.due_date ? ` (Due: ${taskData.due_date})` : ''}`,
    priority: taskData.priority,
    action_url: `/dashboard/tasks/${taskId}`,
    action_label: 'View Task',
    data: {
      task_id: taskId,
      task_title: taskData.title,
      project_id: taskData.project_id,
      project_name: taskData.project_name,
      actor_id: taskData.assigned_by,
      actor_name: taskData.assigned_by_name,
      metadata: { due_date: taskData.due_date, description: taskData.description }
    }
  })
}

export async function triggerTaskUpdated(taskId: string, taskData: {
  user_id: string
  title: string
  changes: string[]
  updated_by: string
  updated_by_name: string
  project_id?: string
  project_name?: string
}) {
  return createNotification({
    user_id: taskData.user_id,
    type: 'task_updated',
    title: 'Task Updated',
    message: `Task "${taskData.title}" has been updated: ${taskData.changes.join(', ')}`,
    priority: 'medium',
    action_url: `/dashboard/tasks/${taskId}`,
    action_label: 'View Changes',
    data: {
      task_id: taskId,
      task_title: taskData.title,
      project_id: taskData.project_id,
      project_name: taskData.project_name,
      actor_id: taskData.updated_by,
      actor_name: taskData.updated_by_name,
      metadata: { changes: taskData.changes }
    }
  })
}

export async function triggerTaskCompleted(taskId: string, taskData: {
  user_id: string
  title: string
  completed_by: string
  completed_by_name: string
  project_id?: string
  project_name?: string
}) {
  return createNotification({
    user_id: taskData.user_id,
    type: 'task_completed',
    title: 'Task Completed',
    message: `Task "${taskData.title}" has been completed by ${taskData.completed_by_name}`,
    priority: 'medium',
    action_url: `/dashboard/tasks/${taskId}`,
    action_label: 'View Task',
    data: {
      task_id: taskId,
      task_title: taskData.title,
      project_id: taskData.project_id,
      project_name: taskData.project_name,
      actor_id: taskData.completed_by,
      actor_name: taskData.completed_by_name
    }
  })
}

export async function triggerTaskOverdue(taskId: string, taskData: {
  user_id: string
  title: string
  due_date: string
  days_overdue: number
  project_id?: string
  project_name?: string
}) {
  return createNotification({
    user_id: taskData.user_id,
    type: 'task_overdue',
    title: 'Task Overdue',
    message: `Task "${taskData.title}" is ${taskData.days_overdue} days overdue (was due: ${taskData.due_date})`,
    priority: 'urgent',
    action_url: `/dashboard/tasks/${taskId}`,
    action_label: 'Complete Task',
    data: {
      task_id: taskId,
      task_title: taskData.title,
      project_id: taskData.project_id,
      project_name: taskData.project_name,
      metadata: { due_date: taskData.due_date, days_overdue: taskData.days_overdue }
    }
  })
}

// ============================================================================
// MILESTONE EVENTS
// ============================================================================

export async function triggerMilestoneCreated(milestoneId: string, milestoneData: {
  user_id: string
  title: string
  description: string
  due_date?: string
  booking_id: string
  service_name: string
  created_by: string
  created_by_name: string
}) {
  return createNotification({
    user_id: milestoneData.user_id,
    type: 'milestone_created',
    title: 'New Milestone Created',
    message: `A new milestone "${milestoneData.title}" has been created for "${milestoneData.service_name}"${milestoneData.due_date ? ` (Due: ${milestoneData.due_date})` : ''}`,
    priority: 'medium',
    action_url: `/dashboard/bookings/${milestoneData.booking_id}`,
    action_label: 'View Milestone',
    data: {
      milestone_id: milestoneId,
      milestone_title: milestoneData.title,
      booking_id: milestoneData.booking_id,
      service_name: milestoneData.service_name,
      actor_id: milestoneData.created_by,
      actor_name: milestoneData.created_by_name,
      metadata: { due_date: milestoneData.due_date, description: milestoneData.description }
    }
  })
}

export async function triggerMilestoneCompleted(milestoneId: string, milestoneData: {
  user_id: string
  title: string
  booking_id: string
  service_name: string
  completed_by: string
  completed_by_name: string
}) {
  return createNotification({
    user_id: milestoneData.user_id,
    type: 'milestone_completed',
    title: 'Milestone Completed',
    message: `Milestone "${milestoneData.title}" for "${milestoneData.service_name}" has been completed by ${milestoneData.completed_by_name}`,
    priority: 'medium',
    action_url: `/dashboard/bookings/${milestoneData.booking_id}`,
    action_label: 'View Milestone',
    data: {
      milestone_id: milestoneId,
      milestone_title: milestoneData.title,
      booking_id: milestoneData.booking_id,
      service_name: milestoneData.service_name,
      actor_id: milestoneData.completed_by,
      actor_name: milestoneData.completed_by_name
    }
  })
}

export async function triggerMilestoneApproved(milestoneId: string, milestoneData: {
  user_id: string
  title: string
  booking_id: string
  service_name: string
  approved_by: string
  approved_by_name: string
}) {
  return createNotification({
    user_id: milestoneData.user_id,
    type: 'milestone_approved',
    title: 'Milestone Approved',
    message: `Milestone "${milestoneData.title}" for "${milestoneData.service_name}" has been approved by ${milestoneData.approved_by_name}`,
    priority: 'high',
    action_url: `/dashboard/bookings/${milestoneData.booking_id}`,
    action_label: 'View Milestone',
    data: {
      milestone_id: milestoneId,
      milestone_title: milestoneData.title,
      booking_id: milestoneData.booking_id,
      service_name: milestoneData.service_name,
      actor_id: milestoneData.approved_by,
      actor_name: milestoneData.approved_by_name
    }
  })
}

export async function triggerMilestoneRejected(milestoneId: string, milestoneData: {
  user_id: string
  title: string
  booking_id: string
  service_name: string
  rejected_by: string
  rejected_by_name: string
  reason?: string
}) {
  return createNotification({
    user_id: milestoneData.user_id,
    type: 'milestone_rejected',
    title: 'Milestone Rejected',
    message: `Milestone "${milestoneData.title}" for "${milestoneData.service_name}" has been rejected by ${milestoneData.rejected_by_name}${milestoneData.reason ? `: ${milestoneData.reason}` : ''}`,
    priority: 'high',
    action_url: `/dashboard/bookings/${milestoneData.booking_id}`,
    action_label: 'View Milestone',
    data: {
      milestone_id: milestoneId,
      milestone_title: milestoneData.title,
      booking_id: milestoneData.booking_id,
      service_name: milestoneData.service_name,
      actor_id: milestoneData.rejected_by,
      actor_name: milestoneData.rejected_by_name,
      metadata: { reason: milestoneData.reason }
    }
  })
}

// ============================================================================
// DOCUMENT EVENTS
// ============================================================================

export async function triggerDocumentUploaded(documentId: string, documentData: {
  user_id: string
  name: string
  type: string
  size: number
  booking_id?: string
  service_name?: string
  uploaded_by: string
  uploaded_by_name: string
}) {
  return createNotification({
    user_id: documentData.user_id,
    type: 'document_uploaded',
    title: 'Document Uploaded',
    message: `Document "${documentData.name}" has been uploaded by ${documentData.uploaded_by_name}`,
    priority: 'medium',
    action_url: documentData.booking_id ? `/dashboard/bookings/${documentData.booking_id}` : '/dashboard/documents',
    action_label: 'View Document',
    data: {
      document_id: documentId,
      document_name: documentData.name,
      booking_id: documentData.booking_id,
      service_name: documentData.service_name,
      actor_id: documentData.uploaded_by,
      actor_name: documentData.uploaded_by_name,
      metadata: { type: documentData.type, size: documentData.size }
    }
  })
}

export async function triggerDocumentApproved(documentId: string, documentData: {
  user_id: string
  name: string
  booking_id?: string
  service_name?: string
  approved_by: string
  approved_by_name: string
}) {
  return createNotification({
    user_id: documentData.user_id,
    type: 'document_approved',
    title: 'Document Approved',
    message: `Document "${documentData.name}" has been approved by ${documentData.approved_by_name}`,
    priority: 'medium',
    action_url: documentData.booking_id ? `/dashboard/bookings/${documentData.booking_id}` : '/dashboard/documents',
    action_label: 'View Document',
    data: {
      document_id: documentId,
      document_name: documentData.name,
      booking_id: documentData.booking_id,
      service_name: documentData.service_name,
      actor_id: documentData.approved_by,
      actor_name: documentData.approved_by_name
    }
  })
}

export async function triggerDocumentRejected(documentId: string, documentData: {
  user_id: string
  name: string
  booking_id?: string
  service_name?: string
  rejected_by: string
  rejected_by_name: string
  reason?: string
}) {
  return createNotification({
    user_id: documentData.user_id,
    type: 'document_rejected',
    title: 'Document Rejected',
    message: `Document "${documentData.name}" has been rejected by ${documentData.rejected_by_name}${documentData.reason ? `: ${documentData.reason}` : ''}`,
    priority: 'high',
    action_url: documentData.booking_id ? `/dashboard/bookings/${documentData.booking_id}` : '/dashboard/documents',
    action_label: 'View Document',
    data: {
      document_id: documentId,
      document_name: documentData.name,
      booking_id: documentData.booking_id,
      service_name: documentData.service_name,
      actor_id: documentData.rejected_by,
      actor_name: documentData.rejected_by_name,
      metadata: { reason: documentData.reason }
    }
  })
}

// ============================================================================
// REVIEW EVENTS
// ============================================================================

export async function triggerReviewReceived(reviewId: string, reviewData: {
  provider_id: string
  client_id: string
  client_name: string
  rating: number
  service_name: string
  booking_id: string
}) {
  return createNotification({
    user_id: reviewData.provider_id,
    type: 'client_feedback',
    title: 'New Review Received',
    message: `You received a ${reviewData.rating}-star review from ${reviewData.client_name} for "${reviewData.service_name}"`,
    priority: 'medium',
    action_url: `/dashboard/provider/${reviewData.provider_id}`,
    action_label: 'View Review',
    data: {
      review_id: reviewId,
      booking_id: reviewData.booking_id,
      service_name: reviewData.service_name,
      actor_id: reviewData.client_id,
      actor_name: reviewData.client_name,
      metadata: { rating: reviewData.rating }
    }
  })
}

// ============================================================================
// SYSTEM EVENTS
// ============================================================================

export async function triggerSystemAnnouncement(userId: string, announcementData: {
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  action_url?: string
  action_label?: string
  expires_at?: string
}) {
  return createNotification({
    user_id: userId,
    type: 'system_announcement',
    title: announcementData.title,
    message: announcementData.message,
    priority: announcementData.priority,
    action_url: announcementData.action_url,
    action_label: announcementData.action_label,
    expires_at: announcementData.expires_at,
    data: {
      entity_type: 'system_announcement',
      metadata: { announcement: true }
    }
  })
}

export async function triggerMaintenanceScheduled(userId: string, maintenanceData: {
  title: string
  message: string
  scheduled_time: string
  duration: string
  affected_services: string[]
}) {
  return createNotification({
    user_id: userId,
    type: 'maintenance_scheduled',
    title: 'Scheduled Maintenance',
    message: `Maintenance scheduled for ${maintenanceData.scheduled_time}: ${maintenanceData.message}`,
    priority: 'high',
    action_url: '/dashboard/help',
    action_label: 'Learn More',
    data: {
      entity_type: 'maintenance',
      metadata: {
        scheduled_time: maintenanceData.scheduled_time,
        duration: maintenanceData.duration,
        affected_services: maintenanceData.affected_services
      }
    }
  })
}

// ============================================================================
// DEADLINE EVENTS
// ============================================================================

export async function triggerDeadlineApproaching(entityId: string, deadlineData: {
  user_id: string
  entity_type: 'task' | 'milestone' | 'booking' | 'invoice'
  entity_name: string
  due_date: string
  days_remaining: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  action_url: string
}) {
  const urgencyMessages = {
    1: 'due tomorrow',
    2: 'due in 2 days',
    3: 'due in 3 days',
    7: 'due in a week'
  }

  const message = urgencyMessages[deadlineData.days_remaining as keyof typeof urgencyMessages] || 
    `due in ${deadlineData.days_remaining} days`

  return createNotification({
    user_id: deadlineData.user_id,
    type: 'deadline_approaching',
    title: 'Deadline Approaching',
    message: `${deadlineData.entity_name} is ${message} (${deadlineData.due_date})`,
    priority: deadlineData.priority,
    action_url: deadlineData.action_url,
    action_label: 'View Details',
    data: {
      entity_id: entityId,
      entity_type: deadlineData.entity_type,
      entity_name: deadlineData.entity_name,
      metadata: {
        due_date: deadlineData.due_date,
        days_remaining: deadlineData.days_remaining
      }
    }
  })
}

// ============================================================================
// PROJECT EVENTS
// ============================================================================

export async function triggerProjectDelayed(projectId: string, projectData: {
  user_id: string
  project_name: string
  original_deadline: string
  new_deadline: string
  delay_reason: string
  affected_bookings: string[]
}) {
  return createNotification({
    user_id: projectData.user_id,
    type: 'project_delayed',
    title: 'Project Delayed',
    message: `Project "${projectData.project_name}" has been delayed. New deadline: ${projectData.new_deadline}`,
    priority: 'high',
    action_url: `/dashboard/projects/${projectId}`,
    action_label: 'View Project',
    data: {
      project_id: projectId,
      project_name: projectData.project_name,
      metadata: {
        original_deadline: projectData.original_deadline,
        new_deadline: projectData.new_deadline,
        delay_reason: projectData.delay_reason,
        affected_bookings: projectData.affected_bookings
      }
    }
  })
}

// ============================================================================
// TEAM EVENTS
// ============================================================================

export async function triggerTeamMention(userId: string, mentionData: {
  mentioned_by: string
  mentioned_by_name: string
  context: string
  context_type: 'message' | 'comment' | 'task' | 'milestone'
  context_id: string
  context_url: string
}) {
  return createNotification({
    user_id: userId,
    type: 'team_mention',
    title: `Mentioned by ${mentionData.mentioned_by_name}`,
    message: `You were mentioned in a ${mentionData.context_type}: ${mentionData.context}`,
    priority: 'medium',
    action_url: mentionData.context_url,
    action_label: 'View Context',
    data: {
      actor_id: mentionData.mentioned_by,
      actor_name: mentionData.mentioned_by_name,
      entity_type: mentionData.context_type,
      entity_id: mentionData.context_id,
      metadata: { context: mentionData.context }
    }
  })
}

// ============================================================================
// BULK NOTIFICATION HELPERS
// ============================================================================

export async function triggerBulkNotification(userIds: string[], notificationData: {
  type: NotificationType
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  action_url?: string
  action_label?: string
  data?: NotificationData
}) {
  const notifications = userIds.map(userId => 
    createNotification({
      user_id: userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority,
      action_url: notificationData.action_url,
      action_label: notificationData.action_label,
      data: notificationData.data
    })
  )

  return Promise.all(notifications)
}

// ============================================================================
// NOTIFICATION SCHEDULING HELPERS
// ============================================================================

export async function scheduleNotification(userId: string, notificationData: {
  type: NotificationType
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  scheduled_for: string // ISO date string
  action_url?: string
  action_label?: string
  data?: NotificationData
}) {
  // This would integrate with a job queue system like Bull or Agenda
  // For now, we'll create the notification with a future created_at
  return createNotification({
    user_id: userId,
    type: notificationData.type,
    title: notificationData.title,
    message: notificationData.message,
    priority: notificationData.priority,
    action_url: notificationData.action_url,
    action_label: notificationData.action_label,
    data: notificationData.data,
    // Note: You'd need to implement scheduling logic in your notification service
  })
}
