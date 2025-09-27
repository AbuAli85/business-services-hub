# Database Schema Analysis - User & Profile Related Tables

## 📊 **Core User & Authentication Tables**

### **1. `auth.users` (Supabase Auth)**
- **Purpose**: Supabase's built-in authentication table
- **Key Fields**:
  - `id` (UUID) - Primary key, references profiles.id
  - `email` (TEXT) - User's email address
  - `raw_user_meta_data` (JSONB) - Contains role, full_name, phone, etc.
  - `created_at`, `updated_at` - Timestamps
- **Relationships**: One-to-one with `profiles` table

### **2. `public.profiles` (Main User Profile Table)**
- **Purpose**: Extended user profile information
- **Key Fields**:
  - `id` (UUID) - Primary key, references auth.users(id)
  - `role` (ENUM) - 'admin', 'provider', 'client', 'staff'
  - `full_name` (TEXT) - User's display name
  - `phone` (TEXT) - Contact number
  - `country` (TEXT) - User's country
  - `company_id` (UUID) - References companies.id
  - `is_verified` (BOOLEAN) - Verification status
  - `email` (TEXT) - Denormalized from auth.users
  - `company_name` (TEXT) - For providers
  - `created_at`, `updated_at` - Timestamps
- **Relationships**: 
  - One-to-one with `auth.users`
  - One-to-many with `companies` (as owner)
  - One-to-many with `services` (as provider)
  - One-to-many with `bookings` (as client/provider)

## 🏢 **Business Entity Tables**

### **3. `public.companies`**
- **Purpose**: Company/organization information
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `owner_id` (UUID) - References profiles.id
  - `name` (TEXT) - Company name
  - `cr_number` (TEXT) - Oman Commercial Registration
  - `vat_number` (TEXT) - VAT registration
  - `logo_url` (TEXT) - Company logo
  - `created_at` - Timestamp
- **Relationships**: 
  - Many-to-one with `profiles` (owner)
  - One-to-many with `services` (company services)

### **4. `public.services`**
- **Purpose**: Service offerings by providers
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `provider_id` (UUID) - References profiles.id
  - `company_id` (UUID) - References companies.id
  - `title` (TEXT) - Service name
  - `description` (TEXT) - Service details
  - `category` (TEXT) - Service category
  - `status` (TEXT) - 'active', 'draft', 'archived'
  - `base_price` (NUMERIC) - Starting price
  - `currency` (TEXT) - Default 'OMR'
  - `cover_image_url` (TEXT) - Service image
  - `featured` (BOOLEAN) - Featured service flag
  - `created_at`, `updated_at` - Timestamps
- **Relationships**:
  - Many-to-one with `profiles` (provider)
  - Many-to-one with `companies` (company)
  - One-to-many with `service_packages`
  - One-to-many with `bookings`

## 📋 **Transaction Tables**

### **5. `public.bookings`**
- **Purpose**: Service bookings/orders
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `client_id` (UUID) - References profiles.id (client)
  - `provider_id` (UUID) - References profiles.id (provider)
  - `service_id` (UUID) - References services.id
  - `package_id` (UUID) - References service_packages.id
  - `requirements` (JSONB) - Client brief
  - `status` (ENUM) - Booking status
  - `subtotal`, `vat_amount`, `total_amount` (NUMERIC) - Pricing
  - `currency` (TEXT) - Default 'OMR'
  - `amount_cents` (INTEGER) - Amount in cents for calculations
  - `service_title` (TEXT) - Denormalized from services.title
  - `client_name` (TEXT) - Denormalized from profiles.full_name
  - `provider_name` (TEXT) - Denormalized from profiles.full_name
  - `booking_number` (TEXT) - Unique booking identifier
  - `approval_status` (TEXT) - Provider approval status
  - `scheduled_date` (TIMESTAMPTZ) - Scheduled start date
  - `created_at`, `updated_at` - Timestamps
