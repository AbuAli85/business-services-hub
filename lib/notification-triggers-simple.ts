import { notificationTriggerService } from './notification-triggers'

// Simplified trigger functions for easy importing
export async function triggerBookingCreated(bookingId: string, data: {
  client_id: string
  client_name: string
  provider_id: string
  provider_name: string
  service_name: string
  booking_title: string
  scheduled_date: string
  total_amount: number
  currency: string
}) {
  // Notify client
  await notificationTriggerService.triggerBookingCreated(data.client_id, {
    booking_id: bookingId,
    booking_title: data.booking_title,
    service_name: data.service_name,
    actor_id: data.client_id,
    actor_name: data.client_name
  })

  // Notify provider
  await notificationTriggerService.triggerBookingCreated(data.provider_id, {
    booking_id: bookingId,
    booking_title: data.booking_title,
    service_name: data.service_name,
    actor_id: data.client_id,
    actor_name: data.client_name
  })
}

export async function triggerBookingApproved(bookingId: string, data: {
  client_id: string
  client_name: string
  provider_id: string
  provider_name: string
  service_name: string
  booking_title: string
  scheduled_date: string
  total_amount: number
  currency: string
}) {
  // Notify client about approval
  await notificationTriggerService.triggerBookingConfirmed(data.client_id, {
    booking_id: bookingId,
    booking_title: data.booking_title,
    service_name: data.service_name,
    actor_id: data.provider_id,
    actor_name: data.provider_name
  })
}

export async function triggerBookingCancelled(bookingId: string, data: {
  client_id: string
  client_name: string
  provider_id: string
  provider_name: string
  service_name: string
  booking_title: string
  reason?: string
}) {
  // Notify both parties about cancellation
  await notificationTriggerService.triggerBookingCancelled(data.client_id, {
    booking_id: bookingId,
    booking_title: data.booking_title,
    service_name: data.service_name,
    actor_id: data.client_id,
    actor_name: data.client_name
  })

  await notificationTriggerService.triggerBookingCancelled(data.provider_id, {
    booking_id: bookingId,
    booking_title: data.booking_title,
    service_name: data.service_name,
    actor_id: data.client_id,
    actor_name: data.client_name
  })
}

export async function triggerPaymentReceived(bookingId: string, data: {
  client_id: string
  provider_id: string
  amount: number
  currency: string
  booking_title: string
  payment_method?: string
}) {
  // Notify provider about payment received
  await notificationTriggerService.triggerPaymentReceived(data.provider_id, {
    payment_id: `payment_${Date.now()}`,
    amount: data.amount,
    currency: data.currency,
    booking_id: bookingId,
    booking_title: data.booking_title
  })

  // Notify client about payment confirmation
  await notificationTriggerService.triggerPaymentReceived(data.client_id, {
    payment_id: `payment_${Date.now()}`,
    amount: data.amount,
    currency: data.currency,
    booking_id: bookingId,
    booking_title: data.booking_title
  })
}

export async function triggerPaymentFailed(bookingId: string, data: {
  client_id: string
  provider_id: string
  amount: number
  currency: string
  booking_title: string
  reason?: string
}) {
  // Notify both parties about payment failure
  await notificationTriggerService.triggerPaymentFailed(data.client_id, {
    payment_id: `payment_${Date.now()}`,
    amount: data.amount,
    currency: data.currency,
    booking_id: bookingId,
    booking_title: data.booking_title
  })

  await notificationTriggerService.triggerPaymentFailed(data.provider_id, {
    payment_id: `payment_${Date.now()}`,
    amount: data.amount,
    currency: data.currency,
    booking_id: bookingId,
    booking_title: data.booking_title
  })
}

export async function triggerInvoiceCreated(bookingId: string, data: {
  client_id: string
  provider_id: string
  invoice_id: string
  invoice_number: string
  booking_title: string
  amount: number
  currency: string
  due_date: string
}) {
  // Notify client about new invoice
  await notificationTriggerService.triggerInvoiceCreated(data.client_id, {
    invoice_id: data.invoice_id,
    invoice_number: data.invoice_number,
    booking_id: bookingId,
    booking_title: data.booking_title
  })

  // Notify provider about invoice creation
  await notificationTriggerService.triggerInvoiceCreated(data.provider_id, {
    invoice_id: data.invoice_id,
    invoice_number: data.invoice_number,
    booking_id: bookingId,
    booking_title: data.booking_title
  })
}

export async function triggerInvoiceOverdue(bookingId: string, data: {
  client_id: string
  provider_id: string
  invoice_id: string
  invoice_number: string
  booking_title: string
  due_date: string
}) {
  // Notify client about overdue invoice
  await notificationTriggerService.triggerInvoiceOverdue(data.client_id, {
    invoice_id: data.invoice_id,
    invoice_number: data.invoice_number,
    booking_id: bookingId,
    booking_title: data.booking_title
  })

  // Notify provider about overdue invoice
  await notificationTriggerService.triggerInvoiceOverdue(data.provider_id, {
    invoice_id: data.invoice_id,
    invoice_number: data.invoice_number,
    booking_id: bookingId,
    booking_title: data.booking_title
  })
}

