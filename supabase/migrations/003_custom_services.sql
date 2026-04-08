-- ============================================
-- OVG Engage - Custom Services & Invoicing
-- ============================================

-- ============================================
-- 1. CUSTOM SERVICES TABLE
-- ============================================
CREATE TABLE public.custom_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE CASCADE NOT NULL,
  service_name TEXT NOT NULL,
  description TEXT,
  hourly_rate DECIMAL(10,2) DEFAULT 850.00,
  estimated_hours DECIMAL(10,2) DEFAULT 1.0,
  estimated_total DECIMAL(10,2) GENERATED ALWAYS AS (hourly_rate * estimated_hours) STORED,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'billed', 'cancelled')),
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================
-- 2. TIME ENTRIES TABLE (for tracking time)
-- ============================================
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID REFERENCES public.custom_services(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  description TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN ended_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60 
      ELSE NULL 
    END
  ) STORED,
  is_running BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. INVOICES TABLE
-- ============================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  services JSONB DEFAULT '[]', -- Array of service IDs included
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 15.00, -- 15% VAT
  tax_amount DECIMAL(10,2) GENERATED ALWAYS AS (subtotal * tax_rate / 100) STORED,
  total DECIMAL(10,2) GENERATED ALWAYS AS (subtotal + (subtotal * tax_rate / 100)) STORED,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- ============================================
-- 4. SERVICE APPROVALS TABLE (audit trail)
-- ============================================
CREATE TABLE public.service_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID REFERENCES public.custom_services(id) ON DELETE CASCADE NOT NULL,
  approved_by TEXT, -- Email or name
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  approval_method TEXT DEFAULT 'email'
    CHECK (approval_method IN ('email', 'phone', 'meeting', 'portal')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_custom_services_tenant_id ON public.custom_services(tenant_id);
CREATE INDEX idx_custom_services_reseller_id ON public.custom_services(reseller_id);
CREATE INDEX idx_custom_services_status ON public.custom_services(status);
CREATE INDEX idx_time_entries_service_id ON public.time_entries(service_id);
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_reseller_id ON public.invoices(reseller_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_service_approvals_service_id ON public.service_approvals(service_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.custom_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_approvals ENABLE ROW LEVEL SECURITY;

-- Custom Services - resellers can view own
CREATE POLICY "Resellers can view own custom services"
  ON public.custom_services FOR SELECT
  USING (reseller_id IN (
    SELECT id FROM public.resellers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Resellers can insert own custom services"
  ON public.custom_services FOR INSERT
  WITH CHECK (reseller_id IN (
    SELECT id FROM public.resellers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Resellers can update own custom services"
  ON public.custom_services FOR UPDATE
  USING (reseller_id IN (
    SELECT id FROM public.resellers WHERE user_id = auth.uid()
  ));

-- Time Entries - resellers can view own
CREATE POLICY "Resellers can view own time entries"
  ON public.time_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_services cs
      JOIN public.resellers r ON r.id = cs.reseller_id
      WHERE cs.id = time_entries.service_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Resellers can insert time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_services cs
      JOIN public.resellers r ON r.id = cs.reseller_id
      WHERE cs.id = service_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Resellers can update own time entries"
  ON public.time_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_services cs
      JOIN public.resellers r ON r.id = cs.reseller_id
      WHERE cs.id = time_entries.service_id AND r.user_id = auth.uid()
    )
  );

-- Invoices - resellers can view own
CREATE POLICY "Resellers can view own invoices"
  ON public.invoices FOR SELECT
  USING (reseller_id IN (
    SELECT id FROM public.resellers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Resellers can insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (reseller_id IN (
    SELECT id FROM public.resellers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Resellers can update own invoices"
  ON public.invoices FOR UPDATE
  USING (reseller_id IN (
    SELECT id FROM public.resellers WHERE user_id = auth.uid()
  ));

-- Service Approvals - everyone can view
CREATE POLICY "Everyone can view service approvals"
  ON public.service_approvals FOR SELECT
  USING (true);

CREATE POLICY "Resellers can insert service approvals"
  ON public.service_approvals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_services cs
      JOIN public.resellers r ON r.id = cs.reseller_id
      WHERE cs.id = service_approvals.service_id AND r.user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER custom_services_updated_at
  BEFORE UPDATE ON public.custom_services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate total time spent on a service
CREATE OR REPLACE FUNCTION public.calculate_service_time(
  p_service_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_total_minutes INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
      WHEN is_running THEN EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
      ELSE 0
    END
  ), 0)::INTEGER
  INTO v_total_minutes
  FROM public.time_entries
  WHERE service_id = p_service_id;
  
  RETURN v_total_minutes;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate service cost based on time
CREATE OR REPLACE FUNCTION public.calculate_service_cost(
  p_service_id UUID
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_hourly_rate DECIMAL(10,2);
  v_total_minutes INTEGER;
BEGIN
  -- Get hourly rate
  SELECT hourly_rate INTO v_hourly_rate
  FROM public.custom_services
  WHERE id = p_service_id;
  
  -- Get total time
  SELECT public.calculate_service_time(p_service_id) INTO v_total_minutes;
  
  RETURN (v_total_minutes / 60.0) * v_hourly_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-' || v_year || '-(\d+)$') AS INTEGER)
  ), 0) + 1 INTO v_sequence
  FROM public.invoices
  WHERE invoice_number LIKE 'INV-' || v_year || '-%';
  
  RETURN 'INV-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.custom_services IS 'Custom development services for clients';
COMMENT ON TABLE public.time_entries IS 'Time tracking for custom services';
COMMENT ON TABLE public.invoices IS 'Invoices for custom services';
COMMENT ON TABLE public.service_approvals IS 'Client approval audit trail';