import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { ZodError } from 'zod';

// Configuration: Based on actual schema analysis
// This repo uses company_id (not tenant_id) for multi-tenancy
const CONFIG = {
  USE_MEMBERSHIPS_TABLE: false, // Profiles table contains role directly
  
  PROFILES_TABLE: 'profiles',
  PROFILES_USER_ID_COLUMN: 'id', // Matches auth.users.id
  PROFILES_TENANT_COLUMN: 'company_id', // This repo uses company_id, not tenant_id
  PROFILES_ROLE_COLUMN: 'role',
};

export interface McpContext {
  user_id: string;
  tenant_id: string; // Will contain company_id value
  role: string;
}

export interface McpErrorResponse {
  error: {
    code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR';
    message: string;
  };
}

/**
 * Extract Bearer token from Authorization header
 * Exported for reuse in routes (prevents duplication and ensures consistent 401 behavior)
 */
export function extractBearerToken(req: NextRequest): string {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new McpError('UNAUTHORIZED', 'Missing or invalid Authorization header');
  }
  return authHeader.substring(7);
}

/**
 * Role allowlist - prevents accidental role bypasses
 */
const ALLOWED_ROLES = ['admin', 'provider', 'client', 'user', 'staff'] as const;

/**
 * Normalize role with allowlist enforcement
 * If role is not in allowlist, default to 'user' (safe fallback)
 */
function normalizeRole(rawRole: unknown): string {
  const normalized = String(rawRole || 'user').toLowerCase().trim();
  
  // Enforce allowlist - if role not recognized, default to 'user'
  if (!ALLOWED_ROLES.includes(normalized as typeof ALLOWED_ROLES[number])) {
    console.warn(`[Role Normalization] Unknown role "${rawRole}" normalized to "user"`);
    return 'user';
  }
  
  return normalized;
}

/**
 * Verify JWT token and extract user_id
 * Uses service role client for verification (server-side only)
 */
async function verifyTokenAndGetUserId(token: string): Promise<string> {
  // Use service role client for token verification
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    throw new McpError('UNAUTHORIZED', 'Invalid or expired token');
  }

  return user.id;
}

/**
 * Resolve tenant_id (company_id) and role from database (DB-first)
 * Uses user-scoped client so RLS still applies
 */
async function resolveTenantAndRole(
  user_id: string,
  token: string
): Promise<{ tenant_id: string; role: string }> {
  // Use user-scoped client (with token) so RLS applies
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Query profiles table for company_id and role
  const { data: profile, error } = await supabase
    .from(CONFIG.PROFILES_TABLE)
    .select(`${CONFIG.PROFILES_TENANT_COLUMN}, ${CONFIG.PROFILES_ROLE_COLUMN}`)
    .eq(CONFIG.PROFILES_USER_ID_COLUMN, user_id)
    .single();

  if (error || !profile) {
    throw new McpError('UNAUTHORIZED', 'User profile not found');
  }

  // company_id can be null - handle gracefully
  const companyId = profile[CONFIG.PROFILES_TENANT_COLUMN];
  if (!companyId) {
    // In this repo, users without company_id may still be valid (single-tenant mode)
    // For MCP, we'll use a default or throw - adjust based on your requirements
    throw new McpError('UNAUTHORIZED', 'User company not found');
  }

  // Normalize role (prevent case/variant errors)
  const rawRole = profile[CONFIG.PROFILES_ROLE_COLUMN] || 'user';
  const normalizedRole = normalizeRole(rawRole);

  return {
    tenant_id: companyId, // Return company_id as tenant_id for consistency
    role: normalizedRole,
  };
}

/**
 * Get MCP context: verify token and resolve tenant/role from DB
 */
export async function getMcpContext(req: NextRequest): Promise<McpContext> {
  // 1. Extract token
  const token = extractBearerToken(req);

  // 2. Verify token and get user_id
  const user_id = await verifyTokenAndGetUserId(token);

  // 3. Resolve tenant_id (company_id) and role from database (DB-first)
  const { tenant_id, role } = await resolveTenantAndRole(user_id, token);

  return {
    user_id,
    tenant_id,
    role,
  };
}

/**
 * Assert user has one of the allowed roles
 */
