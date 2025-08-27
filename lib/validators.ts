import { z } from 'zod'

// User Profile Validation
export const ProfileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name must be less than 100 characters'),
  phone: z.string().min(8, 'Phone number must be at least 8 characters').max(20, 'Phone number must be less than 20 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  company_name: z.string().max(100, 'Company name must be less than 100 characters').optional(),
  website: z.string().url('Invalid website URL').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  industry: z.string().max(50, 'Industry must be less than 50 characters').optional(),
  experience_years: z.number().min(0, 'Experience years must be positive').max(50, 'Experience years must be less than 50').optional()
})

// Service Validation
export const ServiceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be less than 1000 characters'),
  category: z.enum([
    'Digital Marketing',
    'Legal Services',
    'Accounting',
    'IT Services',
    'Design & Branding',
    'Consulting',
    'Translation',
    'HR Services',
    'Web Development',
    'Content Creation',
    'Financial Services',
    'Healthcare Services',
    'Education & Training',
    'Real Estate',
    'Manufacturing'
  ], { required_error: 'Please select a category' }),
  base_price: z.number().positive('Price must be positive').max(100000, 'Price must be less than 100,000'),
  currency: z.enum(['OMR', 'USD', 'EUR'], { required_error: 'Please select a currency' }),
  delivery_timeframe: z.string().min(1, 'Delivery timeframe is required').max(100, 'Delivery timeframe must be less than 100 characters'),
  revision_policy: z.string().min(1, 'Revision policy is required').max(200, 'Revision policy must be less than 200 characters'),
  requirements: z.string().max(500, 'Requirements must be less than 500 characters').optional(),
  tags: z.array(z.string().max(30, 'Tag must be less than 30 characters')).max(10, 'Maximum 10 tags allowed').optional(),
  cover_image_url: z.string().url('Invalid image URL').optional(),
  status: z.enum(['draft', 'pending', 'active', 'inactive', 'featured']).default('draft')
})

// Service Package Validation
export const ServicePackageSchema = z.object({
  name: z.string().min(1, 'Package name is required').max(50, 'Package name must be less than 50 characters'),
  price: z.number().positive('Price must be positive').max(100000, 'Price must be less than 100,000'),
  delivery_days: z.number().int('Delivery days must be a whole number').positive('Delivery days must be positive').max(365, 'Delivery days must be less than 365'),
  revisions: z.number().int('Revisions must be a whole number').min(0, 'Revisions must be non-negative').max(10, 'Revisions must be less than 10'),
  features: z.array(z.string().max(100, 'Feature must be less than 100 characters')).min(1, 'At least one feature is required').max(20, 'Maximum 20 features allowed')
})

// Complete Service with Packages
export const CompleteServiceSchema = ServiceSchema.extend({
  service_packages: z.array(ServicePackageSchema).min(1, 'At least one service package is required').max(5, 'Maximum 5 packages allowed')
})

// Booking Validation
export const BookingSchema = z.object({
  service_id: z.string().uuid('Invalid service ID'),
  scheduled_date: z.string().datetime('Invalid date format'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  service_package_id: z.string().uuid('Invalid package ID').optional(),
  estimated_duration: z.string().max(50, 'Duration must be less than 50 characters').optional(),
  location: z.string().max(200, 'Location must be less than 200 characters').optional(),
  special_requirements: z.string().max(1000, 'Requirements must be less than 1000 characters').optional()
})

// Message Validation
export const MessageSchema = z.object({
  receiver_id: z.string().uuid('Invalid receiver ID'),
  content: z.string().min(1, 'Message content is required').max(1000, 'Message must be less than 1000 characters'),
  subject: z.string().min(1, 'Subject is required').max(100, 'Subject must be less than 100 characters'),
  booking_id: z.string().uuid('Invalid booking ID').optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
})

// Company Validation
export const CompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(100, 'Company name must be less than 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be less than 1000 characters'),
  cr_number: z.string().min(1, 'CR number is required').max(50, 'CR number must be less than 50 characters'),
  vat_number: z.string().min(1, 'VAT number is required').max(50, 'VAT number must be less than 50 characters'),
  address: z.string().min(10, 'Address must be at least 10 characters').max(500, 'Address must be less than 500 characters'),
  phone: z.string().min(8, 'Phone number must be at least 8 characters').max(20, 'Phone number must be less than 20 characters'),
  email: z.string().email('Invalid email address'),
  website: z.string().url('Invalid website URL').optional(),
  industry: z.string().min(1, 'Industry is required').max(50, 'Industry must be less than 50 characters'),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '500+'], { required_error: 'Please select company size' }),
  founded_year: z.number().int('Year must be a whole number').min(1900, 'Year must be after 1900').max(new Date().getFullYear(), 'Year cannot be in the future'),
  logo_url: z.string().url('Invalid logo URL').optional(),
  portfolio_links: z.string().max(1000, 'Portfolio links must be less than 1000 characters').optional(),
  services_offered: z.string().max(500, 'Services offered must be less than 500 characters').optional()
})

