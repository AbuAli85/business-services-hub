# Business Services Hub - Setup & Deployment Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [External Services Setup](#external-services-setup)
6. [Production Deployment](#production-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### System Requirements

#### Minimum Requirements
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: Version 2.30.0 or higher
- **Memory**: 4GB RAM minimum
- **Storage**: 10GB free space
- **OS**: Windows 10+, macOS 10.15+, or Ubuntu 18.04+

#### Recommended Requirements
- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **Memory**: 8GB RAM or higher
- **Storage**: 20GB free space
- **OS**: Latest stable version

### Required Accounts

#### Essential Services
- **Supabase Account**: [supabase.com](https://supabase.com)
- **Vercel Account**: [vercel.com](https://vercel.com) (for deployment)
- **GitHub Account**: [github.com](https://github.com) (for version control)

#### Optional Services
- **Stripe Account**: [stripe.com](https://stripe.com) (for payments)
- **Resend Account**: [resend.com](https://resend.com) (for emails)
- **Make.com Account**: [make.com](https://make.com) (for automation)

---

## 🚀 Development Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/business-services-hub.git

# Navigate to the project directory
cd business-services-hub

# Check out the main branch
git checkout main
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

### 3. Environment Configuration

```bash
# Copy the environment template
cp env.example .env.local

# Edit the environment file
nano .env.local
```

#### Environment Variables Template

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Configuration
DATABASE_URL=your_database_connection_string

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Payment Configuration (Stripe)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email Configuration (Resend)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com

# Automation (Make.com)
MAKE_BOOKING_WEBHOOK=your_make_webhook_url
MAKE_PAYMENT_WEBHOOK=your_make_payment_webhook_url
MAKE_NOTIFICATION_WEBHOOK=your_make_notification_webhook_url

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Business Services Hub

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

### 4. Start Development Server

```bash
# Start the development server
npm run dev

# The application will be available at:
# http://localhost:3000
```

### 5. Verify Installation

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests (if available)
npm test
```

---

## ⚙️ Environment Configuration

### Supabase Configuration

#### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: business-services-hub
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest region
5. Click "Create new project"

#### 2. Get Supabase Credentials

1. Go to Project Settings → API
2. Copy the following values:
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### 3. Configure Database

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Apply database migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > lib/database.types.ts
```

### Stripe Configuration

#### 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Create a new account
3. Complete account verification
4. Get your API keys from the dashboard

#### 2. Configure Stripe

```bash
# Install Stripe CLI (optional)
npm install -g stripe

# Login to Stripe
stripe login

# Listen for webhooks (development)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

#### 3. Set Up Webhooks

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `customer.subscription.created`
4. Copy webhook signing secret

### Resend Configuration

#### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for an account
3. Verify your email address
4. Get your API key from the dashboard

#### 2. Configure Domain

1. Go to Domains in Resend dashboard
2. Add your domain
3. Verify domain ownership
4. Configure DNS records

### Make.com Configuration

#### 1. Create Make.com Account

1. Go to [make.com](https://make.com)
2. Create a new account
3. Choose a plan (free tier available)
4. Create your first scenario

#### 2. Set Up Webhooks

1. Create a new scenario
2. Add "Webhooks" trigger
3. Copy the webhook URL
4. Configure the webhook to receive data

---

## 🗄️ Database Setup

### 1. Database Schema

The application uses PostgreSQL with the following main tables:

```sql
-- Core tables
profiles
services
bookings
milestones
tasks
messages
reviews
invoices
payments
notifications

-- Supporting tables
service_packages
booking_tasks
milestone_approvals
time_entries
audit_logs
```

### 2. Apply Migrations

```bash
# Apply all migrations
supabase db push

# Or apply specific migration
supabase db push --file migration_file.sql
```

### 3. Seed Data (Optional)

```bash
# Run seed script
npm run db:seed

# Or run specific seed
node scripts/seed-users.js
node scripts/seed-services.js
```

### 4. Verify Database

```bash
# Check database connection
npm run db:check

# View database schema
supabase db diff

# Reset database (development only)
supabase db reset
```

---

## 🚀 Production Deployment

### Vercel Deployment (Recommended)

#### 1. Prepare for Deployment

```bash
# Build the application
npm run build

# Test the build locally
npm run start

# Verify everything works
npm run test
```

#### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod
```

#### 3. Configure Environment Variables

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add all required environment variables
5. Set environment (Production, Preview, Development)

#### 4. Configure Domain

1. Go to Settings → Domains
2. Add your custom domain
3. Configure DNS records
4. Enable SSL certificate

### Alternative Deployment Options

#### Netlify Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the application
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=out
```

#### Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize Railway project
railway init

# Deploy to Railway
railway up
```

#### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Build Docker image
docker build -t business-services-hub .

# Run Docker container
docker run -p 3000:3000 business-services-hub
```

---

## 📊 Monitoring & Maintenance

### 1. Application Monitoring

#### Vercel Analytics
- Built-in analytics for Vercel deployments
- Performance monitoring
- Error tracking
- User analytics

#### Custom Monitoring
```bash
# Install monitoring tools
npm install --save @sentry/nextjs

# Configure Sentry
# Add to next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // Your existing config
}, {
  // Sentry config
});
```

### 2. Database Monitoring

#### Supabase Monitoring
- Database performance metrics
- Query performance analysis
- Connection monitoring
- Storage usage tracking

#### Custom Database Monitoring
```sql
-- Monitor slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor database size
SELECT pg_size_pretty(pg_database_size('your_database_name'));

-- Monitor active connections
SELECT count(*) FROM pg_stat_activity;
```

### 3. Performance Monitoring

#### Core Web Vitals
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)

#### Performance Optimization
```bash
# Analyze bundle size
npm run analyze

# Run Lighthouse audit
npm run lighthouse

# Check performance metrics
npm run perf
```

### 4. Security Monitoring

#### Security Headers
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
];
```

#### Security Scanning
```bash
# Install security scanner
npm install -g npm-audit

# Run security audit
npm audit

# Fix security issues
npm audit fix
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Errors

**Error**: `Module not found`
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Error**: `TypeScript errors`
```bash
# Check TypeScript configuration
npm run type-check

# Fix type errors
npm run type-check -- --fix
```

#### 2. Database Connection Issues

**Error**: `Connection refused`
```bash
# Check Supabase connection
supabase status

# Restart Supabase
supabase stop
supabase start
```

**Error**: `Authentication failed`
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Verify keys in Supabase dashboard
```

#### 3. Payment Issues

**Error**: `Stripe webhook failed`
```bash
# Check webhook endpoint
curl -X POST https://yourdomain.com/api/webhooks/stripe

# Verify webhook secret
echo $STRIPE_WEBHOOK_SECRET
```

#### 4. Email Issues

**Error**: `Email sending failed`
```bash
# Check Resend API key
echo $RESEND_API_KEY

# Test email sending
npm run test:email
```

### Debug Mode

#### Enable Debug Logging
```bash
# Set debug environment variable
export DEBUG=*

# Run application in debug mode
npm run dev
```

#### Database Debugging
```sql
-- Enable query logging
SET log_statement = 'all';
SET log_duration = on;
SET log_min_duration_statement = 0;
```

#### API Debugging
```bash
# Enable API logging
export API_DEBUG=true

# Check API logs
tail -f logs/api.log
```

### Performance Issues

#### Slow Database Queries
```sql
-- Identify slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC;
```

#### Memory Issues
```bash
# Check memory usage
npm run memory-check

# Monitor memory usage
node --inspect server.js
```

#### Network Issues
```bash
# Check network connectivity
ping supabase.co
ping vercel.com

# Test API endpoints
curl -I https://yourdomain.com/api/health
```

---

## 📚 Additional Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

### Community Support
- [GitHub Issues](https://github.com/yourusername/business-services-hub/issues)
- [Discord Community](https://discord.gg/your-discord)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/business-services-hub)

### Professional Support
- **Email**: support@businessserviceshub.com
- **Phone**: +968 2234 5678
- **Hours**: Sunday - Thursday, 9 AM - 6 PM (GST)

---

## 🎯 Quick Start Checklist

### Development Setup
- [ ] Clone repository
- [ ] Install dependencies
- [ ] Configure environment variables
- [ ] Set up Supabase project
- [ ] Apply database migrations
- [ ] Start development server
- [ ] Verify installation

### Production Deployment
- [ ] Configure production environment
- [ ] Set up external services
- [ ] Deploy to Vercel
- [ ] Configure custom domain
- [ ] Set up monitoring
- [ ] Test all functionality
- [ ] Go live!

---

*This comprehensive setup and deployment guide will help you get the Business Services Hub up and running in both development and production environments.*