export function assertRole(context: McpContext, allowedRoles: string[]): void {
  if (!allowedRoles.includes(context.role)) {
    throw new McpError(
      'FORBIDDEN',
      `Access denied. Required role: ${allowedRoles.join(' or ')}`
    );
  }
}

/**
 * Typed MCP error (not Response)
 * Automatically maps error code to HTTP status code
 */
export class McpError extends Error {
  public readonly statusCode: number;

  constructor(
    public readonly code: McpErrorResponse['error']['code'],
    message: string,
    statusCode?: number
  ) {
    super(message);
    this.name = 'McpError';
    
    // Automatic status code mapping (prevents human error)
    this.statusCode = statusCode ?? (
      code === 'UNAUTHORIZED' ? 401 :
      code === 'FORBIDDEN' ? 403 :
      code === 'VALIDATION_ERROR' ? 400 :
      code === 'NOT_FOUND' ? 404 :
      500 // INTERNAL_ERROR
    );
  }

  toResponse(): Response {
    return Response.json(
      { error: { code: this.code, message: this.message } },
      { status: this.statusCode }
    );
  }
}

/**
 * Convert any error to MCP error response (deterministic)
 * Uses instanceof checks for type safety
 * Includes Supabase error code mapping
 * Adds correlation ID to error response headers
 */
export function toMcpErrorResponse(err: unknown, correlationId?: string): Response {
  // 1. If it's already an McpError, return its response with correlation ID
  if (err instanceof McpError) {
    const response = err.toResponse();
    if (correlationId) {
      response.headers.set('X-Correlation-ID', correlationId);
    }
    return response;
  }

  // 2. If it's a ZodError, it's a validation error (deterministic instanceof check)
  if (err instanceof ZodError) {
    const messages = err.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    
    const response = Response.json(
      { error: { code: 'VALIDATION_ERROR', message: messages } },
      { status: 400 }
    );
    if (correlationId) {
      response.headers.set('X-Correlation-ID', correlationId);
    }
    return response;
  }

  // 3. Check for Supabase errors (deterministic error code mapping)
  if (err && typeof err === 'object' && 'code' in err) {
    const supabaseError = err as { code: string; message: string; details?: string };
    
    // PGRST116 = no rows returned from .single()
    if (supabaseError.code === 'PGRST116') {
      const response = Response.json(
        { error: { code: 'NOT_FOUND', message: 'Resource not found' } },
        { status: 404 }
      );
      if (correlationId) {
        response.headers.set('X-Correlation-ID', correlationId);
      }
      return response;
    }
    
    // Permission/RLS errors
    // 42501 = insufficient privilege, PGRST301 = RLS policy violation
    if (supabaseError.code === '42501' || 
        supabaseError.code === 'PGRST301' ||
        supabaseError.message?.includes('permission') || 
        supabaseError.message?.includes('RLS') ||
        supabaseError.message?.includes('row-level security')) {
      const response = Response.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
      if (correlationId) {
        response.headers.set('X-Correlation-ID', correlationId);
      }
      return response;
    }
  }

  // 4. If it's a standard Error, check for known patterns (fallback only)
  if (err instanceof Error) {
    // Check for Supabase auth errors
    if (err.message.includes('JWT') || err.message.includes('token') || err.message.includes('expired')) {
      const response = Response.json(
        { error: { code: 'UNAUTHORIZED', message: err.message } },
        { status: 401 }
      );
      if (correlationId) {
        response.headers.set('X-Correlation-ID', correlationId);
      }
      return response;
    }
    
    // Check for not found patterns
    if (err.message.includes('not found') || err.message.includes('does not exist')) {
      const response = Response.json(
        { error: { code: 'NOT_FOUND', message: err.message } },
        { status: 404 }
      );
      if (correlationId) {
        response.headers.set('X-Correlation-ID', correlationId);
      }
      return response;
    }
  }

  // 5. Default to internal error
  console.error('[MCP Error]', err);
  const response = Response.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 }
  );
  if (correlationId) {
    response.headers.set('X-Correlation-ID', correlationId);
  }
  return response;
}

/**
 * Helper to create user-scoped Supabase client for DB operations
 * This ensures RLS policies still apply
 */
export function createUserScopedClient(token: string) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
