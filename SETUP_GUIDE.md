# OVG Engage - Supabase Setup Guide

## 🚀 Quick Start

Follow these steps to set up your Supabase backend for the OVG Engage reseller system.

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project name: `ovg-engage`
5. Set a strong database password
6. Choose a region close to your users
7. Click "Create new project"

### Step 2: Run Migrations

Once your project is created, you need to run the database migrations:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (replace with your project URL)
supabase link --project-ref your-project-ref

# Run all migrations
supabase migration run
```

Alternatively, you can run migrations manually in the Supabase dashboard:
1. Go to SQL Editor in Supabase dashboard
2. Copy and paste each migration file content in order:
   - `001_initial_schema.sql`
   - `002_pricing_tiers_addons.sql`
   - `003_custom_services.sql`
   - `004_reseller_pricing.sql`
   - `005_storage_setup.sql`

### Step 3: Configure Environment Variables

Create a `.env` file in your project root with these values:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# AI Services
GROQ_API_KEY=your-groq-api-key
GROK_API_KEY=your-grok-api-key
VITE_ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Optional: Booking System
BOOKING_API_URL=https://your-booking-api.com
BOOKING_API_KEY=your-booking-api-key
BOOKING_API_PROVIDER=custom
```

Get your Supabase keys from:
- Project Settings → API
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` → `VITE_SUPABASE_ANON_KEY`

### Step 4: Enable Email Authentication

1. Go to Authentication → Providers
2. Enable "Email" provider
3. Configure email templates (optional)
4. Set up email confirmation if needed

### Step 5: Configure Storage

The storage bucket will be created by the migration, but you need to set up RLS policies manually:

1. Go to Storage in Supabase dashboard
2. Check if `tenant-assets` bucket exists (created by migration)
3. Set bucket to **Public** (for widget asset access)
4. **Manual RLS Setup Required:**
   - Go to Storage → Policies
   - Create policies for `tenant-assets` bucket:
     - **INSERT**: Allow authenticated users with tenant access
     - **SELECT**: Allow public read access
     - **UPDATE/DELETE**: Allow authenticated users with tenant access

**RLS Policy SQL (run in SQL Editor):**
```sql
-- Allow authenticated resellers to upload assets for their tenants
CREATE POLICY "Resellers can upload assets for their tenants"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tenant-assets' AND
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.resellers r ON r.id = t.reseller_id
      WHERE r.user_id = auth.uid()
    )
  );

-- Allow resellers to view their own assets
CREATE POLICY "Resellers can view their own assets"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'tenant-assets' AND
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.resellers r ON r.id = t.reseller_id
      WHERE r.user_id = auth.uid()
    )
  );

-- Allow resellers to update their own assets
CREATE POLICY "Resellers can update their own assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tenant-assets' AND
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.resellers r ON r.id = t.reseller_id
      WHERE r.user_id = auth.uid()
    )
  );

-- Allow resellers to delete their own assets
CREATE POLICY "Resellers can delete their own assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tenant-assets' AND
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.resellers r ON r.id = t.reseller_id
      WHERE r.user_id = auth.uid()
    )
  );

-- Allow public read access to tenant assets (for widget display)
CREATE POLICY "Public read access to tenant assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-assets');
```

### Step 6: Test the Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test the application
# 1. Sign up as a reseller
# 2. Create a test client
# 3. Configure widget settings
# 4. Test the embed code
```

## 📋 Migration Order

The migrations must be run in this specific order:

1. **001_initial_schema.sql** - Core tables (resellers, tenants, widget_configs, leads, daily_stats, api_keys)
2. **002_pricing_tiers_addons.sql** - Pricing plans and add-on definitions
3. **003_custom_services.sql** - Custom services, time tracking, invoices
4. **004_reseller_pricing.sql** - Reseller custom pricing
5. **005_storage_setup.sql** - Storage bucket and RLS policies

## 🔧 Database Schema Overview

### Core Tables:
- **resellers** - Reseller accounts (extends auth.users)
- **tenants** - Client businesses managed by resellers
- **widget_configs** - White-label widget configuration per tenant
- **leads** - Leads and bookings captured by widgets
- **daily_stats** - Aggregated daily analytics per tenant
- **api_keys** - API keys for widget authentication

### Pricing Tables:
- **pricing_plans** - Available subscription plans
- **addon_definitions** - Available add-ons
- **reseller_pricing** - Custom pricing per reseller

### Service Tables:
- **custom_services** - Billable services for clients
- **time_entries** - Time tracking for services
- **invoices** - Monthly invoices
- **service_approvals** - Service approval tracking

## 🛡️ Security Features

### Row Level Security (RLS)
All tables have RLS policies that ensure:
- Resellers can only access their own data
- Tenants are isolated by reseller
- API keys are validated per tenant

### Storage Security
- Resellers can only upload assets for their tenants
- Public read access for widget asset display
- Secure file upload with validation

### Domain Whitelisting
- Widget validates domain before loading
- Prevents unauthorized widget usage
- Configurable per tenant

## 🐛 Troubleshooting

### Migration Fails
If migrations fail, check:
- You're running them in the correct order
- Your Supabase project is properly linked
- You have the necessary permissions

### Storage Issues
If storage isn't working:
- Verify the bucket is set to **Public**
- Check RLS policies are applied
- Ensure file sizes are within limits

### Authentication Issues
If users can't sign up:
- Verify email provider is enabled
- Check email confirmation settings
- Test with a different email address

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 🆘 Support

If you need help:
1. Check the Supabase dashboard logs
2. Review the error messages in browser console
3. Verify your environment variables are correct
4. Consult the [Resellers User Guide](./Resellers_User_Guide.md)

---

**Setup Complete!** 🎉

Once you've completed these steps, your Supabase backend will be ready to power the OVG Engage reseller system.