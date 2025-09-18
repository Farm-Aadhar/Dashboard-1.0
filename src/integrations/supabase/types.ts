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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_suggestions: {
        Row: {
          category: string | null
          id: string
          image_url: string | null
          suggestion_text: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          id?: string
          image_url?: string | null
          suggestion_text: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          id?: string
          image_url?: string | null
          suggestion_text?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      alerts: {
        Row: {
          id: string
          is_read: boolean | null
          message: string
          severity: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          is_read?: boolean | null
          message: string
          severity?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          is_read?: boolean | null
          message?: string
          severity?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      farm_tasks: {
        Row: {
          created_at: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          priority: string | null
          task_description: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          task_description: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          task_description?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farm_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      node_metadata: {
        Row: {
          last_active_timestamp: string | null
          location: string | null
          node_id: string
          node_name: string
        }
        Insert: {
          last_active_timestamp?: string | null
          location?: string | null
          node_id: string
          node_name: string
        }
        Update: {
          last_active_timestamp?: string | null
          location?: string | null
          node_id?: string
          node_name?: string
        }
        Relationships: []
      }
      sensor_readings: {
        Row: {
          air_quality_mq135: number | null
          alcohol_mq3: number | null
          humidity: number | null
          id: string
          node_id: string
          smoke_mq2: number | null
          temperature: number | null
          timestamp: string | null
        }
        Insert: {
          air_quality_mq135?: number | null
          alcohol_mq3?: number | null
          humidity?: number | null
          id?: string
          node_id: string
          smoke_mq2?: number | null
          temperature?: number | null
          timestamp?: string | null
        }
        Update: {
          air_quality_mq135?: number | null
          alcohol_mq3?: number | null
          humidity?: number | null
          id?: string
          node_id?: string
          smoke_mq2?: number | null
          temperature?: number | null
          timestamp?: string | null
        }
        Relationships: []
      }
      data_collection_settings: {
        Row: {
          id: number
          collection_enabled: boolean | null
          collection_mode: string | null
          updated_at: string | null
          updated_by: string | null
          notes: string | null
        }
        Insert: {
          id?: number
          collection_enabled?: boolean | null
          collection_mode?: string | null
          updated_at?: string | null
          updated_by?: string | null
          notes?: string | null
        }
        Update: {
          id?: number
          collection_enabled?: boolean | null
          collection_mode?: string | null
          updated_at?: string | null
          updated_by?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      threshold_presets: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          is_active: boolean | null
          is_system_default: boolean | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category?: string
          is_active?: boolean | null
          is_system_default?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          is_active?: boolean | null
          is_system_default?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      threshold_values: {
        Row: {
          id: string
          preset_id: string | null
          sensor_type: string
          low_value: number
          high_value: number
          unit: string
          label: string
          icon: string | null
          min_value: number | null
          max_value: number | null
          step_value: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          preset_id?: string | null
          sensor_type: string
          low_value: number
          high_value: number
          unit: string
          label: string
          icon?: string | null
          min_value?: number | null
          max_value?: number | null
          step_value?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          preset_id?: string | null
          sensor_type?: string
          low_value?: number
          high_value?: number
          unit?: string
          label?: string
          icon?: string | null
          min_value?: number | null
          max_value?: number | null
          step_value?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      threshold_change_log: {
        Row: {
          id: string
          preset_id: string | null
          sensor_type: string
          change_type: string | null
          previous_low: number | null
          previous_high: number | null
          new_low: number | null
          new_high: number | null
          changed_by: string | null
          change_reason: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          preset_id?: string | null
          sensor_type: string
          change_type?: string | null
          previous_low?: number | null
          previous_high?: number | null
          new_low?: number | null
          new_high?: number | null
          changed_by?: string | null
          change_reason?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          preset_id?: string | null
          sensor_type?: string
          change_type?: string | null
          previous_low?: number | null
          previous_high?: number | null
          new_low?: number | null
          new_high?: number | null
          changed_by?: string | null
          change_reason?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          name: string | null
          preferred_language: string | null
          role: string | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          name?: string | null
          preferred_language?: string | null
          role?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          name?: string | null
          preferred_language?: string | null
          role?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  },
} as const
