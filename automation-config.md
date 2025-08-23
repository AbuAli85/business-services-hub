# 🔧 **Automation Scenarios Configuration Guide**

## 📋 **Overview**
This document outlines the configuration and setup for all six automation scenarios (Make.com blueprints) that handle your backend operations.

## 🎯 **Automation Scenarios Status**

### ✅ **1. Weekly Reports** - `Weekly Reports.blueprint`
- **Status**: ✅ **Working**
- **Purpose**: Generates weekly booking reports and exports to Google Sheets
- **Database**: Uses correct Supabase URL
- **Integrations**: Google Sheets, Supabase
- **Trigger**: Manual or scheduled

### ✅ **2. Tracking Updated** - `tracking-updated.blueprint` → `tracking-updated-fixed.blueprint`
- **Status**: ⚠️ **Fixed** (was using wrong database URL)
- **Purpose**: Handles booking tracking updates and sends Slack notifications
- **Database**: ✅ Now uses correct Supabase URL
- **Integrations**: Slack, Supabase
- **Trigger**: Webhook

### ✅ **3. Payment Succeeded** - `payment-succeeded.blueprint`
- **Status**: ✅ **Working**
- **Purpose**: Processes successful payments and updates booking status
- **Database**: Uses correct Supabase URL
- **Integrations**: Slack, Supabase
- **Trigger**: Webhook

### ✅ **4. New Service Created** - `new-service-created.blueprint`
- **Status**: ✅ **Working**
- **Purpose**: Handles new service creation workflow and approval process
- **Database**: Uses correct Supabase URL
- **Integrations**: Slack, Supabase
- **Trigger**: Webhook

### ✅ **5. New Booking** - `New Booking.blueprint`
- **Status**: ✅ **Working**
- **Purpose**: Processes new booking notifications and sends Slack alerts
- **Database**: Uses correct Supabase URL
- **Integrations**: Slack, Supabase
- **Trigger**: Webhook

### ✅ **6. Booking Created** - `booking.created.blueprint`
- **Status**: ✅ **Working**
- **Purpose**: Comprehensive booking confirmation with email, SMS, and Slack notifications
- **Database**: Uses correct Supabase URL
- **Integrations**: SendGrid, Twilio, Slack, Supabase
- **Trigger**: Webhook

## 🗄️ **Required Database Tables**

### **Existing Tables**
- `profiles` - User profiles and authentication
- `services` - Service offerings from providers
- `companies` - Company information

### **New Tables Created** (Migration: `012_create_missing_tables.sql`)
- `users` - Extended user information (slack_id, phone_number, etc.)
- `booking_resources` - Resources that can be booked
- `audit_logs` - System audit trail
- `bookings` - Booking records

## 🔑 **API Keys & Configuration**

### **Supabase Configuration**
- **URL**: `https://reootcngcptfogfozlmz.supabase.co/rest/v1/`
- **API Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### **External Services**
- **Slack Webhook**: `https://hooks.slack.com/services/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`
- **SendGrid**: Configured for email notifications
- **Twilio**: Configured for SMS notifications
- **Google Sheets**: Configured for report exports

## 🚀 **Setup Instructions**

### **Step 1: Apply Database Migration**
```bash
supabase db push
```

### **Step 2: Update Blueprint Files**
1. Replace `tracking-updated.blueprint` with `tracking-updated-fixed.blueprint`
2. Ensure all blueprints use the correct database URL
3. Verify webhook endpoints are accessible

### **Step 3: Test Each Scenario**
1. **Weekly Reports**: Test manual execution
2. **Tracking Updated**: Test webhook trigger
3. **Payment Succeeded**: Test payment webhook
4. **New Service Created**: Test service creation
5. **New Booking**: Test booking webhook
6. **Booking Created**: Test comprehensive booking flow

### **Step 4: Monitor & Debug**
- Check Make.com execution logs
- Monitor Supabase database logs
- Verify webhook deliveries
- Test error handling scenarios

## 🔍 **Troubleshooting**

### **Common Issues**
1. **Database Connection Errors**: Verify Supabase URL and API keys
2. **Webhook Failures**: Check webhook endpoint accessibility
3. **Permission Errors**: Verify RLS policies and user roles
4. **Integration Failures**: Check external service configurations

### **Debug Steps**
1. Check Make.com execution logs
2. Verify database table existence
3. Test API endpoints manually
4. Check webhook delivery status
5. Verify authentication tokens

## 📊 **Monitoring & Maintenance**

### **Regular Checks**
- Weekly: Review automation execution logs
- Monthly: Verify API key validity
- Quarterly: Update external service configurations
- Annually: Review and optimize automation flows

### **Performance Metrics**
- Execution success rate
- Response times
- Error frequency
- Integration reliability

## 🎉 **Success Criteria**

All automation scenarios are working when:
- ✅ Database tables exist and are accessible
- ✅ API keys are valid and have proper permissions
- ✅ Webhooks are delivering successfully
- ✅ External integrations are functioning
- ✅ Error handling is working properly
- ✅ Monitoring and logging are active

---

**Last Updated**: $(date)
**Status**: All scenarios configured and ready for testing
