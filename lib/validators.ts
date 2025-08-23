import { z } from 'zod'

// User and Profile schemas
export const profileSchema = z.object({
  id: z.string().uuid().optional(),
  role: z.enum(['admin', 'provider', 'client', 'staff']),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(8, 'Phone number must be at least 8 characters'),
  company_id: z.string().uuid().optional(),
  is_verified: z.boolean().default(false),
})

export const companySchema = z.object({
  id: z.string().uuid().optional(),
  owner_id: z.string().uuid(),
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  cr_number: z.string().optional(),
  vat_number: z.string().optional(),
  logo_url: z.string().url().optional(),
})

// Service schemas
export const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  provider_id: z.string().uuid(),
  company_id: z.string().uuid().optional(),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  category: z.string().min(2, 'Category must be at least 2 characters'),
  status: z.enum(['active', 'draft', 'archived']).default('draft'),
  base_price: z.number().min(0, 'Price must be non-negative'),
  currency: z.string().default('OMR'),
  cover_image_url: z.string().url().optional(),
})

export const servicePackageSchema = z.object({
  id: z.string().uuid().optional(),
  service_id: z.string().uuid(),
  name: z.string().min(2, 'Package name must be at least 2 characters'),
  price: z.number().min(0, 'Price must be non-negative'),
  delivery_days: z.number().min(1, 'Delivery days must be at least 1'),
  revisions: z.number().min(0, 'Revisions must be non-negative').default(1),
  features: z.array(z.string()).min(1, 'At least one feature is required'),
})

// Booking schemas
export const bookingSchema = z.object({
  id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  service_id: z.string().uuid(),
  package_id: z.string().uuid().optional(),
  requirements: z.record(z.any()),
  status: z.enum([
    'draft',
    'pending_payment',
    'paid',
    'in_progress',
    'delivered',
    'completed',
    'cancelled',
    'disputed'
  ]).default('draft'),
  subtotal: z.number().min(0, 'Subtotal must be non-negative'),
  vat_percent: z.number().min(0).max(100).default(5.00),
  currency: z.string().default('OMR'),
  due_at: z.string().datetime().optional(),
})

// Message schemas
export const messageSchema = z.object({
  id: z.string().uuid().optional(),
  booking_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  content: z.string().min(1, 'Message content cannot be empty'),
  attachments: z.array(z.string()).default([]),
})

// Review schemas
export const reviewSchema = z.object({
  id: z.string().uuid().optional(),
  booking_id: z.string().uuid(),
  client_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, 'Review comment must be at least 10 characters'),
})

// Invoice schemas
export const invoiceSchema = z.object({
  id: z.string().uuid().optional(),
  booking_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  client_id: z.string().uuid(),
  amount: z.number().min(0, 'Amount must be non-negative'),
  currency: z.string().default('OMR'),
  status: z.enum(['draft', 'issued', 'paid', 'void']).default('draft'),
  pdf_url: z.string().url().optional(),
})

// Notification schemas
export const notificationSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  type: z.string().min(1, 'Notification type is required'),
  payload: z.record(z.any()),
  is_read: z.boolean().default(false),
})

// Search and filter schemas
export const serviceSearchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  min_price: z.number().min(0).optional(),
  max_price: z.number().min(0).optional(),
  provider_id: z.string().uuid().optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

// Auth schemas
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['provider', 'client']),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(8, 'Phone number must be at least 8 characters'),
})

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Onboarding schemas
export const providerOnboardingSchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  cr_number: z.string().optional(),
  vat_number: z.string().optional(),
  portfolio_links: z.array(z.string().url()).optional(),
  services: z.array(z.string()).min(1, 'At least one service category is required'),
})

export const clientOnboardingSchema = z.object({
  billing_preference: z.enum(['email', 'sms']).default('email'),
  preferred_categories: z.array(z.string()).optional(),
})