- **Relationships**:
  - Many-to-one with `profiles` (client and provider)
  - Many-to-one with `services`
  - Many-to-one with `service_packages`
  - One-to-many with `messages`
  - One-to-one with `reviews`
  - One-to-many with `invoices`

### **6. `public.invoices`**
- **Purpose**: Invoicing and payments
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `booking_id` (UUID) - References bookings.id
  - `provider_id` (UUID) - References profiles.id
  - `client_id` (UUID) - References profiles.id
  - `amount` (NUMERIC) - Invoice amount
  - `currency` (TEXT) - Default 'OMR'
  - `status` (ENUM) - 'draft', 'issued', 'paid', 'void'
  - `invoice_number` (TEXT) - Unique invoice number
  - `pdf_url` (TEXT) - Invoice PDF
  - `created_at` - Timestamp
- **Relationships**:
  - Many-to-one with `bookings`
  - Many-to-one with `profiles` (client and provider)

## 💬 **Communication Tables**

### **7. `public.messages`**
- **Purpose**: Booking-related communication
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `booking_id` (UUID) - References bookings.id
  - `sender_id` (UUID) - References profiles.id
  - `content` (TEXT) - Message content
  - `attachments` (TEXT[]) - File URLs
  - `created_at` - Timestamp
- **Relationships**:
  - Many-to-one with `bookings`
  - Many-to-one with `profiles` (sender)

### **8. `public.reviews`**
- **Purpose**: Service reviews and ratings
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `booking_id` (UUID) - References bookings.id (unique)
  - `client_id` (UUID) - References profiles.id
  - `provider_id` (UUID) - References profiles.id
  - `rating` (INTEGER) - 1-5 star rating
  - `comment` (TEXT) - Review text
  - `created_at` - Timestamp
- **Relationships**:
  - One-to-one with `bookings`
  - Many-to-one with `profiles` (client and provider)

## 🔔 **System Tables**

### **9. `public.notifications`**
- **Purpose**: User notifications
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `user_id` (UUID) - References profiles.id
  - `type` (TEXT) - Notification type
  - `payload` (JSONB) - Notification data
  - `is_read` (BOOLEAN) - Read status
  - `created_at` - Timestamp
- **Relationships**:
  - Many-to-one with `profiles`

### **10. `public.audit_logs`**
- **Purpose**: System audit trail
- **Key Fields**:
  - `id` (UUID) - Primary key
  - `table_name` (TEXT) - Table being audited
  - `record_id` (UUID) - Record being audited
  - `action` (TEXT) - INSERT, UPDATE, DELETE
  - `old_values`, `new_values` (JSONB) - Data changes
  - `user_id` (UUID) - References profiles.id
  - `created_at` - Timestamp
- **Relationships**:
  - Many-to-one with `profiles` (optional)

## 🔗 **Key Relationships Summary**

### **User Flow**:
1. **User Registration** → `auth.users` (Supabase Auth)
2. **Profile Creation** → `public.profiles` (via trigger)
3. **Company Setup** → `public.companies` (for providers)
4. **Service Creation** → `public.services` (for providers)
5. **Service Booking** → `public.bookings` (clients book services)
6. **Communication** → `public.messages` (booking discussions)
7. **Invoicing** → `public.invoices` (payment processing)
8. **Reviews** → `public.reviews` (service feedback)

### **Data Synchronization Issues Identified**:
1. **Profile-Auth Mismatch**: Profile names don't match auth metadata
2. **Denormalized Data**: Bookings table has denormalized names that may be stale
3. **Email Duplication**: Email stored in both auth.users and profiles
4. **Role Inconsistency**: Role stored in both auth metadata and profiles

### **Recommendations**:
1. **Standardize Auth Flow**: Use single source of truth for user data
2. **Sync Triggers**: Ensure profile updates sync with auth metadata
3. **Data Validation**: Regular checks for data consistency
4. **Cleanup Scripts**: Remove duplicate/outdated data
