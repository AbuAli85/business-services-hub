import { notificationService } from './notification-service'
import { getNotificationTemplate } from './notification-templates'
import { NotificationType, NotificationData } from '@/types/notifications'

export class NotificationTriggerService {
  private static instance: NotificationTriggerService

  private constructor() {}

  static getInstance(): NotificationTriggerService {
    if (!NotificationTriggerService.instance) {
      NotificationTriggerService.instance = new NotificationTriggerService()
    }
    return NotificationTriggerService.instance
  }

  // Task notifications
  async triggerTaskCreated(
    userId: string,
    taskData: {
      task_id: string
      task_title: string
      milestone_id: string
      milestone_title: string
      booking_id: string
      project_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('task_created')
    const data: NotificationData = {
      task_id: taskData.task_id,
      task_title: taskData.task_title,
      milestone_id: taskData.milestone_id,
      milestone_title: taskData.milestone_title,
      booking_id: taskData.booking_id,
      project_id: taskData.booking_id,
      project_name: taskData.project_name,
      actor_id: taskData.actor_id,
      actor_name: taskData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'task_created', data, template)
  }

  async triggerTaskCompleted(
    userId: string,
    taskData: {
      task_id: string
      task_title: string
      milestone_id: string
      milestone_title: string
      booking_id: string
      project_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('task_completed')
    const data: NotificationData = {
      task_id: taskData.task_id,
      task_title: taskData.task_title,
      milestone_id: taskData.milestone_id,
      milestone_title: taskData.milestone_title,
      booking_id: taskData.booking_id,
      project_id: taskData.booking_id,
      project_name: taskData.project_name,
      actor_id: taskData.actor_id,
      actor_name: taskData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'task_completed', data, template)
  }

  async triggerTaskOverdue(
    userId: string,
    taskData: {
      task_id: string
      task_title: string
      milestone_id: string
      milestone_title: string
      booking_id: string
      project_name: string
      due_date: string
    }
  ) {
    const template = getNotificationTemplate('task_overdue')
    const data: NotificationData = {
      task_id: taskData.task_id,
      task_title: taskData.task_title,
      milestone_id: taskData.milestone_id,
      milestone_title: taskData.milestone_title,
      booking_id: taskData.booking_id,
      project_id: taskData.booking_id,
      project_name: taskData.project_name,
      metadata: {
        due_date: taskData.due_date
      }
    }

    return notificationService.createFromTemplate(userId, 'task_overdue', data, template)
  }

  async triggerTaskAssigned(
    userId: string,
    taskData: {
      task_id: string
      task_title: string
      milestone_id: string
      milestone_title: string
      booking_id: string
      project_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('task_assigned')
    const data: NotificationData = {
      task_id: taskData.task_id,
      task_title: taskData.task_title,
      milestone_id: taskData.milestone_id,
      milestone_title: taskData.milestone_title,
      booking_id: taskData.booking_id,
      project_id: taskData.booking_id,
      project_name: taskData.project_name,
      actor_id: taskData.actor_id,
      actor_name: taskData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'task_assigned', data, template)
  }

  async triggerTaskComment(
    userId: string,
    taskData: {
      task_id: string
      task_title: string
      milestone_id: string
      milestone_title: string
      booking_id: string
      project_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('task_comment')
    const data: NotificationData = {
      task_id: taskData.task_id,
      task_title: taskData.task_title,
      milestone_id: taskData.milestone_id,
      milestone_title: taskData.milestone_title,
      booking_id: taskData.booking_id,
      project_id: taskData.booking_id,
      project_name: taskData.project_name,
      actor_id: taskData.actor_id,
      actor_name: taskData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'task_comment', data, template)
  }

  // Milestone notifications
  async triggerMilestoneCreated(
    userId: string,
    milestoneData: {
      milestone_id: string
      milestone_title: string
      booking_id: string
      project_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('milestone_created')
    const data: NotificationData = {
      milestone_id: milestoneData.milestone_id,
      milestone_title: milestoneData.milestone_title,
      booking_id: milestoneData.booking_id,
      project_id: milestoneData.booking_id,
      project_name: milestoneData.project_name,
      actor_id: milestoneData.actor_id,
      actor_name: milestoneData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'milestone_created', data, template)
  }

  async triggerMilestoneCompleted(
    userId: string,
    milestoneData: {
      milestone_id: string
      milestone_title: string
      booking_id: string
      project_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('milestone_completed')
    const data: NotificationData = {
      milestone_id: milestoneData.milestone_id,
      milestone_title: milestoneData.milestone_title,
      booking_id: milestoneData.booking_id,
      project_id: milestoneData.booking_id,
      project_name: milestoneData.project_name,
      actor_id: milestoneData.actor_id,
      actor_name: milestoneData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'milestone_completed', data, template)
  }

  async triggerMilestoneApproved(
    userId: string,
    milestoneData: {
      milestone_id: string
      milestone_title: string
      booking_id: string
      project_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('milestone_approved')
    const data: NotificationData = {
      milestone_id: milestoneData.milestone_id,
      milestone_title: milestoneData.milestone_title,
      booking_id: milestoneData.booking_id,
      project_id: milestoneData.booking_id,
      project_name: milestoneData.project_name,
      actor_id: milestoneData.actor_id,
      actor_name: milestoneData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'milestone_approved', data, template)
  }

  async triggerMilestoneRejected(
    userId: string,
    milestoneData: {
      milestone_id: string
      milestone_title: string
      booking_id: string
      project_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('milestone_rejected')
    const data: NotificationData = {
      milestone_id: milestoneData.milestone_id,
      milestone_title: milestoneData.milestone_title,
      booking_id: milestoneData.booking_id,
      project_id: milestoneData.booking_id,
      project_name: milestoneData.project_name,
      actor_id: milestoneData.actor_id,
      actor_name: milestoneData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'milestone_rejected', data, template)
  }

  // Booking notifications
  async triggerBookingCreated(
    userId: string,
    bookingData: {
      booking_id: string
      booking_title: string
      service_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('booking_created')
    const data: NotificationData = {
      booking_id: bookingData.booking_id,
      booking_title: bookingData.booking_title,
      service_name: bookingData.service_name,
      actor_id: bookingData.actor_id,
      actor_name: bookingData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'booking_created', data, template)
  }

  async triggerBookingUpdated(
    userId: string,
    bookingData: {
      booking_id: string
      booking_title: string
      service_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('booking_updated')
    const data: NotificationData = {
      booking_id: bookingData.booking_id,
      booking_title: bookingData.booking_title,
      service_name: bookingData.service_name,
      actor_id: bookingData.actor_id,
      actor_name: bookingData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'booking_updated', data, template)
  }

  async triggerBookingCancelled(
    userId: string,
    bookingData: {
      booking_id: string
      booking_title: string
      service_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('booking_cancelled')
    const data: NotificationData = {
      booking_id: bookingData.booking_id,
      booking_title: bookingData.booking_title,
      service_name: bookingData.service_name,
      actor_id: bookingData.actor_id,
      actor_name: bookingData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'booking_cancelled', data, template)
  }

  async triggerBookingConfirmed(
    userId: string,
    bookingData: {
      booking_id: string
      booking_title: string
      service_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('booking_confirmed')
    const data: NotificationData = {
      booking_id: bookingData.booking_id,
      booking_title: bookingData.booking_title,
      service_name: bookingData.service_name,
      actor_id: bookingData.actor_id,
      actor_name: bookingData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'booking_confirmed', data, template)
  }

  async triggerBookingReminder(
    userId: string,
    bookingData: {
      booking_id: string
      booking_title: string
      service_name: string
      scheduled_date: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('booking_reminder')
    const data: NotificationData = {
      booking_id: bookingData.booking_id,
      booking_title: bookingData.booking_title,
      service_name: bookingData.service_name,
      scheduled_date: bookingData.scheduled_date,
      actor_id: bookingData.actor_id,
      actor_name: bookingData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'booking_reminder', data, template)
  }

  async triggerBookingCompleted(
    userId: string,
    bookingData: {
      booking_id: string
      booking_title: string
      service_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('booking_completed')
    const data: NotificationData = {
      booking_id: bookingData.booking_id,
      booking_title: bookingData.booking_title,
      service_name: bookingData.service_name,
      actor_id: bookingData.actor_id,
      actor_name: bookingData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'booking_completed', data, template)
  }

  // Payment notifications
  async triggerPaymentReceived(
    userId: string,
    paymentData: {
      payment_id: string
      amount: number
      currency: string
      booking_id: string
      booking_title: string
    }
  ) {
    const template = getNotificationTemplate('payment_received')
    const data: NotificationData = {
      payment_id: paymentData.payment_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      booking_id: paymentData.booking_id,
      booking_title: paymentData.booking_title
    }

    return notificationService.createFromTemplate(userId, 'payment_received', data, template)
  }

  async triggerPaymentFailed(
    userId: string,
    paymentData: {
      payment_id: string
      amount: number
      currency: string
      booking_id: string
      booking_title: string
    }
  ) {
    const template = getNotificationTemplate('payment_failed')
    const data: NotificationData = {
      payment_id: paymentData.payment_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      booking_id: paymentData.booking_id,
      booking_title: paymentData.booking_title
    }

    return notificationService.createFromTemplate(userId, 'payment_failed', data, template)
  }

  // Invoice notifications
  async triggerInvoiceCreated(
    userId: string,
    invoiceData: {
      invoice_id: string
      invoice_number: string
      booking_id: string
      booking_title: string
    }
  ) {
    const template = getNotificationTemplate('invoice_created')
    const data: NotificationData = {
      invoice_id: invoiceData.invoice_id,
      invoice_number: invoiceData.invoice_number,
      booking_id: invoiceData.booking_id,
      booking_title: invoiceData.booking_title
    }

    return notificationService.createFromTemplate(userId, 'invoice_created', data, template)
  }

  async triggerInvoiceOverdue(
    userId: string,
    invoiceData: {
      invoice_id: string
      invoice_number: string
      booking_id: string
      booking_title: string
    }
  ) {
    const template = getNotificationTemplate('invoice_overdue')
    const data: NotificationData = {
      invoice_id: invoiceData.invoice_id,
      invoice_number: invoiceData.invoice_number,
      booking_id: invoiceData.booking_id,
      booking_title: invoiceData.booking_title
    }

    return notificationService.createFromTemplate(userId, 'invoice_overdue', data, template)
  }

  // Message notifications
  async triggerMessageReceived(
    userId: string,
    messageData: {
      message_id: string
      sender_id: string
      sender_name: string
    }
  ) {
    const template = getNotificationTemplate('message_received')
    const data: NotificationData = {
      message_id: messageData.message_id,
      sender_id: messageData.sender_id,
      sender_name: messageData.sender_name
    }

    return notificationService.createFromTemplate(userId, 'message_received', data, template)
  }

  // Document notifications
  async triggerDocumentUploaded(
    userId: string,
    documentData: {
      document_id: string
      document_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('document_uploaded')
    const data: NotificationData = {
      document_id: documentData.document_id,
      document_name: documentData.document_name,
      actor_id: documentData.actor_id,
      actor_name: documentData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'document_uploaded', data, template)
  }

  async triggerDocumentApproved(
    userId: string,
    documentData: {
      document_id: string
      document_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('document_approved')
    const data: NotificationData = {
      document_id: documentData.document_id,
      document_name: documentData.document_name,
      actor_id: documentData.actor_id,
      actor_name: documentData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'document_approved', data, template)
  }

  async triggerDocumentRejected(
    userId: string,
    documentData: {
      document_id: string
      document_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('document_rejected')
    const data: NotificationData = {
      document_id: documentData.document_id,
      document_name: documentData.document_name,
      actor_id: documentData.actor_id,
      actor_name: documentData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'document_rejected', data, template)
  }

  // System notifications
  async triggerSystemAnnouncement(
    userId: string,
    announcementData: {
      message: string
      metadata?: Record<string, any>
    }
  ) {
    const template = getNotificationTemplate('system_announcement')
    const data: NotificationData = {
      metadata: {
        message: announcementData.message,
        ...announcementData.metadata
      }
    }

    return notificationService.createFromTemplate(userId, 'system_announcement', data, template)
  }

  async triggerMaintenanceScheduled(
    userId: string,
    maintenanceData: {
      maintenance_date: string
      duration?: string
      description?: string
    }
  ) {
    const template = getNotificationTemplate('maintenance_scheduled')
    const data: NotificationData = {
      metadata: {
        maintenance_date: maintenanceData.maintenance_date,
        duration: maintenanceData.duration,
        description: maintenanceData.description
      }
    }

    return notificationService.createFromTemplate(userId, 'maintenance_scheduled', data, template)
  }

  // Project notifications
  async triggerDeadlineApproaching(
    userId: string,
    projectData: {
      project_id: string
      project_name: string
      deadline_date: string
    }
  ) {
    const template = getNotificationTemplate('deadline_approaching')
    const data: NotificationData = {
      project_id: projectData.project_id,
      project_name: projectData.project_name,
      metadata: {
        deadline_date: projectData.deadline_date
      }
    }

    return notificationService.createFromTemplate(userId, 'deadline_approaching', data, template)
  }

  async triggerProjectDelayed(
    userId: string,
    projectData: {
      project_id: string
      project_name: string
      reason?: string
    }
  ) {
    const template = getNotificationTemplate('project_delayed')
    const data: NotificationData = {
      project_id: projectData.project_id,
      project_name: projectData.project_name,
      metadata: {
        reason: projectData.reason
      }
    }

    return notificationService.createFromTemplate(userId, 'project_delayed', data, template)
  }

  async triggerClientFeedback(
    userId: string,
    feedbackData: {
      project_id: string
      project_name: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('client_feedback')
    const data: NotificationData = {
      project_id: feedbackData.project_id,
      project_name: feedbackData.project_name,
      actor_id: feedbackData.actor_id,
      actor_name: feedbackData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'client_feedback', data, template)
  }

  async triggerTeamMention(
    userId: string,
    mentionData: {
      entity_id: string
      entity_type: string
      actor_id: string
      actor_name: string
    }
  ) {
    const template = getNotificationTemplate('team_mention')
    const data: NotificationData = {
      entity_id: mentionData.entity_id,
      entity_type: mentionData.entity_type,
      actor_id: mentionData.actor_id,
      actor_name: mentionData.actor_name
    }

    return notificationService.createFromTemplate(userId, 'team_mention', data, template)
  }
}

// Export singleton instance
export const notificationTriggerService = NotificationTriggerService.getInstance()
