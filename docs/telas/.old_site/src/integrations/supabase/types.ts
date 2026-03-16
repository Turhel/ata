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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cleanup_batches: {
        Row: {
          batch_type: string
          created_at: string | null
          csv_downloaded_at: string | null
          csv_downloaded_by: string | null
          hard_deleted_at: string | null
          hard_deleted_by: string | null
          id: string
          period_end: string
          period_start: string
          record_count: number
        }
        Insert: {
          batch_type: string
          created_at?: string | null
          csv_downloaded_at?: string | null
          csv_downloaded_by?: string | null
          hard_deleted_at?: string | null
          hard_deleted_by?: string | null
          id?: string
          period_end: string
          period_start: string
          record_count?: number
        }
        Update: {
          batch_type?: string
          created_at?: string | null
          csv_downloaded_at?: string | null
          csv_downloaded_by?: string | null
          hard_deleted_at?: string | null
          hard_deleted_by?: string | null
          id?: string
          period_end?: string
          period_start?: string
          record_count?: number
        }
        Relationships: []
      }
      duplicate_order_requests: {
        Row: {
          external_id: string
          id: string
          notes: string | null
          original_assistant_id: string | null
          original_created_at: string
          original_order_id: string
          requested_at: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          external_id: string
          id?: string
          notes?: string | null
          original_assistant_id?: string | null
          original_created_at: string
          original_order_id: string
          requested_at?: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          external_id?: string
          id?: string
          notes?: string | null
          original_assistant_id?: string | null
          original_created_at?: string
          original_order_id?: string
          requested_at?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_order_requests_original_order_id_fkey"
            columns: ["original_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      manuals: {
        Row: {
          cover_url: string
          created_at: string
          created_by: string | null
          description: string | null
          file_url: string
          id: string
          title: string
        }
        Insert: {
          cover_url: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_url: string
          id?: string
          title: string
        }
        Update: {
          cover_url?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_url?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          read?: boolean
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_history: {
        Row: {
          id: string
          order_id: string
          previous_status: string | null
          new_status: string | null
          change_reason: string | null
          changed_by: string | null
          changed_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          order_id: string
          previous_status?: string | null
          new_status?: string | null
          change_reason?: string | null
          changed_by?: string | null
          changed_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          order_id?: string
          previous_status?: string | null
          new_status?: string | null
          change_reason?: string | null
          changed_by?: string | null
          changed_at?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_import_holds: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          order_id: string | null
          raw_path: string
          reason: string | null
          user_id: string
          work_type: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          order_id?: string | null
          raw_path: string
          reason?: string | null
          user_id: string
          work_type?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string | null
          raw_path?: string
          reason?: string | null
          user_id?: string
          work_type?: string | null
        }
        Relationships: []
      }
      order_documents: {
        Row: {
          id: string
          order_id: string | null
          doc_type: string
          file_url: string
          file_name: string | null
          file_size: number | null
          mime_type: string | null
          created_by: string | null
          created_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          doc_type: string
          file_url: string
          file_name?: string | null
          file_size?: number | null
          mime_type?: string | null
          created_by?: string | null
          created_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          doc_type?: string
          file_url?: string
          file_name?: string | null
          file_size?: number | null
          mime_type?: string | null
          created_by?: string | null
          created_at?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_photos: {
        Row: {
          id: string
          order_id: string
          file_url: string
          file_name: string | null
          file_type: string | null
          file_size: number | null
          uploaded_by: string | null
          uploaded_at: string
          tag: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          order_id: string
          file_url: string
          file_name?: string | null
          file_type?: string | null
          file_size?: number | null
          uploaded_by?: string | null
          uploaded_at?: string
          tag?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          file_url?: string
          file_name?: string | null
          file_type?: string | null
          file_size?: number | null
          uploaded_by?: string | null
          uploaded_at?: string
          tag?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_scope_items: {
        Row: {
          id: string
          scope_id: string
          item_label: string
          item_type: string | null
          item_value: string | null
          severity: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          scope_id: string
          item_label: string
          item_type?: string | null
          item_value?: string | null
          severity?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          scope_id?: string
          item_label?: string
          item_type?: string | null
          item_value?: string | null
          severity?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_scope_items_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "order_scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      order_scopes: {
        Row: {
          id: string
          order_id: string
          scope_label: string
          scope_type: string | null
          description: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          scope_label: string
          scope_type?: string | null
          description?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          scope_label?: string
          scope_type?: string | null
          description?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          code: string
          name: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      inspectors_directory: {
        Row: {
          id: string
          code: string
          name: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      inspector_route_notes: {
        Row: {
          assistant_id: string
          created_at: string
          id: string
          inspector_code: string | null
          inspector_id: string
          report_date: string
          skipped_points: string | null
          skipped_reason: string | null
          stop_point: string | null
        }
        Insert: {
          assistant_id: string
          created_at?: string
          id?: string
          inspector_code?: string | null
          inspector_id: string
          report_date: string
          skipped_points?: string | null
          skipped_reason?: string | null
          stop_point?: string | null
        }
        Update: {
          assistant_id?: string
          created_at?: string
          id?: string
          inspector_code?: string | null
          inspector_id?: string
          report_date?: string
          skipped_points?: string | null
          skipped_reason?: string | null
          stop_point?: string | null
        }
        Relationships: []
      }
      order_scope_summaries: {
        Row: {
          address: string | null
          content: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          loss_reason: string | null
          order_id: string
          route_point: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          loss_reason?: string | null
          order_id: string
          route_point?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          loss_reason?: string | null
          order_id?: string
          route_point?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pool_import_batches: {
        Row: {
          id: string
          source_filename: string
          source_type: string
          imported_at: string
          imported_by: string | null
          total_rows: number
          notes: string | null
        }
        Insert: {
          id?: string
          source_filename: string
          source_type?: string
          imported_at?: string
          imported_by?: string | null
          total_rows?: number
          notes?: string | null
        }
        Update: {
          id?: string
          source_filename?: string
          source_type?: string
          imported_at?: string
          imported_by?: string | null
          total_rows?: number
          notes?: string | null
        }
        Relationships: []
      }
      pool_orders: {
        Row: {
          address1: string | null
          address2: string | null
          city: string | null
          client_code: string | null
          due_date: string | null
          id: string
          inspector_code: string | null
          otype: string | null
          status: string
          worder: string
          zip: string | null
          owner_name: string | null
          batch_id: string
          window_required: boolean | null
          start_date: string | null
          rush: boolean | null
          followup: boolean | null
          vacant: boolean | null
          mortgage: boolean | null
          vandalism: boolean | null
          freeze_flag: boolean | null
          storm: boolean | null
          roof: boolean | null
          water: boolean | null
          natural_flag: boolean | null
          fire: boolean | null
          hazard: boolean | null
          structure: boolean | null
          mold: boolean | null
          pump: boolean | null
          created_at: string
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          client_code?: string | null
          due_date?: string | null
          id?: string
          inspector_code?: string | null
          otype?: string | null
          status: string
          worder: string
          zip?: string | null
          owner_name?: string | null
          batch_id: string
          window_required?: boolean | null
          start_date?: string | null
          rush?: boolean | null
          followup?: boolean | null
          vacant?: boolean | null
          mortgage?: boolean | null
          vandalism?: boolean | null
          freeze_flag?: boolean | null
          storm?: boolean | null
          roof?: boolean | null
          water?: boolean | null
          natural_flag?: boolean | null
          fire?: boolean | null
          hazard?: boolean | null
          structure?: boolean | null
          mold?: boolean | null
          pump?: boolean | null
          created_at?: string
        }
        Update: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          client_code?: string | null
          due_date?: string | null
          id?: string
          inspector_code?: string | null
          otype?: string | null
          status?: string
          worder?: string
          zip?: string | null
          owner_name?: string | null
          batch_id?: string
          window_required?: boolean | null
          start_date?: string | null
          rush?: boolean | null
          followup?: boolean | null
          vacant?: boolean | null
          mortgage?: boolean | null
          vandalism?: boolean | null
          freeze_flag?: boolean | null
          storm?: boolean | null
          roof?: boolean | null
          water?: boolean | null
          natural_flag?: boolean | null
          fire?: boolean | null
          hazard?: boolean | null
          structure?: boolean | null
          mold?: boolean | null
          pump?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
      pool_order_flags: {
        Row: {
          id: string
          pool_order_id: string
          flag_code: string
          flag_value: boolean
          created_at: string
        }
        Insert: {
          id?: string
          pool_order_id: string
          flag_code: string
          flag_value?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          pool_order_id?: string
          flag_code?: string
          flag_value?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_order_flags_pool_order_id_fkey"
            columns: ["pool_order_id"]
            isOneToOne: false
            referencedRelation: "pool_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_pricing: {
        Row: {
          active: boolean | null
          assistant_value: number
          category: Database["public"]["Enums"]["work_category"]
          created_at: string | null
          created_by: string | null
          id: string
          inspector_value: number
          otype: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          assistant_value?: number
          category: Database["public"]["Enums"]["work_category"]
          created_at?: string | null
          created_by?: string | null
          id?: string
          inspector_value?: number
          otype: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          assistant_value?: number
          category?: Database["public"]["Enums"]["work_category"]
          created_at?: string | null
          created_by?: string | null
          id?: string
          inspector_value?: number
          otype?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          external_id: string
          work_type: string | null
          category: string | null
          client_code: string | null
          status: string
          assistant_id: string | null
          inspector_id: string | null
          inspector_code: string | null
          due_date: string | null
          execution_date: string | null
          created_at: string
          updated_at: string
          owner_name: string | null
          address1: string | null
          address2: string | null
          city: string | null
          state: string | null
          zip: string | null
          audit_flag: boolean
          audit_reason: string | null
          not_done_reason: string | null
          pool_status: string | null
          pool_match: boolean | null
          pool_match_reason: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          external_id: string
          work_type?: string | null
          category?: string | null
          client_code?: string | null
          status?: string
          assistant_id?: string | null
          inspector_id?: string | null
          inspector_code?: string | null
          due_date?: string | null
          execution_date?: string | null
          created_at?: string
          updated_at?: string
          owner_name?: string | null
          address1?: string | null
          address2?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          audit_flag?: boolean
          audit_reason?: string | null
          not_done_reason?: string | null
          pool_status?: string | null
          pool_match?: boolean | null
          pool_match_reason?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          external_id?: string
          work_type?: string | null
          category?: string | null
          client_code?: string | null
          status?: string
          assistant_id?: string | null
          inspector_id?: string | null
          inspector_code?: string | null
          due_date?: string | null
          execution_date?: string | null
          created_at?: string
          updated_at?: string
          owner_name?: string | null
          address1?: string | null
          address2?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          audit_flag?: boolean
          audit_reason?: string | null
          not_done_reason?: string | null
          pool_status?: string | null
          pool_match?: boolean | null
          pool_match_reason?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_batch_items: {
        Row: {
          amount: number
          assistant_id: string
          batch_id: string
          category: string | null
          created_at: string
          external_id: string | null
          id: string
          order_id: string
          work_type: string | null
        }
        Insert: {
          amount?: number
          assistant_id: string
          batch_id: string
          category?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          order_id: string
          work_type?: string | null
        }
        Update: {
          amount?: number
          assistant_id?: string
          batch_id?: string
          category?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          order_id?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payment_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batch_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_batches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          period_end: string
          period_start: string
          status: string
          total_value: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          period_end: string
          period_start: string
          status: string
          total_value?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          period_end?: string
          period_start?: string
          status?: string
          total_value?: number
        }
        Relationships: []
      }
      payment_records: {
        Row: {
          category_breakdown: Json | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_count: number
          paid_at: string | null
          paid_by: string | null
          period_end: string
          period_start: string
          recipient_id: string
          recipient_name: string
          recipient_type: string
          status: string
          total_value: number
          updated_at: string
        }
        Insert: {
          category_breakdown?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_count?: number
          paid_at?: string | null
          paid_by?: string | null
          period_end: string
          period_start: string
          recipient_id: string
          recipient_name: string
          recipient_type: string
          status?: string
          total_value?: number
          updated_at?: string
        }
        Update: {
          category_breakdown?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_count?: number
          paid_at?: string | null
          paid_by?: string | null
          period_end?: string
          period_start?: string
          recipient_id?: string
          recipient_name?: string
          recipient_type?: string
          status?: string
          total_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          assistant_id: string
          category_breakdown: Json | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          period_type: string
          requested_at: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          total_orders: number
          total_value: number
          updated_at: string
        }
        Insert: {
          assistant_id: string
          category_breakdown?: Json | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          period_type?: string
          requested_at?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total_orders?: number
          total_value?: number
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          category_breakdown?: Json | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          requested_at?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          total_orders?: number
          total_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          weekly_goal: number | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          weekly_goal?: number | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          weekly_goal?: number | null
        }
        Relationships: []
      }
      team_assignments: {
        Row: {
          admin_id: string
          assigned_at: string | null
          assigned_by: string | null
          assistant_id: string
          id: string
        }
        Insert: {
          admin_id: string
          assigned_at?: string | null
          assigned_by?: string | null
          assistant_id: string
          id?: string
        }
        Update: {
          admin_id?: string
          assigned_at?: string | null
          assigned_by?: string | null
          assistant_id?: string
          id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          due_date_alerts: boolean
          email_notifications: boolean
          order_updates: boolean
          system_alerts: boolean
          updated_at: string
          user_id: string
          weekly_report: boolean
        }
        Insert: {
          created_at?: string
          due_date_alerts?: boolean
          email_notifications?: boolean
          order_updates?: boolean
          system_alerts?: boolean
          updated_at?: string
          user_id: string
          weekly_report?: boolean
        }
        Update: {
          created_at?: string
          due_date_alerts?: boolean
          email_notifications?: boolean
          order_updates?: boolean
          system_alerts?: boolean
          updated_at?: string
          user_id?: string
          weekly_report?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      work_type_requests: {
        Row: {
          admin_id: string | null
          admin_notes: string | null
          admin_reviewed_at: string | null
          code: string
          created_work_type_id: string | null
          id: string
          master_id: string | null
          master_notes: string | null
          master_reviewed_at: string | null
          requested_at: string | null
          requested_by: string
          status: string
          suggested_category:
            | Database["public"]["Enums"]["work_category"]
            | null
        }
        Insert: {
          admin_id?: string | null
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          code: string
          created_work_type_id?: string | null
          id?: string
          master_id?: string | null
          master_notes?: string | null
          master_reviewed_at?: string | null
          requested_at?: string | null
          requested_by: string
          status?: string
          suggested_category?:
            | Database["public"]["Enums"]["work_category"]
            | null
        }
        Update: {
          admin_id?: string | null
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          code?: string
          created_work_type_id?: string | null
          id?: string
          master_id?: string | null
          master_notes?: string | null
          master_reviewed_at?: string | null
          requested_at?: string | null
          requested_by?: string
          status?: string
          suggested_category?:
            | Database["public"]["Enums"]["work_category"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "work_type_requests_created_work_type_id_fkey"
            columns: ["created_work_type_id"]
            isOneToOne: false
            referencedRelation: "work_types"
            referencedColumns: ["id"]
          },
        ]
      }
      work_types: {
        Row: {
          active: boolean | null
          category: Database["public"]["Enums"]["work_category"]
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category: Database["public"]["Enums"]["work_category"]
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: Database["public"]["Enums"]["work_category"]
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
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
      is_master: { Args: { check_user_id: string }; Returns: boolean }
      supervises_assistant: {
        Args: { admin_user_id: string; assistant_user_id: string }
        Returns: boolean
      }
      generate_invitation_code: {
        Args: { p_expires_at?: string | null; p_role: Database["public"]["Enums"]["app_role"] }
        Returns: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
          used_by: string | null
        }
      }
      use_invitation_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
      validate_invitation_code: {
        Args: { p_code: string }
        Returns: {
          assigned_role: Database["public"]["Enums"]["app_role"]
          error_message: string
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "inspector" | "user" | "master"
      order_status:
        | "pendente"
        | "agendada"
        | "enviada"
        | "em_analise"
        | "aprovada"
        | "rejeitada"
        | "cancelada"
        | "nao_realizada"
        | "paga"
      work_category: "regular" | "exterior" | "interior" | "fint"
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
      app_role: ["admin", "manager", "inspector", "user", "master"],
      order_status: [
        "pendente",
        "agendada",
        "enviada",
        "em_analise",
        "aprovada",
        "rejeitada",
        "cancelada",
        "nao_realizada",
        "paga",
      ],
      work_category: ["regular", "exterior", "interior", "fint"],
    },
  },
} as const
