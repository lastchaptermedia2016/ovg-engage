-- ============================================
-- OVG Engage - Pricing Tiers & Add-ons Schema
-- ============================================

-- ============================================
-- HELPER FUNCTION (in case it doesn't exist)
-- ============================================
-- Create the handle_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. PRICING PLANS TABLE
-- ============================================
CREATE TABLE public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cost_to_us_min DECIMAL(10,2) DEFAULT 0,
  cost_to_us_max DECIMAL(10,2) DEFAULT 0,
  price_to_client DECIMAL(10,2) DEFAULT 0,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ADD-ON DEFINITIONS TABLE
-- ============================================
CREATE TABLE public.addon_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cost_to_us_min DECIMAL(10,2) DEFAULT 0,
  cost_to_us_max DECIMAL(10,2) DEFAULT 0,
  price_to_client DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Update TENANTS table with tier and addons
-- ============================================
ALTER TABLE public.tenants 
ADD COLUMN subscription_tier TEXT DEFAULT 'starter' 
  CHECK (subscription_tier IN ('starter', 'professional', 'business', 'enterprise')),
ADD COLUMN addons JSONB DEFAULT '[]',
ADD COLUMN billing_cycle TEXT DEFAULT 'monthly'
  CHECK (billing_cycle IN ('monthly', 'annual')),
ADD COLUMN billing_date INTEGER, -- Day of month (1-31)
ADD COLUMN is_billing_active BOOLEAN DEFAULT true;

-- ============================================
-- 4. SUBSCRIPTION HISTORY TABLE (for tracking changes)
-- ============================================
CREATE TABLE public.subscription_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  old_tier TEXT,
  new_tier TEXT,
  old_addons JSONB,
  new_addons JSONB,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_tenants_subscription_tier ON public.tenants(subscription_tier);
CREATE INDEX idx_tenants_billing_date ON public.tenants(billing_date);
CREATE INDEX idx_subscription_history_tenant_id ON public.subscription_history(tenant_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Pricing Plans - everyone can view
CREATE POLICY "Anyone can view pricing plans"
  ON public.pricing_plans FOR SELECT
  USING (true);

-- Addon Definitions - everyone can view
CREATE POLICY "Anyone can view addon definitions"
  ON public.addon_definitions FOR SELECT
  USING (true);

-- Subscription History - resellers can view own
CREATE POLICY "Resellers can view own subscription history"
  ON public.subscription_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.resellers r ON r.id = t.reseller_id
      WHERE t.id = subscription_history.tenant_id AND r.user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER pricing_plans_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER addon_definitions_updated_at
  BEFORE UPDATE ON public.addon_definitions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- INITIAL DATA
-- ============================================

-- Pricing Plans
INSERT INTO public.pricing_plans (name, slug, description, cost_to_us_min, cost_to_us_max, price_to_client, features) VALUES
('Starter', 'starter', 'Groq LLM + basic WhatsApp + Supabase', 45, 65, 499, 
 '["Basic LLM Chat", "WhatsApp Integration", "Supabase Backend", "Up to 1,000 conversations/month"]'),
('Professional', 'professional', 'Add Voice (STT + TTS) + more LLM calls', 95, 130, 999,
 '["Everything in Starter", "Voice Interface (STT/TTS)", "Up to 5,000 conversations/month", "Priority Support"]'),
('Business', 'business', 'Higher volume + Multilingual + Proactive', 160, 220, 1999,
 '["Everything in Professional", "Multilingual Support", "Proactive Engagement", "Up to 15,000 conversations/month", "Advanced Analytics"]'),
('Enterprise', 'enterprise', 'Unlimited volume + API + custom', 280, 450, 3999,
 '["Everything in Business", "Unlimited conversations", "Custom API Access", "Dedicated Support", "Custom Integrations"]');

-- Add-on Definitions
INSERT INTO public.addon_definitions (name, slug, description, cost_to_us_min, cost_to_us_max, price_to_client) VALUES
('Voice Interface', 'voice-interface', 'Speech-to-text and text-to-speech capabilities', 35, 55, 200),
('Emotion AI & Sentiment Analysis', 'emotion-ai', 'Detect customer emotions and adjust responses', 15, 25, 100),
('Proactive Engagement', 'proactive-engagement', 'Initiate conversations based on user behavior', 20, 30, 150),
('Multilingual Support', 'multilingual', 'Support for multiple languages', 25, 40, 250),
('Advanced CRM Integration', 'crm-integration', 'Connect with popular CRM systems', 10, 20, 300),
('After-Hours Auto Handling', 'after-hours', 'Automated responses outside business hours', 12, 18, 100),
('Analytics Dashboard (Advanced)', 'advanced-analytics', 'Detailed analytics and reporting', 8, 15, 150),
('White Label / Custom Branding', 'white-label', 'Remove OVG branding, custom colors/logo', 5, 10, 200),
('API Access', 'api-access', 'Direct API access for custom integrations', 15, 30, 250),
('Extra 5,000 Conversations', 'extra-conversations', 'Additional 5,000 conversations per month', 18, 28, 150);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate monthly cost for a tenant
CREATE OR REPLACE FUNCTION public.calculate_tenant_monthly_cost(
  p_tenant_id UUID
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_tier_cost DECIMAL(10,2) := 0;
  v_addon_cost DECIMAL(10,2) := 0;
  v_tier_slug TEXT;
  v_addons JSONB;
  v_addon_record RECORD;
BEGIN
  -- Get tenant tier and addons
  SELECT subscription_tier, addons 
  INTO v_tier_slug, v_addons
  FROM public.tenants 
  WHERE id = p_tenant_id;
  
  -- Get tier cost (use max estimate)
  SELECT cost_to_us_max INTO v_tier_cost
  FROM public.pricing_plans
  WHERE slug = v_tier_slug AND is_active = true;
  
  -- Calculate addon costs
  IF v_addons IS NOT NULL AND jsonb_array_length(v_addons) > 0 THEN
    FOR v_addon_record IN 
      SELECT SUM(cost_to_us_max) as total
      FROM public.addon_definitions
      WHERE slug = ANY(SELECT jsonb_array_elements_text(v_addons))
        AND is_active = true
    LOOP
      v_addon_cost := COALESCE(v_addon_record.total, 0);
    END LOOP;
  END IF;
  
  RETURN COALESCE(v_tier_cost, 0) + COALESCE(v_addon_cost, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate monthly revenue for a tenant
CREATE OR REPLACE FUNCTION public.calculate_tenant_monthly_revenue(
  p_tenant_id UUID
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_tier_revenue DECIMAL(10,2) := 0;
  v_addon_revenue DECIMAL(10,2) := 0;
  v_tier_slug TEXT;
  v_addons JSONB;
  v_addon_record RECORD;
BEGIN
  -- Get tenant tier and addons
  SELECT subscription_tier, addons 
  INTO v_tier_slug, v_addons
  FROM public.tenants 
  WHERE id = p_tenant_id;
  
  -- Get tier revenue
  SELECT price_to_client INTO v_tier_revenue
  FROM public.pricing_plans
  WHERE slug = v_tier_slug AND is_active = true;
  
  -- Calculate addon revenue
  IF v_addons IS NOT NULL AND jsonb_array_length(v_addons) > 0 THEN
    FOR v_addon_record IN 
      SELECT SUM(price_to_client) as total
      FROM public.addon_definitions
      WHERE slug = ANY(SELECT jsonb_array_elements_text(v_addons))
        AND is_active = true
    LOOP
      v_addon_revenue := COALESCE(v_addon_record.total, 0);
    END LOOP;
  END IF;
  
  RETURN COALESCE(v_tier_revenue, 0) + COALESCE(v_addon_revenue, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.pricing_plans IS 'Subscription tier definitions with pricing';
COMMENT ON TABLE public.addon_definitions IS 'Available add-on features with pricing';
COMMENT ON TABLE public.subscription_history IS 'History of subscription changes for tenants';
COMMENT ON COLUMN public.tenants.subscription_tier IS 'Current subscription tier (starter, professional, business, enterprise)';
COMMENT ON COLUMN public.tenants.addons IS 'JSON array of active add-on slugs';