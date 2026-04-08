-- ============================================
-- OVG Engage - Reseller Multi-Tenant Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. RESELLERS TABLE
-- Extends Supabase auth.users
-- ============================================
CREATE TABLE public.resellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  max_tenants INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. TENANTS TABLE (Client Businesses)
-- ============================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  industry TEXT DEFAULT 'Wellness',
  domain TEXT,
  location TEXT,
  phone TEXT,
  email TEXT,
  embed_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. WIDGET CONFIGS TABLE
-- ============================================
CREATE TABLE public.widget_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE NOT NULL,
  branding JSONB DEFAULT '{
    "primaryColor": "#ec4899",
    "primaryGold": "#D4AF37",
    "logoUrl": "",
    "font": "Inter, sans-serif"
  }',
  ai_config JSONB DEFAULT '{
    "mood": "professional",
    "temperature": 0.7,
    "aiName": "Assistant",
    "greeting": "Welcome! How can I help you today?",
    "systemPrompt": ""
  }',
  offerings JSONB DEFAULT '{
    "treatments": ["Consultation"],
    "prices": {"Consultation": 100},
    "preferences": ["Water"],
    "currency": "$"
  }',
  special_offers TEXT,
  addons JSONB DEFAULT '{
    "voiceEnabled": true,
    "analyticsEnabled": true,
    "whatsappEnabled": true,
    "emailNotifications": false
  }',
  allowed_domains TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. LEADS TABLE (Bookings/Captures)
-- ============================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'Miss',
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  treatment TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  refreshment TEXT,
  appointment_time TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'confirmed', 'completed', 'cancelled', 'lost')),
  source TEXT DEFAULT 'widget',
  is_new_customer BOOLEAN DEFAULT true,
  conversation_data JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. DAILY STATS TABLE (Analytics Aggregation)
-- ============================================
CREATE TABLE public.daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_leads INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  conversations INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  UNIQUE(tenant_id, date)
);

-- ============================================
-- 6. API KEYS TABLE (For widget authentication)
-- ============================================
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT DEFAULT 'Widget Key',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_tenants_reseller_id ON public.tenants(reseller_id);
CREATE INDEX idx_tenants_domain ON public.tenants(domain);
CREATE INDEX idx_widget_configs_tenant_id ON public.widget_configs(tenant_id);
CREATE INDEX idx_leads_tenant_id ON public.leads(tenant_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_daily_stats_tenant_id ON public.daily_stats(tenant_id);
CREATE INDEX idx_daily_stats_date ON public.daily_stats(date DESC);
CREATE INDEX idx_api_keys_tenant_id ON public.api_keys(tenant_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------
-- Resellers Policies
-- --------------------------------------------
CREATE POLICY "Users can view own reseller account"
  ON public.resellers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own reseller account"
  ON public.resellers FOR UPDATE
  USING (auth.uid() = user_id);

-- --------------------------------------------
-- Tenants Policies
-- --------------------------------------------
CREATE POLICY "Resellers can view own tenants"
  ON public.tenants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resellers r 
      WHERE r.id = tenants.reseller_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Resellers can insert own tenants"
  ON public.tenants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resellers r 
      WHERE r.id = tenants.reseller_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Resellers can update own tenants"
  ON public.tenants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.resellers r 
      WHERE r.id = tenants.reseller_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Resellers can delete own tenants"
  ON public.tenants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.resellers r 
      WHERE r.id = tenants.reseller_id AND r.user_id = auth.uid()
    )
  );

-- --------------------------------------------
-- Widget Configs Policies
-- --------------------------------------------
CREATE POLICY "Resellers can view own widget configs"
  ON public.widget_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.resellers r ON r.id = t.reseller_id
      WHERE t.id = widget_configs.tenant_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Resellers can update own widget configs"
  ON public.widget_configs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.resellers r ON r.id = t.reseller_id
      WHERE t.id = widget_configs.tenant_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Resellers can insert own widget configs"
  ON public.widget_configs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.resellers r ON r.id = t.reseller_id
      WHERE t.id = widget_configs.tenant_id AND r.user_id = auth.uid()
    )
  );

-- --------------------------------------------
-- Leads Policies
-- --------------------------------------------
CREATE POLICY "Resellers can view own leads"
  ON public.leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.resellers r ON r.id = t.reseller_id
      WHERE t.id = leads.tenant_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Resellers can update own leads"
  ON public.leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.resellers r ON r.id = t.reseller_id
      WHERE t.id = leads.tenant_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Resellers can insert leads for own tenants"
  ON public.leads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.resellers r ON r.id = t.reseller_id
      WHERE t.id = leads.tenant_id AND r.user_id = auth.uid()
    )
  );

