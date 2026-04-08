-- Create reseller_pricing table for custom pricing overrides
CREATE TABLE IF NOT EXISTS reseller_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES resellers(id) ON DELETE CASCADE,
  plan_slug TEXT,
  addon_slug TEXT,
  price_to_client DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure either plan_slug or addon_slug is set, but not both
  CONSTRAINT valid_pricing_type CHECK (
    (plan_slug IS NOT NULL AND addon_slug IS NULL) OR
    (plan_slug IS NULL AND addon_slug IS NOT NULL)
  ),
  
  -- Unique constraint per reseller per plan/addon
  CONSTRAINT unique_reseller_plan UNIQUE (reseller_id, plan_slug),
  CONSTRAINT unique_reseller_addon UNIQUE (reseller_id, addon_slug)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reseller_pricing_reseller_id ON reseller_pricing(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_pricing_plan_slug ON reseller_pricing(plan_slug);
CREATE INDEX IF NOT EXISTS idx_reseller_pricing_addon_slug ON reseller_pricing(addon_slug);

-- Add RLS policies
ALTER TABLE reseller_pricing ENABLE ROW LEVEL SECURITY;

-- Policy: Resellers can only access their own pricing
CREATE POLICY "Reseller pricing access" ON reseller_pricing
  FOR ALL
  USING (
    reseller_id = (
      SELECT id FROM resellers 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Allow inserts for authenticated resellers
CREATE POLICY "Reseller pricing insert" ON reseller_pricing
  FOR INSERT
  WITH CHECK (
    reseller_id = (
      SELECT id FROM resellers 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Allow updates for authenticated resellers
CREATE POLICY "Reseller pricing update" ON reseller_pricing
  FOR UPDATE
  USING (
    reseller_id = (
      SELECT id FROM resellers 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Allow deletes for authenticated resellers
CREATE POLICY "Reseller pricing delete" ON reseller_pricing
  FOR DELETE
  USING (
    reseller_id = (
      SELECT id FROM resellers 
      WHERE user_id = auth.uid()
    )
  );

-- Create function to get effective pricing for a reseller
CREATE OR REPLACE FUNCTION get_reseller_pricing(
  p_reseller_id UUID,
  p_plan_slug TEXT DEFAULT NULL,
  p_addon_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
  plan_slug TEXT,
  addon_slug TEXT,
  base_cost_min DECIMAL,
  base_cost_max DECIMAL,
  reseller_price DECIMAL,
  currency TEXT,
  profit_min DECIMAL,
  profit_max DECIMAL,
  markup_min_percent DECIMAL,
  markup_max_percent DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return plan pricing
  IF p_plan_slug IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      pp.slug as plan_slug,
      NULL::TEXT as addon_slug,
      pp.cost_to_us_min as base_cost_min,
      pp.cost_to_us_max as base_cost_max,
      COALESCE(rp.price_to_client, pp.price_to_client) as reseller_price,
      COALESCE(rp.currency, pp.currency, 'USD') as currency,
      (COALESCE(rp.price_to_client, pp.price_to_client) - pp.cost_to_us_min) as profit_min,
      (COALESCE(rp.price_to_client, pp.price_to_client) - pp.cost_to_us_max) as profit_max,
      CASE 
        WHEN pp.cost_to_us_min > 0 THEN 
          ((COALESCE(rp.price_to_client, pp.price_to_client) - pp.cost_to_us_min) / pp.cost_to_us_min) * 100
        ELSE 0
      END as markup_min_percent,
      CASE 
        WHEN pp.cost_to_us_max > 0 THEN 
          ((COALESCE(rp.price_to_client, pp.price_to_client) - pp.cost_to_us_max) / pp.cost_to_us_max) * 100
        ELSE 0
      END as markup_max_percent
    FROM pricing_plans pp
    LEFT JOIN reseller_pricing rp ON pp.slug = rp.plan_slug AND rp.reseller_id = p_reseller_id
    WHERE pp.slug = p_plan_slug AND pp.is_active = true;
  
  -- Return addon pricing
  ELSIF p_addon_slug IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      NULL::TEXT as plan_slug,
      ad.slug as addon_slug,
      ad.cost_to_us_min as base_cost_min,
      ad.cost_to_us_max as base_cost_max,
      COALESCE(rp.price_to_client, ad.price_to_client) as reseller_price,
      COALESCE(rp.currency, ad.currency, 'USD') as currency,
      (COALESCE(rp.price_to_client, ad.price_to_client) - ad.cost_to_us_min) as profit_min,
      (COALESCE(rp.price_to_client, ad.price_to_client) - ad.cost_to_us_max) as profit_max,
      CASE 
        WHEN ad.cost_to_us_min > 0 THEN 
          ((COALESCE(rp.price_to_client, ad.price_to_client) - ad.cost_to_us_min) / ad.cost_to_us_min) * 100
        ELSE 0
      END as markup_min_percent,
      CASE 
        WHEN ad.cost_to_us_max > 0 THEN 
          ((COALESCE(rp.price_to_client, ad.price_to_client) - ad.cost_to_us_max) / ad.cost_to_us_max) * 100
        ELSE 0
      END as markup_max_percent
    FROM addon_definitions ad
    LEFT JOIN reseller_pricing rp ON ad.slug = rp.addon_slug AND rp.reseller_id = p_reseller_id
    WHERE ad.slug = p_addon_slug AND ad.is_active = true;
  
  -- Return all pricing for reseller
  ELSE
    -- Plans
    RETURN QUERY
    SELECT 
      pp.slug as plan_slug,
      NULL::TEXT as addon_slug,
      pp.cost_to_us_min as base_cost_min,
      pp.cost_to_us_max as base_cost_max,
      COALESCE(rp.price_to_client, pp.price_to_client) as reseller_price,
      COALESCE(rp.currency, pp.currency, 'USD') as currency,
      (COALESCE(rp.price_to_client, pp.price_to_client) - pp.cost_to_us_min) as profit_min,
      (COALESCE(rp.price_to_client, pp.price_to_client) - pp.cost_to_us_max) as profit_max,
      CASE 
        WHEN pp.cost_to_us_min > 0 THEN 
          ((COALESCE(rp.price_to_client, pp.price_to_client) - pp.cost_to_us_min) / pp.cost_to_us_min) * 100
        ELSE 0
      END as markup_min_percent,
      CASE 
        WHEN pp.cost_to_us_max > 0 THEN 
          ((COALESCE(rp.price_to_client, pp.price_to_client) - pp.cost_to_us_max) / pp.cost_to_us_max) * 100
        ELSE 0
      END as markup_max_percent
    FROM pricing_plans pp
    LEFT JOIN reseller_pricing rp ON pp.slug = rp.plan_slug AND rp.reseller_id = p_reseller_id
    WHERE pp.is_active = true
    
    UNION ALL
    
    -- Addons
    SELECT 
      NULL::TEXT as plan_slug,
      ad.slug as addon_slug,
      ad.cost_to_us_min as base_cost_min,
      ad.cost_to_us_max as base_cost_max,
      COALESCE(rp.price_to_client, ad.price_to_client) as reseller_price,
      COALESCE(rp.currency, ad.currency, 'USD') as currency,
      (COALESCE(rp.price_to_client, ad.price_to_client) - ad.cost_to_us_min) as profit_min,
      (COALESCE(rp.price_to_client, ad.price_to_client) - ad.cost_to_us_max) as profit_max,
      CASE 
        WHEN ad.cost_to_us_min > 0 THEN 
          ((COALESCE(rp.price_to_client, ad.price_to_client) - ad.cost_to_us_min) / ad.cost_to_us_min) * 100
        ELSE 0
      END as markup_min_percent,
      CASE 
        WHEN ad.cost_to_us_max > 0 THEN 
          ((COALESCE(rp.price_to_client, ad.price_to_client) - ad.cost_to_us_max) / ad.cost_to_us_max) * 100
        ELSE 0
      END as markup_max_percent
    FROM addon_definitions ad
    LEFT JOIN reseller_pricing rp ON ad.slug = rp.addon_slug AND rp.reseller_id = p_reseller_id
    WHERE ad.is_active = true;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON reseller_pricing TO authenticated;
GRANT EXECUTE ON FUNCTION get_reseller_pricing(UUID, TEXT, TEXT) TO authenticated;