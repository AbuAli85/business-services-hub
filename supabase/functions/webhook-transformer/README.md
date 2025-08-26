# Webhook Transformer Edge Function

This Supabase Edge Function transforms database webhook events and forwards them to Make.com with proper UUID validation and data formatting.

## **What It Does**

1. **Receives database webhooks** from Supabase (INSERT operations)
2. **Validates UUIDs** to prevent "create" string errors
3. **Transforms data** into Make.com expected format
4. **Forwards to Make.com** with proper error handling

## **Supported Tables & Events**

### **Services Table**
- **Event**: `new-service-created`
- **Trigger**: `INSERT` operations
- **Data**: `service_id`, `provider_id`, `service_name`

### **Bookings Table**
- **Event**: `booking-created`
- **Trigger**: `INSERT` operations
- **Data**: `booking_id`, `client_id`, `provider_id`, `service_id`

### **Profiles Table**
- **Event**: `user-registered`
- **Trigger**: `INSERT` operations
- **Data**: `user_id`, `full_name`, `role`

## **Deployment Steps**

### **1. Deploy the Function**
```bash
# From your project root
supabase functions deploy webhook-transformer
```

### **2. Set Environment Variables**
```bash
# Set Make.com webhook URL
supabase secrets set MAKE_WEBHOOK_URL=https://hook.eu2.make.com/your_webhook_id

# Set webhook ID
supabase secrets set MAKE_WEBHOOK_ID=services-webhook
```

### **3. Configure Supabase Database Webhooks**

In your Supabase Dashboard:

1. **Go to Database → Webhooks**
2. **Create webhook for `services` table:**
   - **Name**: `services-webhook`
   - **Table**: `services`
   - **Events**: `INSERT` only
   - **URL**: `https://your-project.supabase.co/functions/v1/webhook-transformer`
   - **Method**: `POST`

3. **Create webhook for `bookings` table:**
   - **Name**: `bookings-webhook`
   - **Table**: `bookings`
   - **Events**: `INSERT` only
   - **URL**: `https://your-project.supabase.co/functions/v1/webhook-transformer`
   - **Method**: `POST`

4. **Create webhook for `profiles` table:**
   - **Name**: `profiles-webhook`
   - **Table**: `profiles`
   - **Events**: `INSERT` only
   - **URL**: `https://your-project.supabase.co/functions/v1/webhook-transformer`
   - **Method**: `POST`

## **How It Works**

1. **Database Event**: Service/booking/profile is created
2. **Supabase Webhook**: Sends raw database record to Edge Function
3. **Edge Function**: 
   - Validates UUIDs
   - Transforms data format
   - Forwards to Make.com
4. **Make.com**: Receives properly formatted data with valid UUIDs

## **Benefits**

- ✅ **Eliminates "create" UUID errors**
- ✅ **Consistent data format** for Make.com
- ✅ **UUID validation** before forwarding
- ✅ **Centralized webhook management**
- ✅ **Better error handling** and logging

## **Testing**

### **Test the Edge Function**
```bash
# Test with sample service data
curl -X POST https://your-project.supabase.co/functions/v1/webhook-transformer \
  -H "Content-Type: application/json" \
  -d '{
    "table": "services",
    "type": "INSERT",
    "record": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "provider_id": "987fcdeb-51a2-43d1-9f12-345678901234",
      "title": "Test Service"
    }
  }'
```

### **Expected Response**
```json
{
  "success": true,
  "message": "Successfully processed services INSERT event",
  "transformed_payload": {
    "event": "new-service-created",
    "webhook_id": "services-webhook",
    "data": {
      "service_id": "123e4567-e89b-12d3-a456-426614174000",
      "provider_id": "987fcdeb-51a2-43d1-9f12-345678901234",
      "service_name": "Test Service"
    }
  }
}
```

## **Troubleshooting**

### **Common Issues**

1. **Function not deployed**: Run `supabase functions deploy webhook-transformer`
2. **Environment variables not set**: Check with `supabase secrets list`
3. **Webhook URL wrong**: Ensure it points to the Edge Function, not directly to Make.com
4. **UUID validation errors**: Check that your database is generating proper UUIDs

### **Logs**
Check function logs in Supabase Dashboard → Edge Functions → webhook-transformer → Logs

## **Next Steps**

After deployment:
1. **Test with a real service creation**
2. **Verify Make.com receives correct UUIDs**
3. **Monitor function logs** for any issues
4. **Add more tables** as needed