export async function triggerMessageReceived(recipientId: string, data: {
  message_id: string
  sender_id: string
  sender_name: string
  message_preview?: string
}) {
  console.log('🔔 triggerMessageReceived called:', { recipientId, data });
  try {
    await notificationTriggerService.triggerMessageReceived(recipientId, {
      message_id: data.message_id,
      sender_id: data.sender_id,
      sender_name: data.sender_name
    });
    console.log('✅ triggerMessageReceived completed successfully');
  } catch (error) {
    console.error('❌ triggerMessageReceived failed:', error);
    throw error;
  }
}

export async function triggerTaskCreated(bookingId: string, data: {
  task_id: string
  task_title: string
  milestone_id: string
  milestone_title: string
  assigned_to: string
  assigned_to_name: string
  created_by: string
  created_by_name: string
  project_name: string
}) {
  // Notify assignee
  await notificationTriggerService.triggerTaskCreated(data.assigned_to, {
    task_id: data.task_id,
    task_title: data.task_title,
    milestone_id: data.milestone_id,
    milestone_title: data.milestone_title,
    booking_id: bookingId,
    project_name: data.project_name,
    actor_id: data.created_by,
    actor_name: data.created_by_name
  })
}

export async function triggerTaskCompleted(bookingId: string, data: {
  task_id: string
  task_title: string
  milestone_id: string
  milestone_title: string
  completed_by: string
  completed_by_name: string
  project_name: string
}) {
  // Notify project stakeholders about task completion
  await notificationTriggerService.triggerTaskCompleted(data.completed_by, {
    task_id: data.task_id,
    task_title: data.task_title,
    milestone_id: data.milestone_id,
    milestone_title: data.milestone_title,
    booking_id: bookingId,
    project_name: data.project_name,
    actor_id: data.completed_by,
    actor_name: data.completed_by_name
  })
}

export async function triggerMilestoneCompleted(bookingId: string, data: {
  milestone_id: string
  milestone_title: string
  completed_by: string
  completed_by_name: string
  project_name: string
}) {
  // Notify project stakeholders about milestone completion
  await notificationTriggerService.triggerMilestoneCompleted(data.completed_by, {
    milestone_id: data.milestone_id,
    milestone_title: data.milestone_title,
    booking_id: bookingId,
    project_name: data.project_name,
    actor_id: data.completed_by,
    actor_name: data.completed_by_name
  })
}

export async function triggerDocumentUploaded(bookingId: string, data: {
  document_id: string
  document_name: string
  uploaded_by: string
  uploaded_by_name: string
  project_name: string
}) {
  // Notify project stakeholders about document upload
  await notificationTriggerService.triggerDocumentUploaded(data.uploaded_by, {
    document_id: data.document_id,
    document_name: data.document_name,
    actor_id: data.uploaded_by,
    actor_name: data.uploaded_by_name
  })
}

export async function triggerServiceCreated(serviceId: string, data: {
  title: string
  provider_id: string
  provider_name: string
}) {
  // Notify provider about service creation
  await notificationTriggerService.triggerServiceCreated(data.provider_id, {
    service_id: serviceId,
    service_title: data.title,
    actor_id: data.provider_id,
    actor_name: data.provider_name
  })
}

export async function triggerUserRegistered(userId: string, data: {
  user_name: string
  user_email: string
  role: string
}) {
  // Notify user about successful registration
  await notificationTriggerService.triggerUserRegistered(userId, {
    user_name: data.user_name,
    user_email: data.user_email,
    role: data.role,
    actor_id: userId,
    actor_name: data.user_name
  })
}

export async function triggerReviewReceived(bookingId: string, data: {
  review_id: string
  reviewer_id: string
  reviewer_name: string
  provider_id: string
  provider_name: string
  rating: number
  comment?: string
}) {
  console.log('🔔 triggerReviewReceived called:', { bookingId, data });
  try {
    // Notify provider about new review
    await notificationTriggerService.triggerReviewReceived(data.provider_id, {
      review_id: data.review_id,
      reviewer_id: data.reviewer_id,
      reviewer_name: data.reviewer_name,
      provider_id: data.provider_id,
      provider_name: data.provider_name,
      rating: data.rating,
      comment: data.comment || '',
      service_name: `Booking ${bookingId}`,
      booking_id: bookingId
    });
    console.log('✅ triggerReviewReceived completed successfully');
  } catch (error) {
    console.error('❌ triggerReviewReceived failed:', error);
    throw error;
  }
}