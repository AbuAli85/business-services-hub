# Services Management System

A comprehensive business services management platform built with Next.js, Supabase, and Make.com automation.

## 🏗️ Architecture Overview

### Two-Domain Setup
- **Marketing Site**: `https://marketing.thedigitalmorph.com` - Public-facing service discovery
- **Portal Site**: `https://portal.thesmartpro.io` - Backend services and user management
- **Shared Resources**: Supabase database and Make.com automations

## 🚀 Core Features

### 1. **Services Management**
- Create, read, update, and delete services
- Service categories and pricing
- Service packages and features
- Provider verification and approval

### 2. **Booking System**
- Service booking with approval workflow
- Payment integration (Stripe)
- Scheduling and calendar management
- Status tracking and notifications

### 3. **Tracking & Progress**
- Real-time booking progress updates
- Milestone tracking
- Progress percentage monitoring
- Estimated completion dates

### 4. **Reports & Analytics**
- Booking statistics and trends
- Revenue analysis
- Service performance metrics
- User activity reports

### 5. **User Management**
- Role-based access control (Client, Provider, Admin)
- Profile management
- Company information
- Authentication and authorization

## 📁 API Endpoints

### Services API
```
GET    /api/services          - List all services with filtering
POST   /api/services          - Create new service
PUT    /api/services          - Update existing service
GET    /api/services/[id]     - Get specific service details
```

### Bookings API
```
GET    /api/bookings          - List user's bookings
POST   /api/bookings          - Create new booking
PATCH  /api/bookings          - Update booking status
```

### Tracking API
```
GET    /api/tracking          - Get tracking information
POST   /api/tracking          - Update tracking status
```

### Reports API
```
GET    /api/reports?type=bookings    - Booking statistics
GET    /api/reports?type=revenue     - Revenue analysis
GET    /api/reports?type=services    - Service performance
GET    /api/reports?type=users       - User analytics
GET    /api/reports?type=performance - Performance metrics
```

### Payments API
```
POST   /api/payments/create-intent   - Create Stripe payment intent
```

### Webhooks API
```
POST   /api/webhooks                 - Handle external webhooks
```

## 🔧 Configuration

### Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://reootcngcptfogfozlmz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>

# Make.com Webhooks
MAKE_BOOKING_WEBHOOK=https://hook.eu1.make.com/your_webhook_id
MAKE_PAYMENT_SUCCEEDED_WEBHOOK=https://hook.eu1.make.com/your_webhook_id
MAKE_SEND_NOTIFICATION_WEBHOOK=https://hook.eu1.make.com/your_webhook_id

# Payment Gateway
STRIPE_SECRET_KEY=<your_stripe_secret_key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your_stripe_publishable_key>
```

### CORS Configuration
The system is configured to allow cross-domain requests from the marketing site:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://marketing.thedigitalmorph.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
}
```

## 🗄️ Database Schema

### Core Tables
- **profiles**: User profiles and roles
- **services**: Service listings and details
- **bookings**: Service bookings and status
- **tracking_updates**: Progress tracking information
- **notifications**: User notifications
- **payments**: Payment records

### Key Relationships
- Services belong to Providers (profiles)
- Bookings connect Clients and Providers through Services
- Tracking updates are linked to Bookings
- Notifications are sent to relevant users

## 🔐 Authentication & Authorization

### User Roles
1. **Client**: Can book services, view own bookings
2. **Provider**: Can create services, manage bookings, update tracking
3. **Admin**: Full access to all data and reports

### Security Features
- Row Level Security (RLS) policies
- JWT token authentication
- Role-based access control
- Secure API endpoints

## 📊 Business Logic

### Booking Workflow
1. Client selects service and creates booking
2. Booking status: `pending` → `approved` → `in_progress` → `completed`
3. Provider can approve, decline, or update progress
4. Automatic notifications sent at each stage

### Payment Flow
1. Client creates booking
2. Stripe payment intent created
3. Payment processed
4. Booking status updated to `paid`
5. Provider notified of successful payment

### Tracking System
1. Provider updates booking progress
2. Milestones and progress percentage tracked
3. Estimated completion dates updated
4. Client receives real-time updates

## 🚀 Getting Started

### 1. **Clone and Setup**
```bash
git clone <repository-url>
cd business-services-hub
npm install
```

### 2. **Environment Configuration**
```bash
cp env.example .env.local
# Update with your actual values
```

### 3. **Database Setup**
```bash
# Run database migrations
npx supabase db push

# Or create test data
node create-test-data.js
```

### 4. **Start Development Server**
```bash
npm run dev
```

## 🧪 Testing

### Test Scripts
- `test-db-schema.js` - Test database connection and schema
- `create-test-data.js` - Populate database with sample data

### API Testing
```bash
# Test services API
curl "http://localhost:3001/api/services"

# Test bookings API
curl "http://localhost:3001/api/bookings"

# Test tracking API
curl "http://localhost:3001/api/tracking"
```

## 🔄 Integration Points

### Make.com Automations
- **Booking Created**: Trigger notifications and workflows
- **Payment Succeeded**: Update booking status and notify provider
- **Tracking Updated**: Send progress updates to clients
- **Service Created**: Notify admins and update listings

### External Services
- **Stripe**: Payment processing
- **Supabase**: Database and authentication
- **Vercel**: Hosting and deployment

## 📈 Monitoring & Analytics

### Key Metrics
- Booking conversion rates
- Service performance ratings
- Revenue trends
- User engagement metrics
- Response time analytics

### Report Types
- **Daily/Weekly/Monthly**: Time-based analysis
- **Category-based**: Service type performance
- **User-based**: Individual performance metrics
- **Revenue**: Financial analysis and trends

## 🚨 Troubleshooting

### Common Issues

#### 1. **CORS Errors**
- Ensure CORS headers are properly set
- Check domain configuration in environment variables
- Verify preflight OPTIONS requests are handled

#### 2. **Authentication Issues**
- Check Supabase environment variables
- Verify JWT token validity
- Check user role permissions

#### 3. **Database Connection**
- Verify Supabase URL and keys
- Check RLS policies
- Ensure tables exist and are properly configured

#### 4. **Cross-Domain API Calls**
- Marketing site must call portal site APIs
- Update API base URLs in marketing site
- Ensure proper CORS configuration

### Debug Mode
Enable enhanced logging by setting environment variables:
```bash
NODE_ENV=development
DEBUG=true
```

## 🔮 Future Enhancements

### Planned Features
- Real-time chat between clients and providers
- Advanced analytics dashboard
- Mobile app integration
- Multi-language support
- Advanced payment options
- Service marketplace features

### Scalability Improvements
- Microservices architecture
- Redis caching
- CDN integration
- Load balancing
- Database sharding

## 📞 Support

### Documentation
- API Reference: `/api/docs`
- Database Schema: `supabase/migrations/`
- Component Library: `components/ui/`

### Contact
- Technical Issues: Check logs and error messages
- Feature Requests: Create issue in repository
- Business Inquiries: Contact through marketing site

## 📄 License

This project is proprietary software. All rights reserved.

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: Production Ready
