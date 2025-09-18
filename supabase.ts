// This file provides TypeScript types for your Supabase database schema.
// Updated to reflect the new database structure without soil-related functionality.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enums for sensor types and preset categories
export type SensorType = 
  | 'air_temperature'
  | 'air_humidity' 
  | 'air_quality_mq135'
  | 'alcohol_mq3'
  | 'smoke_mq2';

export type PresetCategory = 'greenhouse' | 'outdoor' | 'indoor' | 'custom';

export type ChangeType = 'manual' | 'preset_change' | 'auto_calibration' | 'system_update';

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          user_id: string;
          name: string | null;
          email: string | null;
          role: string | null;
          preferred_language: string | null;
          theme: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          name?: string | null;
          email?: string | null;
          role?: string | null;
          preferred_language?: string | null;
          theme?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          name?: string | null;
          email?: string | null;
          role?: string | null;
          preferred_language?: string | null;
          theme?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      node_metadata: {
        Row: {
          node_id: string;
          node_name: string;
          location: string | null;
          last_active_timestamp: string | null;
        };
        Insert: {
          node_id: string;
          node_name: string;
          location?: string | null;
          last_active_timestamp?: string | null;
        };
        Update: {
          node_id?: string;
          node_name?: string;
          location?: string | null;
          last_active_timestamp?: string | null;
        };
        Relationships: [];
      };
      sensor_readings: {
        Row: {
          id: string;
          node_id: string;
          temperature: number | null;
          humidity: number | null;
          air_quality_mq135: number | null;
          alcohol_mq3: number | null;
          smoke_mq2: number | null;
          timestamp: string | null;
        };
        Insert: {
          id?: string;
          node_id: string;
          temperature?: number | null;
          humidity?: number | null;
          air_quality_mq135?: number | null;
          alcohol_mq3?: number | null;
          smoke_mq2?: number | null;
          timestamp?: string | null;
        };
        Update: {
          id?: string;
          node_id?: string;
          temperature?: number | null;
          humidity?: number | null;
          air_quality_mq135?: number | null;
          alcohol_mq3?: number | null;
          smoke_mq2?: number | null;
          timestamp?: string | null;
        };
        Relationships: [];
      };
      ai_suggestions: {
        Row: {
          id: string;
          user_id: string | null;
          suggestion_text: string;
          category: string | null;
          image_url: string | null;
          timestamp: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          suggestion_text: string;
          category?: string | null;
          image_url?: string | null;
          timestamp?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          suggestion_text?: string;
          category?: string | null;
          image_url?: string | null;
          timestamp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["user_id"];
          }
        ];
      };
      farm_tasks: {
        Row: {
          id: string;
          user_id: string | null;
          task_description: string;
          due_date: string | null;
          is_completed: boolean | null;
          priority: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          task_description: string;
          due_date?: string | null;
          is_completed?: boolean | null;
          priority?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          task_description?: string;
          due_date?: string | null;
          is_completed?: boolean | null;
          priority?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "farm_tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["user_id"];
          }
        ];
      };
      alerts: {
        Row: {
          id: string;
          user_id: string | null;
          message: string;
          severity: string | null;
          is_read: boolean | null;
          timestamp: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          message: string;
          severity?: string | null;
          is_read?: boolean | null;
          timestamp?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          message?: string;
          severity?: string | null;
          is_read?: boolean | null;
          timestamp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["user_id"];
          }
        ];
      };
      data_collection_settings: {
        Row: {
          id: number;
          collection_enabled: boolean | null;
          collection_mode: string | null;
          updated_at: string | null;
          updated_by: string | null;
          notes: string | null;
        };
        Insert: {
          id?: number;
          collection_enabled?: boolean | null;
          collection_mode?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: number;
          collection_enabled?: boolean | null;
          collection_mode?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "data_collection_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      threshold_presets: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: PresetCategory;
          is_active: boolean | null;
          is_system_default: boolean | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category?: PresetCategory;
          is_active?: boolean | null;
          is_system_default?: boolean | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: PresetCategory;
          is_active?: boolean | null;
          is_system_default?: boolean | null;
          created_by?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "threshold_presets_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      threshold_values: {
        Row: {
          id: string;
          preset_id: string | null;
          sensor_type: SensorType;
          low_value: number;
          high_value: number;
          unit: string;
          label: string;
          icon: string | null;
          min_value: number | null;
          max_value: number | null;
          step_value: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          preset_id?: string | null;
          sensor_type: SensorType;
          low_value: number;
          high_value: number;
          unit: string;
          label: string;
          icon?: string | null;
          min_value?: number | null;
          max_value?: number | null;
          step_value?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          preset_id?: string | null;
          sensor_type?: SensorType;
          low_value?: number;
          high_value?: number;
          unit?: string;
          label?: string;
          icon?: string | null;
          min_value?: number | null;
          max_value?: number | null;
          step_value?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "threshold_values_preset_id_fkey";
            columns: ["preset_id"];
            isOneToOne: false;
            referencedRelation: "threshold_presets";
            referencedColumns: ["id"];
          }
        ];
      };
      threshold_change_log: {
        Row: {
          id: string;
          preset_id: string | null;
          sensor_type: SensorType;
          change_type: ChangeType | null;
          previous_low: number | null;
          previous_high: number | null;
          new_low: number | null;
          new_high: number | null;
          changed_by: string | null;
          change_reason: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          preset_id?: string | null;
          sensor_type: SensorType;
          change_type?: ChangeType | null;
          previous_low?: number | null;
          previous_high?: number | null;
          new_low?: number | null;
          new_high?: number | null;
          changed_by?: string | null;
          change_reason?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          preset_id?: string | null;
          sensor_type?: SensorType;
          change_type?: ChangeType | null;
          previous_low?: number | null;
          previous_high?: number | null;
          new_low?: number | null;
          new_high?: number | null;
          changed_by?: string | null;
          change_reason?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "threshold_change_log_preset_id_fkey";
            columns: ["preset_id"];
            isOneToOne: false;
            referencedRelation: "threshold_presets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "threshold_change_log_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
