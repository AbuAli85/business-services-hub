# Insight Notifier Edge Function

This Supabase Edge Function handles automated notification delivery for the AI-powered insight system. It supports multiple notification channels including Slack, Email, Webhooks, and Dashboard notifications.

## 🚀 Features

- **Multi-channel Notifications**: Slack, Email, Webhook, Dashboard
- **Severity-based Routing**: Route notifications based on insight importance
- **Test Mode**: Safe testing without sending real notifications
- **Error Handling**: Comprehensive retry logic and failure tracking
- **Audit Trail**: Complete logging of all notification attempts

## 📋 Prerequisites

- Supabase project with Edge Functions enabled
- Notification channels configured in the database
- Required environment variables set

## 🔧 Environment Variables

The following environment variables must be set in your Supabase project:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Slack Configuration (if using Slack notifications)
SLACK_WEBHOOK_URL=your_slack_webhook_url

# Optional: Email Configuration (if using email notifications)
EMAIL_SERVICE_API_KEY=your_email_service_api_key
```

## 🗄️ Database Requirements

This function requires the following tables to be created by running the Phase 7B migrations:

- `insight_events` - Stores generated insights
- `notification_channels` - Configuration for notification delivery
- `insight_notifications` - Tracks notification delivery attempts
- `insight_run_logs` - Logs automation runs

## 📦 Deployment

### 1. Deploy the Edge Function

```bash
# From your project root
supabase functions deploy insight-notifier
```

### 2. Verify Deployment

```bash
# Test the function
supabase functions invoke insight-notifier --method POST --data '{"test_mode": true}'
```

### 3. Configure Notification Channels

Insert your notification channel configurations:

```sql
-- Slack Channel
INSERT INTO public.notification_channels (name, type, config, severity_filter) VALUES
  ('executive-alerts', 'slack', 
   '{"webhook_url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"}', 
   ARRAY['critical']);

-- Email Channel
INSERT INTO public.notification_channels (name, type, config, severity_filter) VALUES
  ('business-insights', 'email',
   '{"recipients": ["admin@company.com"], "subject_template": "Daily Business Insights"}',
   ARRAY['critical', 'high']);
```

## 🔗 API Usage

### Manual Trigger

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/insight-notifier' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "trigger_type": "manual",
    "hours_back": 24,
    "min_severity": "high",
    "test_mode": false
  }'
```

### Test Mode

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/insight-notifier' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "trigger_type": "manual",
    "test_mode": true
  }'
```

## 📊 Notification Channels

### Slack Notifications

Slack notifications are sent as rich messages with:
- Header with insight title and emoji
- Fields showing severity, confidence, type, and generation time
- Summary section with insight details
- Recommendation section (if available)
- Test mode indicator (if applicable)

**Configuration:**
```json
{
  "type": "slack",
  "config": {
    "webhook_url": "https://hooks.slack.com/services/...",
    "channel": "#executive-alerts"
  },
  "severity_filter": ["critical", "high"]
}
```

### Email Notifications

Email notifications include:
- Professional HTML formatting
- Insight summary and recommendations
- Severity-based styling
- Test mode indicators

**Configuration:**
```json
{
  "type": "email",
  "config": {
    "recipients": ["admin@company.com"],
    "subject_template": "Business Insight Alert"
  },
  "severity_filter": ["critical", "high", "medium"]
}
```

### Webhook Notifications

Webhook notifications send structured JSON payloads:
- Complete insight data
- Metadata about the notification
- Test mode indicators

**Configuration:**
```json
{
  "type": "webhook",
  "config": {
    "url": "https://api.company.com/webhook",
    "headers": {"Authorization": "Bearer token"}
  },
  "severity_filter": ["critical"]
}
```

### Dashboard Notifications

Dashboard notifications are handled via Supabase realtime subscriptions:
- Real-time updates in the UI
- Toast notifications
- In-app alert display

**Configuration:**
```json
{
  "type": "dashboard",
  "config": {
    "show_toast": true,
    "auto_dismiss": false
  },
  "severity_filter": ["critical", "high", "medium"]
}
```

## 🔍 Monitoring & Debugging

### View Function Logs

```bash
supabase functions logs insight-notifier
```

### Check Notification Status

Query the `insight_notifications` table to see delivery status:

```sql
SELECT 
  in.status,
  in.sent_at,
  in.error_message,
  nc.name as channel_name,
  ie.title as insight_title
FROM insight_notifications in
JOIN notification_channels nc ON in.channel_id = nc.id
JOIN insight_events ie ON in.insight_id = ie.id
ORDER BY in.created_at DESC
LIMIT 10;
```

### View Run Statistics

```sql
SELECT 
  total_runs,
  successful_runs,
  failed_runs,
  avg_duration_ms,
  total_insights_generated,
  last_run_at,
  last_run_status
FROM get_insight_run_stats(7);
```

## 🛠️ Development

### Local Testing

1. Start Supabase locally:
```bash
supabase start
```

2. Deploy function locally:
```bash
supabase functions serve insight-notifier
```

3. Test with curl:
```bash
curl -X POST 'http://localhost:54321/functions/v1/insight-notifier' \
  -H 'Content-Type: application/json' \
  -d '{"test_mode": true}'
```

### TypeScript Configuration

The function includes:
- TypeScript configuration for Deno environment
- Type declarations for Deno globals
- Error suppression for URL imports

## 🚨 Troubleshooting

### Common Issues

1. **Function not deploying**: Ensure you're in the project root and have proper permissions
2. **Notifications not sending**: Check environment variables and channel configuration
3. **TypeScript errors**: The `@ts-expect-error` comments are intentional for Deno imports

### Error Codes

- `UNAUTHORIZED`: Missing or invalid authentication
- `NOTIFICATION_ERROR`: Failed to send notification
- `INTERNAL_ERROR`: Unexpected server error

## 📈 Performance

- **Target Response Time**: < 30 seconds for 100 notifications
- **Concurrent Processing**: Handles multiple channels simultaneously
- **Error Recovery**: Automatic retry logic with exponential backoff
- **Rate Limiting**: Built-in protection against spam

## 🔒 Security

- **Authentication**: Requires valid Supabase JWT tokens
- **Authorization**: Admin/Provider role required for manual triggers
- **Input Validation**: All parameters are validated and sanitized
- **Error Handling**: No sensitive data exposed in error messages

---

**This Edge Function is part of the Phase 7B Automation & Triggers implementation for the AI-powered business insights system.**