-- --------------------------------------------
-- Daily Stats Policies
-- --------------------------------------------
CREATE POLICY "Resellers can view own daily stats"
  ON public.daily_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.resellers r ON r.id = t.reseller_id
      WHERE t.id = daily_stats.tenant_id AND r.user_id = auth.uid()
    )
  );

-- --------------------------------------------
-- API Keys Policies
-- --------------------------------------------
CREATE POLICY "Resellers can view own API keys"
  ON public.api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.resellers r ON r.id = t.reseller_id
      WHERE t.id = api_keys.tenant_id AND r.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER resellers_updated_at
  BEFORE UPDATE ON public.resellers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER widget_configs_updated_at
  BEFORE UPDATE ON public.widget_configs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to create reseller account on signup
CREATE OR REPLACE FUNCTION public.handle_new_reseller_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.resellers (user_id, email, company_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'company_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_reseller_signup();

-- Function to auto-create widget config when tenant is created
CREATE OR REPLACE FUNCTION public.create_default_widget_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.widget_configs (tenant_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.create_default_widget_config();

-- Function to update daily stats
CREATE OR REPLACE FUNCTION public.update_daily_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.daily_stats (tenant_id, date, total_leads, total_revenue, new_customers, returning_customers)
  VALUES (
    NEW.tenant_id,
    DATE(NEW.created_at),
    1,
    COALESCE(NEW.price, 0),
    CASE WHEN NEW.is_new_customer THEN 1 ELSE 0 END,
    CASE WHEN NOT NEW.is_new_customer THEN 1 ELSE 0 END
  )
  ON CONFLICT (tenant_id, date) DO UPDATE SET
    total_leads = daily_stats.total_leads + 1,
    total_revenue = daily_stats.total_revenue + COALESCE(NEW.price, 0),
    new_customers = daily_stats.new_customers + CASE WHEN NEW.is_new_customer THEN 1 ELSE 0 END,
    returning_customers = daily_stats.returning_customers + CASE WHEN NOT NEW.is_new_customer THEN 1 ELSE 0 END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_lead_created
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_daily_stats();

-- Function to generate embed code
CREATE OR REPLACE FUNCTION public.generate_embed_code(tenant_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  tenant_record RECORD;
  api_key_record RECORD;
BEGIN
  SELECT * INTO tenant_record FROM public.tenants WHERE id = tenant_uuid;
  SELECT * INTO api_key_record FROM public.api_keys WHERE tenant_id = tenant_uuid AND is_active = true LIMIT 1;
  
  IF tenant_record IS NULL THEN
    RETURN NULL;
  END IF;

  -- Generate API key if none exists
  IF api_key_record IS NULL THEN
    INSERT INTO public.api_keys (tenant_id, key_hash, key_prefix, name)
    VALUES (tenant_uuid, encode(gen_random_bytes(32), 'hex'), left(encode(gen_random_bytes(4), 'hex'), 8), 'Widget Key')
    RETURNING * INTO api_key_record;
  END IF;

  RETURN '<script>
  window.ovgConfig = {
    tenantId: "' || tenant_uuid || '",
    apiKey: "' || api_key_record.key_hash || '",
    widgetUrl: "https://ovg-engage.vercel.app"
  };
</script>
<script src="https://ovg-engage.vercel.app/src/loader.js"></script>';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORAGE BUCKET FOR LOGOS
-- ============================================
-- Note: Run this separately in Supabase dashboard or via API
-- CREATE STORAGE BUCKET 'tenant-logos' WITH public access

-- ============================================
-- INITIAL DATA (Optional - for testing)
-- ============================================
-- This section can be removed in production

COMMENT ON TABLE public.resellers IS 'Reseller accounts that manage multiple client tenants';
COMMENT ON TABLE public.tenants IS 'Client businesses managed by resellers';
COMMENT ON TABLE public.widget_configs IS 'White-label widget configuration per tenant';
COMMENT ON TABLE public.leads IS 'Leads and bookings captured by widgets';
COMMENT ON TABLE public.daily_stats IS 'Aggregated daily analytics per tenant';
COMMENT ON TABLE public.api_keys IS 'API keys for widget authentication';