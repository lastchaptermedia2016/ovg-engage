// src/ZillionOVG Engage | AI Concierge
// White-label configuration - can be overridden via window.ovgConfig

// Default configuration for The Luxe Med Spa
const defaultConfig = {
  tenant: {
    name: "The Luxe Med Spa",
    location: "New Haven Sanctuary",
    industry: "Wellness",
    id: "zillion_001" 
  },
  branding: {
    primaryGold: "#D4AF37",
    velvetRed: "#450a0a",
    primaryColor: "#ec4899",
    font: "Inter, sans-serif"
  },
  context: {
    offerings: ["Botox", "Filler", "HydraFacial", "Laser", "Peel", "Consultation"],
    preferences: ["Water", "Latte", "Champagne", "Espresso", "Mocha"],
    customerTypes: ["New", "Repeat"], 
    defaultPrice: 150.00,
    currency: "$"
  },

  // --- THE MASTER ANCHOR (Fixes Lopsided Data) ---
  // These are the 11 points of data. THE ORDER HERE MATTERS.
  captureSchema: {
    fields: [
      "status",    // 1. New/Repeat
      "title",     // 2.
      "name",      // 3.
      "surname",   // 4.
      "phone",     // 5.
      "email",     // 6.
      "drinks",    // 7.
      "time",      // 8.
      "treatment", // 9.
      "price",     // 10.
      "timestamp"  // 11. The Tail-End Anchor
    ],
    fallback: "—" // Used if a field is missing to prevent column shifting
  },

  /**
   * THE SYNC FUNCTION: 
   * This forces any raw AI data into a perfectly aligned 11-point object.
   * If a field is missing, it inserts the fallback "—" so the grid never slides.
   */
  syncLead: (raw: any) => {
    const synced: any = {};

    defaultConfig.captureSchema.fields.forEach((field) => {
      // 1. Check for the field name directly, or common AI aliases
      let value = raw[field];

      // 2. Map common aliases to our strict schema keys
      if (!value) {
        if (field === "name") value = raw.firstName || raw.givenName;
        if (field === "surname") value = raw.lastName || raw.familyName;
        if (field === "drinks") value = raw.refreshment || raw.preference;
        if (field === "status") value = raw.isNew ? "New" : "Repeat";
        if (field === "timestamp") value = new Date().toLocaleTimeString();
      }

      // 3. Apply the final value or the fallback
      synced[field] = (value && value !== "") ? value : defaultConfig.captureSchema.fallback;
    });

    return synced;
  }
};

// Merge with window.ovgConfig for white-label support
const globalConfig = (typeof window !== 'undefined' && (window as any).ovgConfig) || {};

// Build the final config by merging defaults with global overrides
export const ZillionConfig = {
  tenant: {
    ...defaultConfig.tenant,
    ...(globalConfig.tenant || {})
  },
  branding: {
    ...defaultConfig.branding,
    ...(globalConfig.branding || {})
  },
  context: {
    ...defaultConfig.context,
    ...(globalConfig.context || {})
  },
  captureSchema: defaultConfig.captureSchema,
  syncLead: defaultConfig.syncLead
};
