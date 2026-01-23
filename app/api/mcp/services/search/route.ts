// Ensure Node runtime (required for Supabase client and Buffer operations)
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getMcpContext, toMcpErrorResponse, createUserScopedClient, extractBearerToken } from '@/lib/mcp/context';

const searchSchema = z.object({
  query: z.string().optional(),
  filters: z.object({
    category: z.string().optional(),
    status: z.string().optional(),
    provider_id: z.string().uuid().optional(),
  }).optional(),
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
    console.log(`[${correlationId}] MCP endpoint: /api/mcp/services/search`, {
      user_id: context.user_id,
      tenant_id: context.tenant_id,
      role: context.role,
    });
    
    // RBAC: any authenticated role can search (no role check)

    // 2. Validate request body (deterministic Zod error handling)
    const body = await req.json();
    const validated = searchSchema.parse(body);

    // 3. Get user-scoped client (RLS applies)
    const token = extractBearerToken(req);
    const supabase = createUserScopedClient(token);

    // 4. Query services with tenant isolation
    // Note: This repo uses company_id (not tenant_id) - context.tenant_id contains company_id
    let query = supabase
      .from('services')
      .select('id, title, description, category, base_price, currency, provider_id, status, company_id')
      .eq('company_id', context.tenant_id); // Tenant isolation via company_id

    // Apply search query - description column exists in this schema
    if (validated.query) {
      query = query.or(`title.ilike.%${validated.query}%,description.ilike.%${validated.query}%`);
    }

    // Apply filters
    if (validated.filters) {
      if (validated.filters.category) {
        query = query.eq('category', validated.filters.category);
      }
      if (validated.filters.status) {
        query = query.eq('status', validated.filters.status);
      }
      if (validated.filters.provider_id) {
        query = query.eq('provider_id', validated.filters.provider_id);
      }
    }

    const { data: services, error } = await query;

    // Throw Supabase error directly (preserves error code for deterministic mapping)
    if (error) {
      throw error;
    }

    // 5. Return safe fields only with correlation ID in headers
    // Response shaping: Map DB columns to API contract exactly
    // Map base_price -> price
    const mappedServices = (services || []).map((service: any) => ({
      id: service.id,
      title: service.title,
      price: service.base_price, // Map base_price to price
      category: service.category,
      provider_id: service.provider_id,
      status: service.status,
      // Do NOT include additional fields beyond contract (description, currency, etc.)
    }));
    
    const response = Response.json({
      services: mappedServices,
    });
    response.headers.set('X-Correlation-ID', correlationId);
    return response;
  } catch (err) {
    return toMcpErrorResponse(err, correlationId!);
  }
}
