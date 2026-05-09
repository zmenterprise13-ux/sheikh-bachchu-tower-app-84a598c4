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
      change_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_fields: string[]
          flat_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string
          table_name: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          flat_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id: string
          table_name: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_fields?: string[]
          flat_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      committee_members: {
        Row: {
          accent: string
          bio: string | null
          bio_bn: string | null
          category: string
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
          category?: string
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
          category?: string
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
      dues_notifications: {
        Row: {
          bill_id: string | null
          body: string
          created_at: string
          created_by: string | null
          due_amount: number
          flat_id: string
          id: string
          month: string | null
          read_at: string | null
          title: string
        }
        Insert: {
          bill_id?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          due_amount?: number
          flat_id: string
          id?: string
          month?: string | null
          read_at?: string | null
          title: string
        }
        Update: {
          bill_id?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          due_amount?: number
          flat_id?: string
          id?: string
          month?: string | null
          read_at?: string | null
          title?: string
        }
        Relationships: []
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
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          reject_reason: string | null
          service_month: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          reject_reason?: string | null
          service_month?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          reject_reason?: string | null
          service_month?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_reply: string | null
          category: string
          created_at: string
          id: string
          message: string
          replied_at: string | null
          replied_by: string | null
          status: string
          subject: string
          submitter_name: string | null
          submitter_phone: string | null
          submitter_role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject: string
          submitter_name?: string | null
          submitter_phone?: string | null
          submitter_role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string
          submitter_name?: string | null
          submitter_phone?: string | null
          submitter_role?: string | null
          updated_at?: string
          user_id?: string
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
          tenant_user_id: string | null
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
          tenant_user_id?: string | null
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
          tenant_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      loan_repayments: {
        Row: {
          amount: number
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          loan_id: string
          note: string | null
          paid_date: string
          reject_reason: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          loan_id: string
          note?: string | null
          paid_date?: string
          reject_reason?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          loan_id?: string
          note?: string | null
          paid_date?: string
          reject_reason?: string | null
          submitted_by?: string | null
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
          approval_status: string
          approved_at: string | null
          approved_by: string | null
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
          reject_reason: string | null
          status: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
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
          reject_reason?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
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
          reject_reason?: string | null
          status?: string
          submitted_by?: string | null
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
      opening_cash_overrides: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          month: string
          note: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          month: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          month?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      other_incomes: {
        Row: {
          amount: number
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          reference: string | null
          reject_reason: string | null
          source_name: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          reference?: string | null
          reject_reason?: string | null
          source_name?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          reference?: string | null
          reject_reason?: string | null
          source_name?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      owner_family_members: {
        Row: {
          age: number | null
          children_count: number | null
          children_details: string | null
          created_at: string
          education: string | null
          gender: string | null
          id: string
          institution: string | null
          is_married: boolean | null
          name: string
          notes: string | null
          occupation: string | null
          owner_info_id: string
          phone: string | null
          relation: string
          sort_order: number
          spouse_name: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          children_count?: number | null
          children_details?: string | null
          created_at?: string
          education?: string | null
          gender?: string | null
          id?: string
          institution?: string | null
          is_married?: boolean | null
          name: string
          notes?: string | null
          occupation?: string | null
          owner_info_id: string
          phone?: string | null
          relation?: string
          sort_order?: number
          spouse_name?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          children_count?: number | null
          children_details?: string | null
          created_at?: string
          education?: string | null
          gender?: string | null
          id?: string
          institution?: string | null
          is_married?: boolean | null
          name?: string
          notes?: string | null
          occupation?: string | null
          owner_info_id?: string
          phone?: string | null
          relation?: string
          sort_order?: number
          spouse_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      owner_info: {
        Row: {
          area: string | null
          beat_no: string | null
          birth_date: string | null
          created_at: string
          created_by: string | null
          current_landlord_name: string | null
          driver_name: string | null
          driver_nid: string | null
          education: string | null
          email: string | null
          emergency_address: string | null
          emergency_name: string | null
          emergency_phone: string | null
          emergency_relation: string | null
          father_name: string | null
          flat_id: string
          helper_address: string | null
          helper_name: string | null
          helper_nid: string | null
          helper_phone: string | null
          holding_no: string | null
          id: string
          leave_reason: string | null
          marital_status: string | null
          mother_name: string | null
          move_in_date: string | null
          nid_number: string | null
          notes: string | null
          occupation: string | null
          passport_number: string | null
          permanent_address: string | null
          phone: string | null
          photo_url: string | null
          post_code: string | null
          present_address: string | null
          previous_landlord_name: string | null
          previous_landlord_phone: string | null
          religion: string | null
          road: string | null
          spouse_name: string | null
          tenant_name: string
          tenant_name_bn: string | null
          total_members: number | null
          updated_at: string
          updated_by: string | null
          ward_no: string | null
          workplace: string | null
        }
        Insert: {
          area?: string | null
          beat_no?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          current_landlord_name?: string | null
          driver_name?: string | null
          driver_nid?: string | null
          education?: string | null
          email?: string | null
          emergency_address?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relation?: string | null
          father_name?: string | null
          flat_id: string
          helper_address?: string | null
          helper_name?: string | null
          helper_nid?: string | null
          helper_phone?: string | null
          holding_no?: string | null
          id?: string
          leave_reason?: string | null
          marital_status?: string | null
          mother_name?: string | null
          move_in_date?: string | null
          nid_number?: string | null
          notes?: string | null
          occupation?: string | null
          passport_number?: string | null
          permanent_address?: string | null
          phone?: string | null
          photo_url?: string | null
          post_code?: string | null
          present_address?: string | null
          previous_landlord_name?: string | null
          previous_landlord_phone?: string | null
          religion?: string | null
          road?: string | null
          spouse_name?: string | null
          tenant_name: string
          tenant_name_bn?: string | null
          total_members?: number | null
          updated_at?: string
          updated_by?: string | null
          ward_no?: string | null
          workplace?: string | null
        }
        Update: {
          area?: string | null
          beat_no?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          current_landlord_name?: string | null
          driver_name?: string | null
          driver_nid?: string | null
          education?: string | null
          email?: string | null
          emergency_address?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relation?: string | null
          father_name?: string | null
          flat_id?: string
          helper_address?: string | null
          helper_name?: string | null
          helper_nid?: string | null
          helper_phone?: string | null
          holding_no?: string | null
          id?: string
          leave_reason?: string | null
          marital_status?: string | null
          mother_name?: string | null
          move_in_date?: string | null
          nid_number?: string | null
          notes?: string | null
          occupation?: string | null
          passport_number?: string | null
          permanent_address?: string | null
          phone?: string | null
          photo_url?: string | null
          post_code?: string | null
          present_address?: string | null
          previous_landlord_name?: string | null
          previous_landlord_phone?: string | null
          religion?: string | null
          road?: string | null
          spouse_name?: string | null
          tenant_name?: string
          tenant_name_bn?: string | null
          total_members?: number | null
          updated_at?: string
          updated_by?: string | null
          ward_no?: string | null
          workplace?: string | null
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
      tenancy_periods: {
        Row: {
          archived_at: string
          archived_by: string | null
          created_at: string
          family_count: number
          flat_id: string
          id: string
          leave_reason: string | null
          move_in_date: string | null
          move_out_date: string | null
          move_out_month: string | null
          nid_number: string | null
          notes: string | null
          occupation: string | null
          phone: string | null
          photo_url: string | null
          snapshot: Json
          tenant_name: string
          tenant_name_bn: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string
          archived_by?: string | null
          created_at?: string
          family_count?: number
          flat_id: string
          id?: string
          leave_reason?: string | null
          move_in_date?: string | null
          move_out_date?: string | null
          move_out_month?: string | null
          nid_number?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          snapshot?: Json
          tenant_name: string
          tenant_name_bn?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string
          archived_by?: string | null
          created_at?: string
          family_count?: number
          flat_id?: string
          id?: string
          leave_reason?: string | null
          move_in_date?: string | null
          move_out_date?: string | null
          move_out_month?: string | null
          nid_number?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          snapshot?: Json
          tenant_name?: string
          tenant_name_bn?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tenant_family_members: {
        Row: {
          age: number | null
          children_count: number | null
          children_details: string | null
          created_at: string
          education: string | null
          gender: string | null
          id: string
          institution: string | null
          is_married: boolean | null
          name: string
          notes: string | null
          occupation: string | null
          phone: string | null
          relation: string
          sort_order: number
          spouse_name: string | null
          tenant_info_id: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          children_count?: number | null
          children_details?: string | null
          created_at?: string
          education?: string | null
          gender?: string | null
          id?: string
          institution?: string | null
          is_married?: boolean | null
          name: string
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          relation: string
          sort_order?: number
          spouse_name?: string | null
          tenant_info_id: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          children_count?: number | null
          children_details?: string | null
          created_at?: string
          education?: string | null
          gender?: string | null
          id?: string
          institution?: string | null
          is_married?: boolean | null
          name?: string
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          relation?: string
          sort_order?: number
          spouse_name?: string | null
          tenant_info_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_family_members_tenant_info_id_fkey"
            columns: ["tenant_info_id"]
            isOneToOne: false
            referencedRelation: "tenant_info"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_info: {
        Row: {
          area: string | null
          beat_no: string | null
          birth_date: string | null
          created_at: string
          created_by: string | null
          current_landlord_name: string | null
          driver_name: string | null
          driver_nid: string | null
          education: string | null
          email: string | null
          emergency_address: string | null
          emergency_name: string | null
          emergency_phone: string | null
          emergency_relation: string | null
          father_name: string | null
          flat_id: string
          helper_address: string | null
          helper_name: string | null
          helper_nid: string | null
          helper_phone: string | null
          holding_no: string | null
          id: string
          leave_reason: string | null
          marital_status: string | null
          mother_name: string | null
          move_in_date: string | null
          nid_number: string | null
          notes: string | null
          occupation: string | null
          passport_number: string | null
          permanent_address: string | null
          phone: string | null
          photo_url: string | null
          post_code: string | null
          present_address: string | null
          previous_landlord_name: string | null
          previous_landlord_phone: string | null
          religion: string | null
          road: string | null
          spouse_name: string | null
          tenant_name: string
          tenant_name_bn: string | null
          total_members: number | null
          updated_at: string
          updated_by: string | null
          ward_no: string | null
          workplace: string | null
        }
        Insert: {
          area?: string | null
          beat_no?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          current_landlord_name?: string | null
          driver_name?: string | null
          driver_nid?: string | null
          education?: string | null
          email?: string | null
          emergency_address?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relation?: string | null
          father_name?: string | null
          flat_id: string
          helper_address?: string | null
          helper_name?: string | null
          helper_nid?: string | null
          helper_phone?: string | null
          holding_no?: string | null
          id?: string
          leave_reason?: string | null
          marital_status?: string | null
          mother_name?: string | null
          move_in_date?: string | null
          nid_number?: string | null
          notes?: string | null
          occupation?: string | null
          passport_number?: string | null
          permanent_address?: string | null
          phone?: string | null
          photo_url?: string | null
          post_code?: string | null
          present_address?: string | null
          previous_landlord_name?: string | null
          previous_landlord_phone?: string | null
          religion?: string | null
          road?: string | null
          spouse_name?: string | null
          tenant_name: string
          tenant_name_bn?: string | null
          total_members?: number | null
          updated_at?: string
          updated_by?: string | null
          ward_no?: string | null
          workplace?: string | null
        }
        Update: {
          area?: string | null
          beat_no?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          current_landlord_name?: string | null
          driver_name?: string | null
          driver_nid?: string | null
          education?: string | null
          email?: string | null
          emergency_address?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relation?: string | null
          father_name?: string | null
          flat_id?: string
          helper_address?: string | null
          helper_name?: string | null
          helper_nid?: string | null
          helper_phone?: string | null
          holding_no?: string | null
          id?: string
          leave_reason?: string | null
          marital_status?: string | null
          mother_name?: string | null
          move_in_date?: string | null
          nid_number?: string | null
          notes?: string | null
          occupation?: string | null
          passport_number?: string | null
          permanent_address?: string | null
          phone?: string | null
          photo_url?: string | null
          post_code?: string | null
          present_address?: string | null
          previous_landlord_name?: string | null
          previous_landlord_phone?: string | null
          religion?: string | null
          road?: string | null
          spouse_name?: string | null
          tenant_name?: string
          tenant_name_bn?: string | null
          total_members?: number | null
          updated_at?: string
          updated_by?: string | null
          ward_no?: string | null
          workplace?: string | null
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
      get_published_committee: {
        Args: never
        Returns: {
          accent: string
          bio: string
          bio_bn: string
          category: string
          created_at: string
          flat_id: string
          id: string
          name: string
          name_bn: string
          phone: string
          photo_url: string
          role: string
          role_bn: string
          sort_order: number
        }[]
      }
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
      app_role: "admin" | "owner" | "accountant" | "manager" | "tenant"
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
      app_role: ["admin", "owner", "accountant", "manager", "tenant"],
      bill_generation_status: ["generated", "failed"],
      bill_status: ["paid", "unpaid", "partial"],
    },
  },
} as const
