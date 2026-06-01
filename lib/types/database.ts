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
      agents: {
        Row: {
          created_at: string
          drafting_instructions: string
          example_tweets: string[]
          id: string
          monitored_handles: string[]
          monitoring_description: string
          name: string
          next_run_at: string | null
          scan_cadence_minutes: number | null
          scan_from: string | null
          scan_to: string | null
          status: Database["public"]["Enums"]["agent_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drafting_instructions?: string
          example_tweets?: string[]
          id?: string
          monitored_handles?: string[]
          monitoring_description?: string
          name: string
          next_run_at?: string | null
          scan_cadence_minutes?: number | null
          scan_from?: string | null
          scan_to?: string | null
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drafting_instructions?: string
          example_tweets?: string[]
          id?: string
          monitored_handles?: string[]
          monitoring_description?: string
          name?: string
          next_run_at?: string | null
          scan_cadence_minutes?: number | null
          scan_from?: string | null
          scan_to?: string | null
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      run_items: {
        Row: {
          agent_id: string
          created_at: string
          dedupe_key: string
          drafted_text: string
          error_message: string | null
          final_text: string | null
          id: string
          posted_at: string | null
          primary_tweet_url: string
          run_id: string
          source_urls: string[]
          status: Database["public"]["Enums"]["item_status"]
          story_summary: string
          story_title: string
          updated_at: string
          x_tweet_id: string | null
          x_tweet_url: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          dedupe_key: string
          drafted_text?: string
          error_message?: string | null
          final_text?: string | null
          id?: string
          posted_at?: string | null
          primary_tweet_url?: string
          run_id: string
          source_urls?: string[]
          status?: Database["public"]["Enums"]["item_status"]
          story_summary?: string
          story_title?: string
          updated_at?: string
          x_tweet_id?: string | null
          x_tweet_url?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          dedupe_key?: string
          drafted_text?: string
          error_message?: string | null
          final_text?: string | null
          id?: string
          posted_at?: string | null
          primary_tweet_url?: string
          run_id?: string
          source_urls?: string[]
          status?: Database["public"]["Enums"]["item_status"]
          story_summary?: string
          story_title?: string
          updated_at?: string
          x_tweet_id?: string | null
          x_tweet_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_items_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          agent_id: string
          completed_at: string | null
          cost_usd: number | null
          error_message: string | null
          id: string
          inputs: Json | null
          item_count: number | null
          source: Database["public"]["Enums"]["run_source"]
          started_at: string
          status: Database["public"]["Enums"]["run_status"]
          x_search_count: number | null
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          cost_usd?: number | null
          error_message?: string | null
          id?: string
          inputs?: Json | null
          item_count?: number | null
          source?: Database["public"]["Enums"]["run_source"]
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          x_search_count?: number | null
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          cost_usd?: number | null
          error_message?: string | null
          id?: string
          inputs?: Json | null
          item_count?: number | null
          source?: Database["public"]["Enums"]["run_source"]
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          x_search_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      x_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          scopes: string[]
          updated_at: string
          user_id: string
          x_user_id: string
          x_username: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          scopes?: string[]
          updated_at?: string
          user_id: string
          x_user_id: string
          x_username: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          scopes?: string[]
          updated_at?: string
          user_id?: string
          x_user_id?: string
          x_username?: string
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
      agent_status: "active" | "paused"
      item_status: "drafted" | "posted" | "failed"
      run_source: "manual" | "cron"
      run_status: "running" | "completed" | "failed"
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
      agent_status: ["active", "paused"],
      item_status: ["drafted", "posted", "failed"],
      run_source: ["manual", "cron"],
      run_status: ["running", "completed", "failed"],
    },
  },
} as const
