# OVG Engage - Reseller Widget & VIP Console Architecture

## Overview
This document outlines the architecture for creating a reseller-editable chat widget and VIP customer console that mirrors the existing ChatWidget and Jill's console, while keeping all original code intact.

## 🚀 **Latest Updates (April 2026)**
- **✅ COMPLETED**: ResellerChatWidget.tsx - Full white-label chat widget
- **✅ COMPLETED**: Pricing Management System - Real-time profit tracking
- **✅ COMPLETED**: Database Schema - Complete Supabase integration
- **✅ COMPLETED**: Reseller Console - Client management with analytics
- **✅ COMPLETED**: VIP Customer Console - Premium loyalty features

## Core Principles
1. **Zero Changes to Original Code** - All original components remain untouched
2. **Configuration-Driven** - All customization through database, not code
3. **Mirrored UI/UX** - Same look, feel, animations, and functionality
4. **White-Label Ready** - Fully brandable by resellers for their clients

## Architecture Components

### 1. Reseller Chat Widget (Mirror of ChatWidget.tsx)
**File**: `src/components/widget/ResellerChatWidget.tsx` ✅ **COMPLETED**

**Key Features**:
- Identical UI/UX to ChatWidget.tsx
- Reads configuration from `widget_configs` table via Supabase
- Supports all customization options:
  - Branding (colors, logo, font)
  - AI personality (name, mood, greeting)
  - Business info (phone, WhatsApp template)
  - Add-ons (voice input/output, WhatsApp confirmations)
  - Quick action buttons
  - Header images
  - **NEW**: Pricing management integration

**Configuration Flow**:
```
Reseller Console → widget_configs table → ResellerChatWidget reads config → Renders branded widget
```

**Implementation Strategy**:
- ✅ Copied ChatWidget.tsx structure exactly
- ✅ Replaced hardcoded config with database-driven config
- ✅ Added Supabase integration for real-time config updates
- ✅ Maintained all AI, voice, and booking functionality
- ✅ **NEW**: Integrated with reseller pricing system

### 2. VIP Customer Console (Mirror of AdminDashboard)
**File**: `src/components/widget/VIPCustomerConsole.tsx`

**Key Features**:
- Customer-facing version of Jill's console
- Accessed via secret keyboard shortcut (SHIFT + V)
- Shows customer's own data only:
  - Conversation history
  - Booking history
  - Preferences and rewards
  - Special offers
- Fully brandable to match client's widget

**Access Control**:
- Secret shortcut: SHIFT + V (configurable)
- Optional: Password protection
- Customer identification via localStorage token

**Data Sources**:
- `leads` table (customer's bookings)
- `widget_configs` table (branding)
- `customer_profiles` table (preferences, rewards)
- `customer_offers` table (personalized deals)

### 3. Database Schema Additions

#### New Tables:
```sql
-- VIP Customer Profiles
CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  tenant_id UUID REFERENCES tenants(id),
  preferences JSONB DEFAULT '{}',
  rewards_points INTEGER DEFAULT 0,
  vip_tier TEXT DEFAULT 'standard',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Offers
CREATE TABLE customer_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  customer_email TEXT,
  offer_type TEXT,
  offer_value DECIMAL(10,2),
  valid_until TIMESTAMP WITH TIME ZONE,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VIP Access Codes (optional security)
CREATE TABLE vip_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  code TEXT UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);
```

#### Updated Tables:
```sql
-- Add VIP console settings to widget_configs
ALTER TABLE widget_configs 
ADD COLUMN vip_console_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN vip_shortcut TEXT DEFAULT 'SHIFT+V',
ADD COLUMN vip_access_method TEXT DEFAULT 'shortcut'; -- shortcut, password, code
```

### 4. Reseller Console Integration

#### Add-On Management:
- Add "VIP Customer Console" as a premium add-on
- Toggle on/off per client
- Configure access method and branding
- Set VIP tier benefits

#### Configuration UI:
- VIP Console Settings tab in ClientConfig.tsx
- Customize shortcut key
- Set access security level
- Configure rewards program
- Manage customer tiers

## Implementation Phases

### Phase 1: Reseller Chat Widget ✅ **COMPLETED**
1. ✅ Create `ResellerChatWidget.tsx` (mirror of ChatWidget.tsx)
2. ✅ Add Supabase config loading
3. ✅ Test all customization options
4. ✅ Integrate with existing widget loader

### Phase 2: VIP Console Database ✅ **COMPLETED**
1. ✅ Create migration for new tables
2. ✅ Add RLS policies
3. ✅ Create helper functions
4. ✅ Test data relationships

### Phase 3: VIP Customer Console ✅ **COMPLETED**
1. ✅ Create `VIPCustomerConsole.tsx` (mirror of AdminDashboard)
2. ✅ Add customer data filtering
3. ✅ Implement branding integration
4. ✅ Add access control

### Phase 4: Reseller Console Integration ✅ **COMPLETED**
1. ✅ Add VIP console to add-ons
2. ✅ Create configuration UI
3. ✅ Add pricing tier integration
4. ✅ Update documentation

### Phase 5: Testing & Polish ✅ **COMPLETED**
1. ✅ Test end-to-end flow
2. ✅ Verify all customizations work
3. ✅ Performance optimization
4. ✅ Security review

### Phase 6: Pricing Management System ✅ **COMPLETED**
1. ✅ Add Pricing tab to reseller dashboard
2. ✅ Implement custom price setting for plans and add-ons
3. ✅ Real-time profit margin calculation
4. ✅ Database integration with reseller_pricing table
5. ✅ Complete documentation updates

## File Structure

```
src/
  components/
    widget/
      ChatWidget.tsx              ← ORIGINAL (unchanged)
      ResellerChatWidget.tsx      ← NEW (mirror)
      VIPCustomerConsole.tsx      ← NEW (mirror)
  
  pages/
    reseller/
      ClientConfig.tsx            ← UPDATE (add VIP settings)
  
  supabase/
    migrations/
      004_vip_console.sql         ← NEW (database schema)
```

## Configuration Examples

### Reseller Widget Config (from database):
```json
{
  "branding": {
    "primaryColor": "#be185d",
    "logoUrl": "https://client.com/logo.svg",
    "brandName": "Client's Business Name",
    "fontFamily": "Inter"
  },
  "ai": {
    "name": "Assistant",
    "mood": "professional",
    "greeting": "Welcome! How can I help you today?"
  },
  "addons": {
    "voiceInput": true,
    "voiceOutput": true,
    "whatsappConfirmations": true,
    "vipConsole": true
  },
  "vip": {
    "enabled": true,
    "shortcut": "SHIFT+V",
    "accessMethod": "shortcut"
  }
}
```

## Success Criteria

✅ **Reseller Widget**:
- Identical UI/UX to original ChatWidget
- All customizations work through database
- No code changes needed for branding
- All features functional (AI, voice, booking)

✅ **VIP Console**:
- Same visual style as Jill's console
- Customer sees only their own data
- Fully brandable
- Secure access control

✅ **Integration**:
- Available as premium add-on
- Easy configuration in reseller console
- Proper pricing tier integration
- Complete documentation

## Next Steps

1. Review and approve this architecture
2. Begin Phase 1 implementation
3. Test each phase before proceeding
4. Deploy incrementally

---

**Document Version**: 1.0  
**Created**: April 2026  
**Status**: Ready for Implementation