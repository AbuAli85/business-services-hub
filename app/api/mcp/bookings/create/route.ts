// Ensure Node runtime (required for Supabase client and Buffer operations)
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getMcpContext, assertRole, toMcpErrorResponse, createUserScopedClient, extractBearerToken, McpError } from '@/lib/mcp/context';

const createBookingSchema = z.object({
  service_id: z.string().uuid('service_id must be a valid UUID'),
  datetime: z.string().datetime('datetime must be valid ISO 8601'),
  customer_id: z.string().uuid('customer_id must be a valid UUID'),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let correlationId: string;
  try {
    // Extract correlation ID for logging
    correlationId = req.headers.get('x-correlation-id') || 
                     `mcp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // 1. Auth + context (DB-first)
    const context = await getMcpContext(req);
    
    // Log with correlation ID
    console.log(`[${correlationId}] MCP endpoint: /api/mcp/bookings/create`, {
      user_id: context.user_id,
      tenant_id: context.tenant_id,
      role: context.role,
    });
    
    // 2. RBAC: client or admin only
    assertRole(context, ['client', 'admin']);

    // 3. Validate request body (deterministic Zod error handling)
    const body = await req.json();
    const validated = createBookingSchema.parse(body);

    // 4. Get user-scoped client
    const token = extractBearerToken(req);
    const supabase = createUserScopedClient(token);

    // 5. Verify service belongs to tenant (tenant isolation BEFORE insert)
    // Note: This repo uses company_id (not tenant_id) - context.tenant_id contains company_id
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, company_id, provider_id, base_price, currency, status')
      .eq('id', validated.service_id)
      .eq('company_id', context.tenant_id) // Tenant isolation
      .single();

    if (serviceError) {
      throw serviceError; // Throw Supabase error directly
    }

    if (!service) {
      throw new McpError('NOT_FOUND', 'Service not found or does not belong to your company');
    }

    // Verify service is active
    if (service.status !== 'active') {
      throw new McpError('VALIDATION_ERROR', 'Service is not active');
    }

    // Verify customer_id matches context.user_id (clients can only book for themselves)
    // OR if admin, allow booking for any customer_id in the same company
    if (context.role !== 'admin' && validated.customer_id !== context.user_id) {
      throw new McpError('FORBIDDEN', 'You can only create bookings for yourself');
    }

    // If admin booking for another user, verify that user belongs to same company
    if (context.role === 'admin' && validated.customer_id !== context.user_id) {
      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('id', validated.customer_id)
        .eq('company_id', context.tenant_id)
        .single();

      if (!customerProfile) {
        throw new McpError('FORBIDDEN', 'Customer does not belong to your company');
      }
    }

    // 6. Create booking
    // Map API contract fields to DB columns:
    // - datetime -> scheduled_date
    // - customer_id -> client_id
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        service_id: validated.service_id,
        client_id: validated.customer_id, // Map customer_id to client_id
        provider_id: service.provider_id,
        scheduled_date: validated.datetime, // Map datetime to scheduled_date
        start_time: validated.datetime,
        end_time: new Date(new Date(validated.datetime).getTime() + 2 * 60 * 60 * 1000).toISOString(), // +2 hours
        notes: validated.notes,
        status: 'pending',
        approval_status: 'pending',
        operational_status: 'new',
        total_amount: service.base_price || 0,
        amount: service.base_price || 0, // Legacy field
        currency: service.currency || 'OMR',
        payment_status: 'pending',
      })
      .select('id, status, service_id, scheduled_date, client_id')
      .single();

    if (bookingError) {
      throw bookingError; // Throw Supabase error directly
    }

    if (!booking) {
      throw new McpError('INTERNAL_ERROR', 'Failed to create booking');
    }

    // 7. Return minimal safe fields matching contract exactly
    // Response shaping: Map DB columns to API contract
    // - scheduled_date -> datetime
    // - client_id -> customer_id
    const response = Response.json({
      booking: {
        id: booking.id,
        status: booking.status,
        service_id: booking.service_id,
        datetime: booking.scheduled_date, // Map scheduled_date to datetime
        customer_id: booking.client_id, // Map client_id to customer_id
      },
    });
    response.headers.set('X-Correlation-ID', correlationId);
    return response;
  } catch (err) {
    return toMcpErrorResponse(err, correlationId!);
  }
}
