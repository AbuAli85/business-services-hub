export class NotificationsService {
  static async sendMilestoneUpdate(payload: {
    milestoneId: string;
    bookingId: string;
    action: 'created' | 'updated' | 'deleted' | 'reordered';
    title?: string;
  }) {
    console.log('[notify] Milestone update:', payload);
  }

  static async sendApprovalUpdate(payload: {
    milestoneId: string;
    bookingId: string;
    status: 'approved' | 'rejected';
    userId: string;
    comment?: string;
  }) {
    console.log('[notify] Approval update:', payload);
  }

  static async sendCommentNotification(payload: {
    milestoneId: string;
    bookingId: string;
    userId: string;
    content: string;
  }) {
    console.log('[notify] Comment added:', payload);
  }
}