// Review Validation
export const ReviewSchema = z.object({
  booking_id: z.string().uuid('Invalid booking ID'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().min(10, 'Review comment must be at least 10 characters').max(500, 'Review comment must be less than 500 characters'),
  category_rating: z.object({
    quality: z.number().min(1).max(5),
    communication: z.number().min(1).max(5),
    value: z.number().min(1).max(5),
    timeliness: z.number().min(1).max(5)
  }).optional()
})

// Payment Validation
export const PaymentSchema = z.object({
  booking_id: z.string().uuid('Invalid booking ID'),
  amount: z.number().positive('Amount must be positive').max(100000, 'Amount must be less than 100,000'),
  currency: z.enum(['OMR', 'USD', 'EUR'], { required_error: 'Please select a currency' }),
  payment_method: z.enum(['stripe', 'bank_transfer', 'cash'], { required_error: 'Please select a payment method' }),
  description: z.string().max(200, 'Description must be less than 200 characters').optional()
})

// Invoice Validation
export const InvoiceSchema = z.object({
  booking_id: z.string().uuid('Invalid booking ID'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.enum(['OMR', 'USD', 'EUR']),
  due_date: z.string().datetime('Invalid due date'),
  items: z.array(z.object({
    description: z.string().min(1, 'Item description is required'),
    quantity: z.number().positive('Quantity must be positive'),
    unit_price: z.number().positive('Unit price must be positive'),
    total: z.number().positive('Total must be positive')
  })).min(1, 'At least one item is required')
})

// Search and Filter Validation
export const SearchFiltersSchema = z.object({
  query: z.string().max(100, 'Search query must be less than 100 characters').optional(),
  category: z.string().max(50, 'Category must be less than 50 characters').optional(),
  min_price: z.number().min(0, 'Minimum price must be non-negative').optional(),
  max_price: z.number().min(0, 'Maximum price must be non-negative').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5').optional(),
  availability: z.enum(['available', 'busy', 'unavailable']).optional(),
  sort_by: z.enum(['price', 'rating', 'created_at', 'popularity']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int('Page must be a whole number').min(1, 'Page must be at least 1').default(1),
  limit: z.number().int('Limit must be a whole number').min(1, 'Limit must be at least 1').max(100, 'Limit must be at most 100').default(20)
})

// Pagination Response Schema
export const PaginationSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
    has_next: z.boolean(),
    has_prev: z.boolean()
  })
})

// API Response Schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
  details: z.array(z.any()).optional()
})

// Error Response Schema
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
  details: z.array(z.any()).optional(),
  code: z.string().optional()
})

// Success Response Schema
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  data: z.any().optional()
})

// Validation helper functions
export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data)
}

export const validateInputSafe = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } => {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

// Common validation patterns
export const commonValidations = {
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 characters').max(20, 'Phone number must be less than 20 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  uuid: z.string().uuid('Invalid UUID format'),
  url: z.string().url('Invalid URL format'),
  date: z.string().datetime('Invalid date format'),
  positiveNumber: z.number().positive('Value must be positive'),
  nonNegativeNumber: z.number().min(0, 'Value must be non-negative')
}

// Export all schemas
export default {
  ProfileSchema,
  ServiceSchema,
  ServicePackageSchema,
  CompleteServiceSchema,
  BookingSchema,
  MessageSchema,
  CompanySchema,
  ReviewSchema,
  PaymentSchema,
  InvoiceSchema,
  SearchFiltersSchema,
  PaginationSchema,
  ApiResponseSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
  validateInput,
  validateInputSafe,
  commonValidations
}
