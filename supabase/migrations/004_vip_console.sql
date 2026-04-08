-- =====================================================
-- MIGRATION 004: VIP Customer Console
-- =====================================================
-- Creates tables for VIP customer console functionality
-- Customer profiles, rewards, and personalized offers
-- =====================================================

-- Add VIP console columns to widget_configs
ALTER TABLE widget_configs 
ADD COLUMN IF NOT EXISTS vip_console_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vip_shortcut TEXT DEFAULT 'SHIFT+V',
ADD COLUMN IF NOT EXISTS vip_access_method TEXT DEFAULT 'shortcut'; -- shortcut, password, code

-- =====================================================
-- VIP Customer Profiles Table
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}',
  rewards_points INTEGER DEFAULT 0,
  vip_tier TEXT DEFAULT 'standard' CHECK (vip_tier IN ('standard', 'silver', 'gold', 'platinum')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lead_id, tenant_id)
);

-- =====================================================
-- Customer Offers Table
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  customer_email TEXT,
  offer_type TEXT NOT NULL,
  offer_value DECIMAL(10,2) NOT NULL,
  offer_description TEXT,
  valid_until TIMESTAMP WITH TIME ZONE,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_offer_value CHECK (offer_value >= 0)
);

-- =====================================================
-- VIP Access Codes Table (optional security)
-- =====================================================
CREATE TABLE IF NOT EXISTS vip_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_max_uses CHECK (max_uses >= 1)
);

-- =====================================================
-- Customer Booking History (denormalized for fast access)
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_booking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  booking_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_customer_profiles_lead ON customer_profiles(lead_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_tenant ON customer_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_offers_email ON customer_offers(customer_email);
CREATE INDEX IF NOT EXISTS idx_customer_offers_tenant ON customer_offers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_offers_active ON customer_offers(used) WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS idx_vip_access_codes_code ON vip_access_codes(code);
CREATE INDEX IF NOT EXISTS idx_vip_access_codes_tenant ON vip_access_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_booking_history_email ON customer_booking_history(customer_email);
CREATE INDEX IF NOT EXISTS idx_customer_booking_history_tenant ON customer_booking_history(tenant_id);

-- =====================================================
-- Row Level Security Policies
-- =====================================================

-- Customer Profiles RLS
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON customer_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM leads l 
    WHERE l.id = customer_profiles.lead_id 
    AND l.email = current_user
  )
);

CREATE POLICY "Authenticated users can create own profile" ON customer_profiles
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads l 
    WHERE l.id = customer_profiles.lead_id 
    AND l.email = current_user
  )
);

-- Customer Offers RLS
ALTER TABLE customer_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own offers" ON customer_offers
FOR SELECT USING (customer_email = current_user);

CREATE POLICY "Authenticated users can insert own offers" ON customer_offers
FOR INSERT WITH CHECK (customer_email = current_user);

-- VIP Access Codes RLS
ALTER TABLE vip_access_codes ENABLE ROW LEVEL SECURITY;

-- Allow public to check access codes (for verification)
CREATE POLICY "Anyone can view active access codes" ON vip_access_codes
FOR SELECT USING (active = TRUE);

-- =====================================================
-- Note: More advanced RLS policies for reseller management
-- can be added once the reseller_client_assignments table
-- is created by the reseller system migration.
-- =====================================================

-- =====================================================
-- Functions
-- =====================================================

-- Function to create customer profile when lead is created
CREATE OR REPLACE FUNCTION create_customer_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO customer_profiles (lead_id, tenant_id)
  VALUES (NEW.id, NEW.tenant_id)
  ON CONFLICT (lead_id, tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create customer profile
DROP TRIGGER IF EXISTS on_lead_created ON leads;
CREATE TRIGGER on_lead_created
AFTER INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION create_customer_profile();

-- Function to add booking to history
CREATE OR REPLACE FUNCTION add_booking_to_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO customer_booking_history (lead_id, tenant_id, customer_email, booking_data)
  VALUES (NEW.id, NEW.tenant_id, NEW.email, row_to_json(NEW))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Insert default VIP access code for testing
-- =====================================================
-- INSERT INTO vip_access_codes (code, expires_at, max_uses, active)
-- VALUES ('VIP2026', NOW() + INTERVAL '1 year', 100, true);

COMMENT ON TABLE customer_profiles IS 'VIP customer profiles with preferences and rewards';
COMMENT ON TABLE customer_offers IS 'Personalized offers for customers';
COMMENT ON TABLE vip_access_codes IS 'VIP access codes for console security';
COMMENT ON TABLE customer_booking_history IS 'Denormalized booking history for fast customer access';