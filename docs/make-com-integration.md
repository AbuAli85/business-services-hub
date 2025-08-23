# 🔄 Make.com Integration Guide

## 📋 **Overview**
This document outlines the complete integration between your Business Services Hub and Make.com (formerly Integromat) automation scenarios.

## 🎯 **6 Automation Scenarios**

### **1. 📊 Tracking Updated**
- **Webhook ID**: 2954847
- **Trigger**: Service tracking/status changes
- **Endpoint**: `POST /api/webhooks` with `event: "tracking-updated"`
- **Data Required**: `{ booking_id, status, tracking_info }`

### **2. 🎯 Booking Created**
- **Webhook ID**: 2958307
- **Trigger**: New service bookings
- **Endpoint**: `POST /api/webhooks` with `event: "booking-created"`
- **Data Required**: `{ client_id, service_id, resource_id, start_time, end_time, total_cost }`

### **3. 🆕 New Service Created**
- **Webhook ID**: 2954918
- **Trigger**: New service submissions
- **Endpoint**: `POST /api/webhooks` with `event: "new-service-created"`
- **Data Required**: `{ service_id, provider_id, service_name }`

### **4. 💰 Payment Succeeded**
- **Webhook ID**: 2954951
- **Trigger**: Payment completions
- **Endpoint**: `POST /api/webhooks` with `event: "payment-succeeded"`
- **Data Required**: `{ booking_id, amount, payment_method }`

### **5. 📈 Weekly Reports**
- **Webhook ID**: Scheduled (not instant)
- **Trigger**: Weekly analytics (every Monday)
- **Endpoint**: `POST /api/webhooks` with `event: "weekly-report"`
- **Data Required**: None (automatically generated)

### **6. 🔔 New Booking**
- **Webhook ID**: 2954449
- **Trigger**: Alternative booking flow
- **Endpoint**: `POST /api/webhooks` with `event: "booking-created"`
- **Data Required**: Same as Booking Created

## 🗄️ **Database Schema Requirements**

### **Required Tables**
1. **`bookings`** - Main booking records
2. **`users`** - User profiles (Make.com expects this)
3. **`profiles`** - Extended user information
4. **`services`** - Service offerings
5. **`booking_resources`** - Bookable resources
6. **`audit_logs`** - System activity tracking

### **Key Columns for Make.com**
```sql
-- Bookings table
id, client_id, provider_id, service_id, resource_id, 
start_time, end_time, total_cost, status, created_at

-- Users table  
id, full_name, email, role, status, phone_number, slack_id

-- Services table
id, title, description, approval_status, status

-- Booking Resources table
id, name, type, description, location, hourly_rate
```

## 🔌 **API Endpoints**

### **Webhook Endpoint**
```
POST /api/webhooks
Content-Type: application/json

{
  "event": "event-name",
  "webhook_id": "unique-id",
  "data": { ... }
}
```

### **Test Endpoint**
```
GET /api/webhooks?event=event-name
```

## 🚀 **Setup Instructions**

### **Step 1: Apply Database Migrations**
```bash
npx supabase db push
```

### **Step 2: Update Make.com Webhook URLs**
Replace the Supabase URLs in your Make.com scenarios with:
```
https://your-domain.com/api/webhooks
```

### **Step 3: Configure Webhook Headers**
Add these headers to your Make.com HTTP requests:
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer your-api-key"
}
```

### **Step 4: Test Each Scenario**
Use the test endpoint to verify each webhook:
```
GET /api/webhooks?event=booking-created
```

## 🔧 **Make.com Scenario Configuration**

### **Webhook Triggers**
Each scenario should use the **Custom Webhook** module with:
- **Hook**: Your unique webhook ID
- **Max Results**: 1
- **Data Structure**: As defined in the scenario

### **HTTP Actions**
Use **HTTP Action** modules to:
1. **Fetch Data**: Get booking/user/service details
2. **Update Records**: Modify database records
3. **Send Notifications**: Slack, email, SMS

### **Data Mapping**
Ensure proper data mapping between:
- Webhook payload → HTTP requests
- Database responses → Notification content
- Error handling → Retry logic

## 📊 **Data Flow Examples**

### **Booking Created Flow**
```
1. Webhook Trigger → booking-created
2. Fetch Booking Details → GET /bookings/{id}
3. Fetch User Info → GET /users/{client_id}
4. Fetch Resource Info → GET /booking_resources/{resource_id}
5. Send Email → SendGrid
6. Send SMS → Twilio
7. Post to Slack → Slack API
```

### **New Service Created Flow**
```
1. Webhook Trigger → new-service-created
2. Fetch Provider Info → GET /profiles/{provider_id}
3. Update Service Status → PATCH /services/{id}
4. Create Audit Log → POST /audit_logs
5. Post to Slack → Slack API
```

## 🛡️ **Security & Permissions**

### **Row Level Security (RLS)**
- All tables have RLS enabled
- Policies ensure data isolation between providers
- Admin role has full access

### **API Authentication**
- Service role key for webhook operations
- JWT tokens for user authentication
- Rate limiting on webhook endpoints

## 📈 **Monitoring & Debugging**

### **Audit Logs**
All webhook actions are logged in `audit_logs` table:
- Action performed
- Table affected
- Record ID
- Old/New values
- Timestamp

### **Error Handling**
- Comprehensive error logging
- Retry mechanisms in Make.com
- Fallback notifications

### **Performance Metrics**
- Webhook response times
- Database query performance
- Notification delivery rates

## 🔄 **Testing Your Scenarios**

### **Manual Testing**
```bash
# Test booking created webhook
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "event": "booking-created",
    "webhook_id": "test-123",
    "data": {
      "client_id": "uuid",
      "service_id": "uuid",
      "resource_id": "uuid",
      "start_time": "2025-01-20T10:00:00Z",
      "end_time": "2025-01-20T11:00:00Z",
      "total_cost": 100.00
    }
  }'
```

### **Automated Testing**
- Use the GET endpoint to verify webhook readiness
- Check audit logs for successful operations
- Monitor Make.com scenario execution logs

## 🚨 **Troubleshooting**

### **Common Issues**
1. **Missing Tables**: Run database migrations
2. **Permission Errors**: Check RLS policies
3. **Data Mismatches**: Verify column names and types
4. **Webhook Failures**: Check API endpoint availability

### **Debug Steps**
1. Check webhook endpoint response
2. Verify database table structure
3. Review RLS policy permissions
4. Check Make.com scenario logs
5. Monitor audit log entries

## 📚 **Additional Resources**

### **Make.com Documentation**
- [Custom Webhooks](https://www.make.com/en/help/apps/connections/custom-webhook)
- [HTTP Module](https://www.make.com/en/help/apps/connections/http)
- [Error Handling](https://www.make.com/en/help/scenarios/error-handling)

### **Supabase Documentation**
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [API Reference](https://supabase.com/docs/reference/javascript)

## ✅ **Verification Checklist**

- [ ] Database migrations applied successfully
- [ ] All required tables exist with correct schema
- [ ] RLS policies configured properly
- [ ] Webhook API endpoint accessible
- [ ] Make.com scenarios updated with new URLs
- [ ] Test webhooks working correctly
- [ ] Audit logging functional
- [ ] Error handling implemented
- [ ] Security measures in place
- [ ] Documentation complete

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: Ready for Production
