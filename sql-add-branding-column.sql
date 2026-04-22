-- Add branding column to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{"primaryColor": "#ec4899", "primaryGold": "#D4AF37", "logoUrl": "", "font": "Inter, sans-serif"}'::jsonb;
