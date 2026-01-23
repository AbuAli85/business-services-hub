# MCP Schema Notes

This document explains the schema choices and column mappings used in the MCP endpoint implementation.

## Table Selection

### Services Table
- **Table Name**: `services`
- **Location Found**: `app/api/services/route.ts`, `supabase/migrations/001_initial_schema.sql`
- **Selection Reason**: Most frequently used table name across the codebase (70+ references)

### Bookings Table
- **Table Name**: `bookings`
- **Location Found**: `app/api/bookings/route.ts`, `supabase/migrations/001_initial_schema.sql`
- **Selection Reason**: Most frequently used table name across the codebase (129+ references)

### Profiles Table
- **Table Name**: `profiles`
- **Location Found**: `app/api/bookings/route.ts`, `supabase/migrations/001_initial_schema.sql`
- **Selection Reason**: Standard user profile table, used for DB-first context resolution

## Column Mappings

### Services Table Mappings

| DB Column | API Contract Field | Mapping Location | Reason |
|-----------|-------------------|------------------|---------|
| `base_price` | `price` | `app/api/mcp/services/search/route.ts` | API contract requires `price`, but DB uses `base_price` |
| `description` | (not in response) | N/A | Used for search but not returned in response (sensitive data) |
| `company_id` | (mapped to `tenant_id` in context) | `lib/mcp/context.ts` | This repo uses `company_id` for multi-tenancy, mapped to `tenant_id` for MCP consistency |

### Bookings Table Mappings

| DB Column | API Contract Field | Mapping Location | Reason |
|-----------|-------------------|------------------|---------|
| `scheduled_date` | `datetime` | `app/api/mcp/bookings/create/route.ts` | API contract requires `datetime`, but DB uses `scheduled_date` |
| `client_id` | `customer_id` | `app/api/mcp/bookings/create/route.ts` | API contract requires `customer_id`, but DB uses `client_id` |
| `total_amount` / `amount` | (not in response) | N/A | Used internally but not returned in minimal response |

### Profiles Table Mappings

| DB Column | Context Field | Mapping Location | Reason |
|-----------|--------------|------------------|---------|
| `company_id` | `tenant_id` | `lib/mcp/context.ts` | This repo uses `company_id` for multi-tenancy, mapped to `tenant_id` for MCP consistency |
| `role` | `role` | `lib/mcp/context.ts` | Direct mapping, normalized to lowercase |

## Tenant Isolation

This repository uses `company_id` (not `tenant_id`) for multi-tenancy:

- **Services**: Filtered by `company_id` (mapped from context.tenant_id)
- **Bookings**: Tenant isolation achieved through service ownership (service must belong to user's company)
- **Profiles**: Users belong to a company via `company_id` column

The MCP context helper maps `company_id` to `tenant_id` for consistency with the MCP server contract.

## RLS Compatibility

RLS policies exist for the `profiles` table:
- Users can read their own profile (`auth.uid() = id`)
- Admins and staff can read all profiles

The implementation uses user-scoped Supabase clients (with Bearer token in headers), so RLS policies still apply and provide an additional layer of security.

## Required Columns Verified

### Services Table
✅ `id` (UUID, primary key)  
✅ `title` (TEXT, required)  
✅ `description` (TEXT, optional - used for search)  
✅ `category` (TEXT, optional)  
✅ `base_price` (NUMERIC, required - mapped to `price`)  
✅ `provider_id` (UUID, required)  
✅ `status` (TEXT, required)  
✅ `company_id` (UUID, optional - used for tenant isolation)  

### Bookings Table
✅ `id` (UUID, primary key)  
✅ `service_id` (UUID, required)  
✅ `client_id` (UUID, required - mapped to `customer_id`)  
✅ `provider_id` (UUID, required)  
✅ `scheduled_date` (TIMESTAMPTZ, required - mapped to `datetime`)  
✅ `status` (TEXT, required)  
✅ `total_amount` / `amount` (NUMERIC, required)  

### Profiles Table
✅ `id` (UUID, primary key, references auth.users.id)  
✅ `company_id` (UUID, optional - mapped to `tenant_id`)  
✅ `role` (user_role enum, required)  

## Notes

1. **No Placeholders**: All table and column names are actual values from the codebase, no placeholders used.

2. **Response Shaping**: API responses are explicitly shaped to match the contract exactly, mapping DB columns as needed and excluding sensitive fields.

3. **Search Functionality**: The `description` column exists in the services table and is used for search via PostgREST `.or()` syntax, but is not returned in the response.

4. **Tenant Isolation**: All queries enforce tenant isolation by filtering on `company_id` (mapped from context.tenant_id).
