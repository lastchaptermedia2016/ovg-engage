export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      resellers: {
        Row: {
          id: string
          user_id: string
          email: string
          company_name: string | null
          phone: string | null
          subscription_tier: string
          max_tenants: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          company_name?: string | null
          phone?: string | null
          subscription_tier?: string
          max_tenants?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          company_name?: string | null
          phone?: string | null
          subscription_tier?: string
          max_tenants?: number
          created_at?: string
          updated_at?: string
        }
      }
      tenants: {
        Row: {
          id: string
          reseller_id: string
          name: string
          industry: string
          domain: string | null
          location: string | null
          phone: string | null
          email: string | null
          embed_code: string | null
          is_active: boolean
          subscription_tier: string
          addons: Json
          billing_cycle: string
          billing_date: number | null
          is_billing_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reseller_id: string
          name: string
          industry?: string
          domain?: string | null
          location?: string | null
          phone?: string | null
          email?: string | null
          embed_code?: string | null
          is_active?: boolean
          subscription_tier?: string
          addons?: Json
          billing_cycle?: string
          billing_date?: number | null
          is_billing_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reseller_id?: string
          name?: string
          industry?: string
          domain?: string | null
          location?: string | null
          phone?: string | null
          email?: string | null
          embed_code?: string | null
          is_active?: boolean
          subscription_tier?: string
          addons?: Json
          billing_cycle?: string
          billing_date?: number | null
          is_billing_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      widget_configs: {
        Row: {
          id: string
          tenant_id: string
          branding: Json
          ai_config: Json
          offerings: Json
          special_offers: string | null
          addons: Json
          allowed_domains: string[] | null
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          branding?: Json
          ai_config?: Json
          offerings?: Json
          special_offers?: string | null
          addons?: Json
          allowed_domains?: string[] | null
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          branding?: Json
          ai_config?: Json
          offerings?: Json
          special_offers?: string | null
          addons?: Json
          allowed_domains?: string[] | null
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          tenant_id: string
          title: string
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string | null
          treatment: string | null
          price: number
          refreshment: string | null
          appointment_time: string | null
          status: string
          source: string
          is_new_customer: boolean
          conversation_data: Json | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          title?: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          treatment?: string | null
          price?: number
          refreshment?: string | null
          appointment_time?: string | null
          status?: string
          source?: string
          is_new_customer?: boolean
          conversation_data?: Json | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          title?: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          treatment?: string | null
          price?: number
          refreshment?: string | null
          appointment_time?: string | null
          status?: string
          source?: string
          is_new_customer?: boolean
          conversation_data?: Json | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      daily_stats: {
        Row: {
          id: string
          tenant_id: string
          date: string
          total_leads: number
          total_revenue: number
          conversations: number
          conversions: number
          new_customers: number
          returning_customers: number
        }
        Insert: {
          id?: string
          tenant_id: string
          date: string
          total_leads?: number
          total_revenue?: number
          conversations?: number
          conversions?: number
          new_customers?: number
          returning_customers?: number
        }
        Update: {
          id?: string
          tenant_id?: string
          date?: string
          total_leads?: number
          total_revenue?: number
          conversations?: number
          conversions?: number
          new_customers?: number
          returning_customers?: number
        }
      }
      api_keys: {
        Row: {
          id: string
          tenant_id: string
          key_hash: string
          key_prefix: string
          name: string
          is_active: boolean
          created_at: string
          expires_at: string | null
          last_used_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          key_hash: string
          key_prefix: string
          name?: string
          is_active?: boolean
          created_at?: string
          expires_at?: string | null
          last_used_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          key_hash?: string
          key_prefix?: string
          name?: string
          is_active?: boolean
          created_at?: string
          expires_at?: string | null
          last_used_at?: string | null
        }
      }
      pricing_plans: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          cost_to_us_min: number
          cost_to_us_max: number
          price_to_client: number
          features: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          cost_to_us_min?: number
          cost_to_us_max?: number
          price_to_client?: number
          features?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          cost_to_us_min?: number
          cost_to_us_max?: number
          price_to_client?: number
          features?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      addon_definitions: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          cost_to_us_min: number
          cost_to_us_max: number
          price_to_client: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          cost_to_us_min?: number
          cost_to_us_max?: number
          price_to_client?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          cost_to_us_min?: number
          cost_to_us_max?: number
          price_to_client?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subscription_history: {
        Row: {
          id: string
          tenant_id: string
          old_tier: string | null
          new_tier: string | null
          old_addons: Json | null
          new_addons: Json | null
          old_price: number | null
          new_price: number | null
          changed_by: string | null
          changed_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          old_tier?: string | null
          new_tier?: string | null
          old_addons?: Json | null
          new_addons?: Json | null
          old_price?: number | null
          new_price?: number | null
          changed_by?: string | null
          changed_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          old_tier?: string | null
          new_tier?: string | null
          old_addons?: Json | null
          new_addons?: Json | null
          old_price?: number | null
          new_price?: number | null
          changed_by?: string | null
          changed_at?: string
          notes?: string | null
        }
      }
      custom_services: {
        Row: {
          id: string
          tenant_id: string
          reseller_id: string
          service_name: string
          description: string | null
          hourly_rate: number
          estimated_hours: number
          estimated_total: number
          status: string
          priority: string
          notes: string | null
          internal_notes: string | null
          created_at: string
          updated_at: string
          approved_at: string | null
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          reseller_id: string
          service_name: string
          description?: string | null
          hourly_rate?: number
          estimated_hours?: number
          estimated_total?: number
          status?: string
          priority?: string
          notes?: string | null
          internal_notes?: string | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          reseller_id?: string
          service_name?: string
          description?: string | null
          hourly_rate?: number
          estimated_hours?: number
          estimated_total?: number
          status?: string
          priority?: string
          notes?: string | null
          internal_notes?: string | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          started_at?: string | null
          completed_at?: string | null
        }
      }
      time_entries: {
        Row: {
          id: string
          service_id: string
          user_id: string | null
          description: string
          started_at: string
          ended_at: string | null
          duration_minutes: number | null
          is_running: boolean
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          user_id?: string | null
          description: string
          started_at?: string
          ended_at?: string | null
          duration_minutes?: number | null
          is_running?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          user_id?: string | null
          description?: string
          started_at?: string
          ended_at?: string | null
          duration_minutes?: number | null
          is_running?: boolean
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          tenant_id: string
          reseller_id: string
          invoice_number: string
          services: Json
          subtotal: number
          tax_rate: number
          tax_amount: number
          total: number
          status: string
          due_date: string | null
          notes: string | null
          created_at: string
          sent_at: string | null
          paid_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          reseller_id: string
          invoice_number: string
          services?: Json
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          status?: string
          due_date?: string | null
          notes?: string | null
          created_at?: string
          sent_at?: string | null
          paid_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          reseller_id?: string
          invoice_number?: string
          services?: Json
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          status?: string
          due_date?: string | null
          notes?: string | null
          created_at?: string
          sent_at?: string | null
          paid_at?: string | null
        }
      }
      service_approvals: {
        Row: {
          id: string
          service_id: string
          approved_by: string | null
          approved_at: string
          approval_method: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          approved_by?: string | null
          approved_at?: string
          approval_method?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          approved_by?: string | null
          approved_at?: string
          approval_method?: string
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_embed_code: {
        Args: {
          tenant_uuid: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
    Functions: {}
  }
} as const
