export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      billing_settings: {
        Row: {
          created_at: string
          eid_due_day_1: number
          eid_due_day_2: number
          eid_month_1: string | null
          eid_month_2: string | null
          id: string
          other_due_offset_days: number
          regular_due_day: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          eid_due_day_1?: number
          eid_due_day_2?: number
          eid_month_1?: string | null
          eid_month_2?: string | null
          id?: string
          other_due_offset_days?: number
          regular_due_day?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          eid_due_day_1?: number
          eid_due_day_2?: number
          eid_month_1?: string | null
          eid_month_2?: string | null
          id?: string
          other_due_offset_days?: number
          regular_due_day?: number
          updated_at?: string
        }
        Relationships: []
      }
      billing_settings_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          eid_due_day_1: number | null
          eid_due_day_2: number | null
          eid_month_1: string | null
          eid_month_2: string | null
          id: string
          other_due_offset_days: number | null
          prev_eid_due_day_1: number | null
          prev_eid_due_day_2: number | null
          prev_eid_month_1: string | null
          prev_eid_month_2: string | null
          prev_other_due_offset_days: number | null
          prev_regular_due_day: number | null
          regular_due_day: number | null
          settings_id: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          eid_due_day_1?: number | null
          eid_due_day_2?: number | null
          eid_month_1?: string | null
          eid_month_2?: string | null
          id?: string
          other_due_offset_days?: number | null
          prev_eid_due_day_1?: number | null
          prev_eid_due_day_2?: number | null
          prev_eid_month_1?: string | null
          prev_eid_month_2?: string | null
          prev_other_due_offset_days?: number | null
          prev_regular_due_day?: number | null
          regular_due_day?: number | null
          settings_id?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          eid_due_day_1?: number | null
          eid_due_day_2?: number | null
          eid_month_1?: string | null
          eid_month_2?: string | null
          id?: string
          other_due_offset_days?: number | null
          prev_eid_due_day_1?: number | null
          prev_eid_due_day_2?: number | null
          prev_eid_month_1?: string | null
          prev_eid_month_2?: string | null
          prev_other_due_offset_days?: number | null
          prev_regular_due_day?: number | null
          regular_due_day?: number | null
          settings_id?: string | null
        }
        Relationships: []
      }
      bills: {
        Row: {
          arrears: number
          created_at: string
          due_date: string | null
          eid_bonus: number
          flat_id: string
          gas_bill: number
          generated_at: string
          generation_error: string | null
          generation_status: Database["public"]["Enums"]["bill_generation_status"]
          id: string
          month: string
          other_charge: number
          other_due_date: string | null
          other_note: string | null
          paid_amount: number
          paid_at: string | null
          parking: number
          service_charge: number
          status: Database["public"]["Enums"]["bill_status"]
          total: number
          updated_at: string
        }
        Insert: {
          arrears?: number
          created_at?: string
          due_date?: string | null
          eid_bonus?: number
          flat_id: string
          gas_bill?: number
          generated_at?: string
          generation_error?: string | null
          generation_status?: Database["public"]["Enums"]["bill_generation_status"]
          id?: string
          month: string
          other_charge?: number
          other_due_date?: string | null
          other_note?: string | null
          paid_amount?: number
          paid_at?: string | null
          parking?: number
          service_charge?: number
          status?: Database["public"]["Enums"]["bill_status"]
          total?: number
          updated_at?: string
        }
        Update: {
          arrears?: number
          created_at?: string
          due_date?: string | null
          eid_bonus?: number
          flat_id?: string
          gas_bill?: number
          generated_at?: string
          generation_error?: string | null
          generation_status?: Database["public"]["Enums"]["bill_generation_status"]
          id?: string
          month?: string
          other_charge?: number
          other_due_date?: string | null
          other_note?: string | null
          paid_amount?: number
          paid_at?: string | null
          parking?: number
          service_charge?: number
          status?: Database["public"]["Enums"]["bill_status"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_members: {
        Row: {
          accent: string
          bio: string | null
          bio_bn: string | null
          created_at: string
          flat_id: string | null
          id: string
          is_published: boolean
          name: string
          name_bn: string
          phone: string | null
          photo_url: string | null
          role: string
          role_bn: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          accent?: string
          bio?: string | null
          bio_bn?: string | null
          created_at?: string
          flat_id?: string | null
          id?: string
          is_published?: boolean
          name: string
          name_bn: string
          phone?: string | null
          photo_url?: string | null
          role: string
          role_bn: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accent?: string
          bio?: string | null
          bio_bn?: string | null
          created_at?: string
          flat_id?: string | null
          id?: string
          is_published?: boolean
          name?: string
          name_bn?: string
          phone?: string | null
          photo_url?: string | null
          role?: string
          role_bn?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_members_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          name_bn: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          name_bn?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          name_bn?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      flats: {
        Row: {
          created_at: string
          eid_bonus: number
          flat_no: string
          floor: number
          gas_bill: number
          holding_no: string
          id: string
          is_occupied: boolean
          occupant_name: string | null
          occupant_name_bn: string | null
          occupant_phone: string | null
          occupant_photo_url: string | null
          occupant_type: string
          other_charge: number
          owner_name: string | null
          owner_name_bn: string | null
          owner_photo_url: string | null
          owner_user_id: string | null
          parking: number
          phone: string | null
          service_charge: number
          size: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          eid_bonus?: number
          flat_no: string
          floor: number
          gas_bill?: number
          holding_no: string
          id?: string
          is_occupied?: boolean
          occupant_name?: string | null
          occupant_name_bn?: string | null
          occupant_phone?: string | null
          occupant_photo_url?: string | null
          occupant_type?: string
          other_charge?: number
          owner_name?: string | null
          owner_name_bn?: string | null
          owner_photo_url?: string | null
          owner_user_id?: string | null
          parking?: number
          phone?: string | null
          service_charge?: number
          size?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          eid_bonus?: number
          flat_no?: string
          floor?: number
          gas_bill?: number
          holding_no?: string
          id?: string
          is_occupied?: boolean
          occupant_name?: string | null
          occupant_name_bn?: string | null
          occupant_phone?: string | null
          occupant_photo_url?: string | null
          occupant_type?: string
          other_charge?: number
          owner_name?: string | null
          owner_name_bn?: string | null
          owner_photo_url?: string | null
          owner_user_id?: string | null
          parking?: number
          phone?: string | null
          service_charge?: number
          size?: number
          updated_at?: string
        }
        Relationships: []
      }
      loan_repayments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          loan_id: string
          note: string | null
          paid_date: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          loan_id: string
          note?: string | null
          paid_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          loan_id?: string
          note?: string | null
          paid_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lender_flat_id: string | null
          lender_name: string
          lender_name_bn: string | null
          loan_date: string
          note: string | null
          principal: number
          purpose: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lender_flat_id?: string | null
          lender_name: string
          lender_name_bn?: string | null
          loan_date?: string
          note?: string | null
          principal?: number
          purpose?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lender_flat_id?: string | null
          lender_name?: string
          lender_name_bn?: string | null
          loan_date?: string
          note?: string | null
          principal?: number
          purpose?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_lender_flat_id_fkey"
            columns: ["lender_flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          body: string
          body_bn: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          important: boolean
          title: string
          title_bn: string
          updated_at: string
        }
        Insert: {
          body: string
          body_bn: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          important?: boolean
          title: string
          title_bn: string
          updated_at?: string
        }
        Update: {
          body?: string
          body_bn?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          important?: boolean
          title?: string
          title_bn?: string
          updated_at?: string
        }
        Relationships: []
      }
      parking_slots: {
        Row: {
          created_at: string
          flat_id: string | null
          id: string
          monthly_fee: number
          notes: string | null
          shop_id: string | null
          slot_no: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          flat_id?: string | null
          id?: string
          monthly_fee?: number
          notes?: string | null
          shop_id?: string | null
          slot_no: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          flat_id?: string | null
          id?: string
          monthly_fee?: number
          notes?: string | null
          shop_id?: string | null
          slot_no?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parking_slots_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_slots_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          amount: number
          bill_id: string
          created_at: string
          flat_id: string
          id: string
          method: string
          note: string | null
          receipt_seq: number
          reference: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          bill_id: string
          created_at?: string
          flat_id: string
          id?: string
          method?: string
          note?: string | null
          receipt_seq?: number
          reference?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string
          flat_id?: string
          id?: string
          method?: string
          note?: string | null
          receipt_seq?: number
          reference?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_flat_id_fkey"
            columns: ["flat_id"]
            isOneToOne: false
            referencedRelation: "flats"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          display_name_bn: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          display_name_bn?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          display_name_bn?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      published_monthly_reports: {
        Row: {
          created_at: string
          month: string
          notes: string | null
          published_at: string
          published_by: string | null
          snapshot: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          month: string
          notes?: string | null
          published_at?: string
          published_by?: string | null
          snapshot?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          month?: string
          notes?: string | null
          published_at?: string
          published_by?: string | null
          snapshot?: Json
          updated_at?: string
        }
        Relationships: []
      }
      shops: {
        Row: {
          created_at: string
          id: string
          is_occupied: boolean
          occupant_name: string | null
          occupant_name_bn: string | null
          occupant_phone: string | null
          occupant_photo_url: string | null
          occupant_type: string
          owner_name: string | null
          owner_name_bn: string | null
          owner_phone: string | null
          owner_photo_url: string | null
          owner_user_id: string | null
          rent: number
          service_charge: number
          shop_no: string
          side: string | null
          size: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_occupied?: boolean
          occupant_name?: string | null
          occupant_name_bn?: string | null
          occupant_phone?: string | null
          occupant_photo_url?: string | null
          occupant_type?: string
          owner_name?: string | null
          owner_name_bn?: string | null
          owner_phone?: string | null
          owner_photo_url?: string | null
          owner_user_id?: string | null
          rent?: number
          service_charge?: number
          shop_no: string
          side?: string | null
          size?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_occupied?: boolean
          occupant_name?: string | null
          occupant_name_bn?: string | null
          occupant_phone?: string | null
          occupant_photo_url?: string | null
          occupant_type?: string
          owner_name?: string | null
          owner_name_bn?: string | null
          owner_phone?: string | null
          owner_photo_url?: string | null
          owner_user_id?: string | null
          rent?: number
          service_charge?: number
          shop_no?: string
          side?: string | null
          size?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      monthly_finance_summary: { Args: { _month: string }; Returns: Json }
      publish_monthly_report: {
        Args: { _month: string; _notes?: string }
        Returns: Json
      }
      unpublish_monthly_report: { Args: { _month: string }; Returns: undefined }
      update_my_owner_photo: {
        Args: { _photo_url: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "owner"
      bill_generation_status: "generated" | "failed"
      bill_status: "paid" | "unpaid" | "partial"
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
    Enums: {
      app_role: ["admin", "owner"],
      bill_generation_status: ["generated", "failed"],
      bill_status: ["paid", "unpaid", "partial"],
    },
  },
} as const
