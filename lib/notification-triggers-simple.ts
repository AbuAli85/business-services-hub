import { createNotification } from './notification-service'
import { NotificationType, NotificationData } from '@/types/notifications'

/**
 * Simple notification triggers for the most important events
 * This file contains only the triggers that are actually being used
 */

// ============================================================================
// BOOKING EVENTS
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
  const notifications = []

  // Notify client
  notifications.push(createNotification(
    bookingData.client_id,
    'booking_created',
    'Booking Confirmed',
    `Your booking for "${bookingData.service_name}" has been created successfully!`,
    {
      booking_id: bookingId,
      booking_title: bookingData.booking_title,
      service_name: bookingData.service_name,
      scheduled_date: bookingData.scheduled_date,
      amount: bookingData.total_amount,
      currency: bookingData.currency,
      actor_id: bookingData.client_id,
      actor_name: bookingData.client_name
    },
    'high'
  ))

  // Notify provider
  notifications.push(createNotification(
    bookingData.provider_id,
    'booking_created',
    'New Booking Received',
    `You have a new booking for "${bookingData.service_name}" from ${bookingData.client_name}`,
    {
      booking_id: bookingId,
      booking_title: bookingData.booking_title,
      service_name: bookingData.service_name,
      scheduled_date: bookingData.scheduled_date,
      amount: bookingData.total_amount,
      currency: bookingData.currency,
      actor_id: bookingData.client_id,
      actor_name: bookingData.client_name
    },
    'high'
  ))

  return Promise.all(notifications)
}

// ============================================================================
// SERVICE EVENTS
// ============================================================================

export async function triggerServiceCreated(serviceId: string, serviceData: { title: string; provider_id: string; provider_name: string }) {
  return createNotification(
    serviceData.provider_id,
    'system_announcement',
    'Service Created',
    `Your service "${serviceData.title}" has been created and is now live!`,
    {
      entity_id: serviceId,
      entity_type: 'service',
      service_name: serviceData.title,
      actor_id: serviceData.provider_id,
      actor_name: serviceData.provider_name
    },
    'medium'
  )
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
  notifications.push(createNotification(
    paymentData.client_id,
    'payment_received',
    'Payment Processed',
    `Your payment of ${paymentData.amount} ${paymentData.currency} for "${paymentData.service_name}" has been processed successfully.`,
    {
      payment_id: paymentId,
      booking_id: paymentData.booking_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      payment_method: paymentData.payment_method,
      transaction_id: paymentData.transaction_id,
      service_name: paymentData.service_name
    },
    'high'
  ))

  // Notify provider
  notifications.push(createNotification(
    paymentData.provider_id,
    'payment_received',
    'Payment Received',
    `You have received a payment of ${paymentData.amount} ${paymentData.currency} for "${paymentData.service_name}".`,
    {
      payment_id: paymentId,
      booking_id: paymentData.booking_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      payment_method: paymentData.payment_method,
      transaction_id: paymentData.transaction_id,
      service_name: paymentData.service_name
    },
    'high'
  ))

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
  notifications.push(createNotification(
    paymentData.client_id,
    'payment_failed',
    'Payment Failed',
    `Your payment of ${paymentData.amount} ${paymentData.currency} for "${paymentData.service_name}" failed. Please try again.`,
    {
      payment_id: paymentId,
      booking_id: paymentData.booking_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      service_name: paymentData.service_name,
      metadata: { error_message: paymentData.error_message }
    },
    'urgent'
  ))

  // Notify provider
  notifications.push(createNotification(
    paymentData.provider_id,
    'payment_failed',
    'Payment Failed',
    `Payment of ${paymentData.amount} ${paymentData.currency} for "${paymentData.service_name}" failed.`,
    {
      payment_id: paymentId,
      booking_id: paymentData.booking_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      service_name: paymentData.service_name,
      metadata: { error_message: paymentData.error_message }
    },
    'high'
  ))

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
  return createNotification(
    messageData.receiver_id,
    'message_received',
    `New Message from ${messageData.sender_name}`,
    messageData.subject,
    {
      message_id: messageId,
      sender_id: messageData.sender_id,
      sender_name: messageData.sender_name,
      booking_id: messageData.booking_id,
      metadata: { content_preview: messageData.content.substring(0, 100) }
    },
    'medium'
  )
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
  return createNotification(
    reviewData.provider_id,
    'client_feedback',
    'New Review Received',
    `You received a ${reviewData.rating}-star review from ${reviewData.client_name} for "${reviewData.service_name}"`,
    {
      review_id: reviewId,
      booking_id: reviewData.booking_id,
      service_name: reviewData.service_name,
      actor_id: reviewData.client_id,
      actor_name: reviewData.client_name,
      metadata: { rating: reviewData.rating }
    },
    'medium'
  )
}

// ============================================================================
// USER EVENTS
// ============================================================================

export async function triggerUserRegistered(userId: string, userData: { email: string; full_name: string }) {
  return createNotification(
    userId,
    'system_announcement',
    'Welcome to Business Services Hub!',
    `Welcome ${userData.full_name}! Your account has been created successfully.`,
    {
      actor_id: userId,
      actor_name: userData.full_name,
      entity_type: 'user',
      entity_id: userId
    },
    'medium'
  )
}
