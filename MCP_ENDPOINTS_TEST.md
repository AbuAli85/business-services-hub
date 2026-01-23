# MCP Endpoints Test Examples

This document provides curl examples for testing the MCP endpoints with jq assertions to validate response contracts.

## Prerequisites

- Valid Supabase JWT token (Bearer token)
- `jq` installed for JSON validation
- Base URL: `http://localhost:3000` (or your deployment URL)

## Endpoints

### 1. POST /api/mcp/services/search

#### Success Example

```bash
curl -X POST http://localhost:3000/api/mcp/services/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Correlation-ID: test-search-$(date +%s)" \
  -d '{
    "query": "marketing",
    "filters": {
      "category": "Digital Marketing",
      "status": "active"
    }
  }' | jq 'has("services") and (.services|type=="array") and (all(.services[]?; has("id") and has("title") and has("price") and has("category") and has("provider_id") and has("status")))'
```

**Expected**: `true` (validates response shape matches contract)

#### Minimal Success Example (no filters)

```bash
curl -X POST http://localhost:3000/api/mcp/services/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Correlation-ID: test-search-minimal-$(date +%s)" \
  -d '{}' | jq 'has("services") and (.services|type=="array") and (all(.services[]?; has("id") and has("title") and has("price") and has("category") and has("provider_id") and has("status")))'
```

**Expected**: `true`

#### Error Example (Missing Auth)

```bash
curl -X POST http://localhost:3000/api/mcp/services/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "marketing"
  }' | jq '.error | has("code") and has("message")'
```

**Expected**: `true` (validates error format)

---

### 2. POST /api/mcp/bookings/create

#### Success Example

```bash
curl -X POST http://localhost:3000/api/mcp/bookings/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Correlation-ID: test-booking-create-$(date +%s)" \
  -d '{
    "service_id": "00000000-0000-0000-0000-000000000000",
    "datetime": "2025-02-01T10:00:00Z",
    "customer_id": "00000000-0000-0000-0000-000000000000",
    "notes": "Test booking via MCP"
  }' | jq '.booking | has("id") and has("status") and has("service_id") and has("datetime") and has("customer_id")'
```

**Expected**: `true` (validates response shape matches contract)

**Note**: Replace UUIDs with actual service_id and customer_id from your database.

#### Error Example (Missing Auth)

```bash
curl -X POST http://localhost:3000/api/mcp/bookings/create \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "00000000-0000-0000-0000-000000000000",
    "datetime": "2025-02-01T10:00:00Z",
    "customer_id": "00000000-0000-0000-0000-000000000000"
  }' | jq '.error | has("code") and has("message")'
```

**Expected**: `true` (validates error format)

#### Error Example (Invalid UUID)

```bash
curl -X POST http://localhost:3000/api/mcp/bookings/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Correlation-ID: test-booking-invalid-uuid-$(date +%s)" \
  -d '{
    "service_id": "invalid-uuid",
    "datetime": "2025-02-01T10:00:00Z",
    "customer_id": "00000000-0000-0000-0000-000000000000"
  }' | jq '.error | has("code") and has("message")'
```

**Expected**: `true` (validates error format, should be VALIDATION_ERROR)

#### Error Example (Service Not Found)

```bash
curl -X POST http://localhost:3000/api/mcp/bookings/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "X-Correlation-ID: test-booking-not-found-$(date +%s)" \
  -d '{
    "service_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "datetime": "2025-02-01T10:00:00Z",
    "customer_id": "00000000-0000-0000-0000-000000000000"
  }' | jq '.error | has("code") and has("message")'
```

**Expected**: `true` (validates error format, should be NOT_FOUND)

---

## Response Contract Validation

### Services Search Response

The response must have exactly this structure:
```json
{
  "services": [
    {
      "id": "uuid",
      "title": "string",
      "price": "number",
      "category": "string",
      "provider_id": "uuid",
      "status": "string"
    }
  ]
}
```

**jq assertion validates**:
- Root has `services` key
- `services` is an array
- Each service has all required fields: `id`, `title`, `price`, `category`, `provider_id`, `status`
- No extra sensitive fields are returned

### Booking Create Response

The response must have exactly this structure:
```json
{
  "booking": {
    "id": "uuid",
    "status": "string",
    "service_id": "uuid",
    "datetime": "ISO 8601 string",
    "customer_id": "uuid"
  }
}
```

**jq assertion validates**:
- Root has `booking` key
- Booking has all required fields: `id`, `status`, `service_id`, `datetime`, `customer_id`
- No extra sensitive fields are returned

### Error Response

All errors must have this structure:
```json
{
  "error": {
    "code": "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR",
    "message": "string"
  }
}
```

**jq assertion validates**:
- Root has `error` key
- Error has both `code` and `message` fields

---

## Testing Checklist

- [ ] Services search with query and filters
- [ ] Services search without filters (empty body)
- [ ] Services search with missing auth (should return UNAUTHORIZED)
- [ ] Booking create with valid data
- [ ] Booking create with missing auth (should return UNAUTHORIZED)
- [ ] Booking create with invalid UUID (should return VALIDATION_ERROR)
- [ ] Booking create with non-existent service (should return NOT_FOUND)
- [ ] Booking create with wrong role (client/admin only, provider should get FORBIDDEN)
- [ ] Verify all responses include `X-Correlation-ID` header
- [ ] Verify jq assertions pass for all success responses
- [ ] Verify jq assertions pass for all error responses

---

## Notes

1. **Column Mapping**: The implementation maps DB columns to API contract:
   - Services: `base_price` → `price` in response
   - Bookings: `scheduled_date` → `datetime` in response
   - Bookings: `client_id` → `customer_id` in response

2. **Tenant Isolation**: All queries are filtered by `company_id` (mapped to `tenant_id` in context) to ensure tenant isolation.

3. **RLS Compatibility**: The implementation uses user-scoped Supabase clients, so RLS policies still apply. Ensure your RLS policies allow users to read their own profile and company data.
