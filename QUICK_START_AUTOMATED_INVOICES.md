# 🚀 Quick Start: Automated Invoice Generation

Get your automated invoice system up and running in 5 minutes!

---

## ✅ Prerequisites

- ✓ Supabase project configured
- ✓ Database tables: `bookings`, `invoices`, `invoice_items`, `profiles`, `companies`, `services`
- ✓ Environment variables set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## 🎯 Option 1: API Endpoint (Recommended)

### Generate Invoice for Single Booking

```bash
curl -X POST https://your-app.com/api/invoices/generate-automated \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "your-booking-uuid",
    "options": {
      "daysUntilDue": 30,
      "autoSendEmail": true
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice generated successfully",
  "invoice": { "id": "...", "invoice_number": "INV-202410-0001", ... },
  "pdf_url": "https://...invoice.pdf"
}
```

### Auto-Generate for All Approved Bookings

```bash
curl -X GET https://your-app.com/api/invoices/generate-automated
```

---

## 🎯 Option 2: Direct Function Call

```typescript
import { generateInvoiceFromBooking } from '@/lib/workflows/generateInvoiceAutomated'

// In your code (server-side only)
const result = await generateInvoiceFromBooking(bookingId, {
  daysUntilDue: 30,
  autoSendEmail: true
})

if (result.success) {
  console.log('✅ Invoice:', result.invoice)
  console.log('📄 PDF:', result.pdfUrl)
}
```

---

## 🎯 Option 3: Smart Invoice Service

Use your existing service (now powered by automation):

```typescript
import { smartInvoiceService } from '@/lib/smart-invoice-service'

const invoice = await smartInvoiceService.generateInvoiceOnApproval(bookingId)
```

---

## 🔄 Automation Setup

### Option A: Database Trigger (PostgreSQL)

```sql
-- Auto-generate invoice when booking is approved
CREATE OR REPLACE FUNCTION auto_generate_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Call your API endpoint
    PERFORM net.http_post(
      url := 'https://your-app.com/api/invoices/generate-automated',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object('bookingId', NEW.id)::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_booking_approved
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_invoice();
```

### Option B: Supabase Edge Function

```typescript
// supabase/functions/auto-invoice/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { record } = await req.json()
  
  // When booking is approved
  if (record.status === 'approved') {
    await fetch('https://your-app.com/api/invoices/generate-automated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: record.id })
    })
  }
  
  return new Response('OK')
})
```

### Option C: Cron Job (Vercel/Netlify)

```typescript
// app/api/cron/invoices/route.ts
export async function GET() {
  // Runs daily at midnight
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/invoices/generate-automated`
  )
  return response
}
```

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/invoices",
    "schedule": "0 0 * * *"
  }]
}
```

### Option D: Make.com Scenario

1. **Watch Bookings**: Trigger on new row where `status = 'approved'`
2. **HTTP Request**: POST to `/api/invoices/generate-automated`
3. **Update Booking**: Store invoice ID back to booking

---

## 🧪 Testing

### 1. Test Single Invoice

```typescript
// Test in your app or via API client
const bookingId = 'test-booking-uuid'

const response = await fetch('/api/invoices/generate-automated', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    bookingId,
    options: { autoSendEmail: false } // Don't send emails during testing
  })
})

const result = await response.json()
console.log(result)
```

### 2. Check Database Relations

```sql
-- Verify booking has all required data
SELECT 
  b.id,
  b.amount,
  b.status,
  s.title as service_title,
  p_provider.full_name as provider_name,
  c_provider.name as provider_company,
  p_client.full_name as client_name,
  c_client.name as client_company
FROM bookings b
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN profiles p_provider ON s.provider_id = p_provider.id
LEFT JOIN companies c_provider ON p_provider.company_id = c_provider.id
LEFT JOIN profiles p_client ON b.client_id = p_client.id
LEFT JOIN companies c_client ON p_client.company_id = c_client.id
WHERE b.id = 'your-booking-id';
```

---

## 🐛 Troubleshooting

### Error: "Booking not found or missing required relations"

**Fix:**
- Ensure booking exists
- Check `service_id` is valid
- Verify service has `provider_id`
- Confirm `client_id` exists

### Error: "Failed to map booking data"

**Fix:**
- Provider must have profile data
- Client must have profile data
- Company data is optional but recommended

### No Email Sent

**Fix:**
- Verify `/api/send-email` endpoint exists
- Check email service credentials
- Ensure client email is valid

---

## 📊 Monitor Generation

```sql
-- Check recent invoices
SELECT 
  i.invoice_number,
  i.created_at,
  i.total_amount,
  i.status,
  i.pdf_url,
  b.id as booking_id
FROM invoices i
LEFT JOIN bookings b ON i.booking_id = b.id
ORDER BY i.created_at DESC
LIMIT 10;
```

---

## 🎨 Customize

### Change VAT Rate

Edit `lib/invoice-data-fetcher.ts`:
```typescript
const vatRate = 5.0 // Change to your country's VAT rate
```

### Change Due Days

```typescript
await generateInvoiceFromBooking(bookingId, {
  daysUntilDue: 45 // Change from 30 to 45 days
})
```

### Customize Email Template

Edit `lib/workflows/generateInvoiceAutomated.ts`:
```typescript
// Find sendInvoiceNotifications function
// Modify the HTML template
```

---

## 📚 Full Documentation

For complete documentation, see:
- **AUTOMATED_INVOICE_SYSTEM.md** - Complete system overview
- **examples/invoice-generation-examples.ts** - Code examples
- Inline code documentation in each file

---

## 🚨 Important Notes

1. **Server-Side Only**: Never use service role key on client side
2. **Data Validation**: System validates all data before generation
3. **Idempotent**: Won't create duplicate invoices for same booking
4. **Error Handling**: Graceful error handling with detailed logging
5. **PDF Storage**: PDFs stored in Supabase Storage for caching

---

## ✨ Next Steps

1. ✅ Test with a sample booking
2. ✅ Set up automation (trigger/cron)
3. ✅ Customize email templates
4. ✅ Monitor invoice generation
5. ✅ Add webhook notifications (optional)

---

**Need Help?** Check the detailed logs in your server console for debugging information.

**Ready to go!** 🎉

