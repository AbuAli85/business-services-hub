# Business Services Hub

A comprehensive platform connecting businesses with trusted service providers in Oman. Built with Next.js 14, Supabase, and modern web technologies.

## 🚀 Features

### For Clients
- Browse and search business services
- Create bookings with detailed requirements
- Real-time messaging with providers
- Secure payment processing
- Review and rate completed services
- Track booking status and progress

### For Service Providers
- Create and manage service listings
- Set pricing packages (Basic/Pro/Enterprise)
- Manage bookings and client communications
- Generate invoices and track earnings
- Portfolio and company profile management
- KYC/KYB verification support

### For Administrators
- User and role management
- Dispute resolution system
- Platform analytics and reporting
- KYC/KYB review workflows
- System configuration and monitoring

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with role-based access control
- **State Management**: React hooks and context
- **Forms**: React Hook Form with Zod validation
- **Notifications**: React Hot Toast
- **Icons**: Lucide React
- **Charts**: Recharts (for analytics)

## 📁 Project Structure

```
business-services-hub/
├── app/                          # Next.js App Router
│   ├── (public)/                # Public routes
│   │   ├── page.tsx            # Landing page
│   │   └── services/           # Services catalog
│   ├── (auth)/                 # Authentication routes
│   │   ├── sign-in/            # Sign in page
│   │   ├── sign-up/            # Sign up page
│   │   └── onboarding/         # User onboarding
│   ├── dashboard/               # Protected dashboard routes
│   │   ├── layout.tsx          # Dashboard layout
│   │   ├── page.tsx            # Main dashboard
│   │   ├── client/             # Client-specific routes
│   │   ├── provider/           # Provider-specific routes
│   │   └── admin/              # Admin routes
│   ├── api/                    # API routes
│   └── globals.css             # Global styles
├── components/                  # Reusable UI components
│   ├── ui/                     # shadcn/ui components
│   └── forms/                  # Form components
├── lib/                        # Utility libraries
│   ├── supabase.ts            # Supabase client
│   ├── rbac.ts                # Role-based access control
│   ├── validators.ts          # Zod validation schemas
│   └── utils.ts               # Helper functions
├── supabase/                   # Supabase configuration
│   ├── config.toml            # Supabase config
│   └── migrations/            # Database migrations
├── middleware.ts               # Next.js middleware
├── tailwind.config.js         # Tailwind CSS config
├── tsconfig.json              # TypeScript config
└── package.json               # Dependencies
```

## 🗄️ Database Schema

### Core Tables
- **profiles**: User profiles with roles (admin, provider, client, staff)
- **companies**: Company information for providers
- **services**: Service listings with categories and pricing
- **service_packages**: Pricing tiers (Basic/Pro/Enterprise)
- **bookings**: Service bookings with status tracking
- **messages**: Real-time communication between parties
- **reviews**: Client reviews and ratings
- **invoices**: Financial records and billing
- **notifications**: System notifications
- **audit_logs**: Change tracking for compliance

### Key Features
- UUID primary keys for security
- Row Level Security (RLS) policies
- Audit logging for all changes
- Generated columns for calculations
- Comprehensive indexing for performance

## 🔐 Security Features

- **Row Level Security (RLS)**: Database-level access control
- **JWT Authentication**: Secure token-based auth
- **Role-Based Access Control (RBAC)**: Granular permissions
- **Input Validation**: Zod schema validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Content Security Policy
- **Rate Limiting**: API endpoint protection

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- PostgreSQL knowledge (for database management)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/business-services-hub.git
   cd business-services-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Copy your project URL and anon key
   - Create a `.env.local` file:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Set up the database**
   ```bash
   # Start Supabase locally (optional)
   npx supabase start
   
   # Apply database migrations
   npx supabase db push
   
   # Generate TypeScript types
   npm run db:generate
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Make.com Webhooks (for automation)
MAKE_BOOKING_WEBHOOK=your_webhook_url
MAKE_PAYMENT_SUCCEEDED_WEBHOOK=your_webhook_url
MAKE_SEND_NOTIFICATION_WEBHOOK=your_webhook_url

# Payment Gateway (Stripe/PayTabs)
PAYMENT_WEBHOOK_SECRET=your_webhook_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Supabase Configuration

The project includes a complete Supabase configuration in `supabase/config.toml` with:
- Database settings (PostgreSQL 15)
- Authentication configuration
- Storage buckets setup
- Edge Functions configuration
- Email and SMS settings

## 📊 Database Migrations

The project includes a comprehensive initial migration (`001_initial_schema.sql`) that:
- Creates all necessary tables and relationships
- Sets up RLS policies for security
- Creates indexes for performance
- Sets up audit logging triggers
- Configures automatic timestamp updates

To apply migrations:
```bash
npm run db:push
```

## 🎨 UI Components

The project uses shadcn/ui components for a consistent design system:
- **Button**: Various button variants and sizes
- **Card**: Content containers with headers and content
- **Input**: Form input fields
- **Select**: Dropdown selection components
- **Badge**: Status and category indicators
- **Textarea**: Multi-line text input

## 🔐 Authentication Flow

1. **Sign Up**: Users choose role (client/provider) and provide basic info
2. **Email Verification**: Supabase handles email verification
3. **Onboarding**: Role-specific profile completion
4. **Session Management**: JWT tokens with role information
5. **Access Control**: Middleware protects routes based on roles

## 📱 Responsive Design

- Mobile-first approach
- Responsive grid layouts
- Touch-friendly interactions
- Optimized for all screen sizes

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- **Netlify**: Similar to Vercel setup
- **Railway**: Good for full-stack apps
- **AWS/GCP**: For enterprise deployments

## 📈 Performance Optimization

- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic route-based splitting
- **Lazy Loading**: Component and route lazy loading
- **Caching**: Supabase query caching
- **CDN**: Static asset delivery

## 🧪 Testing

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests (when implemented)
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and code comments
- **Issues**: Create GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact the development team

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ Core authentication and user management
- ✅ Service creation and management
- ✅ Basic booking system
- ✅ Dashboard and navigation

### Phase 2 (Next)
- 🔄 Payment integration (Stripe/PayTabs)
- 🔄 Real-time messaging
- 🔄 File upload and management
- 🔄 Review and rating system

### Phase 3 (Future)
- 📋 Advanced analytics and reporting
- 📋 Mobile app development
- 📋 API for third-party integrations
- 📋 Multi-language support
- 📋 Advanced automation workflows

## 🙏 Acknowledgments

- **Next.js Team**: For the amazing React framework
- **Supabase Team**: For the excellent backend-as-a-service
- **shadcn/ui**: For the beautiful component library
- **Tailwind CSS**: For the utility-first CSS framework
- **Open Source Community**: For all the amazing tools and libraries

---

Built with ❤️ for the business community in Oman and beyond.
