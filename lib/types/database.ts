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
      drafts: {
        Row: {
          created_at: string
          id: string
          status: string
          story_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          story_id: string
          text?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          story_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      monitors: {
        Row: {
          created_at: string
          drafting_instructions: string
          example_tweets: string[]
          id: string
          monitored_handles: string[]
          monitoring_description: string
          name: string
          scan_from: string | null
          scan_to: string | null
          status: string
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
          scan_from?: string | null
          scan_to?: string | null
          status?: string
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
          scan_from?: string | null
          scan_to?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          draft_id: string
          error_message: string | null
          id: string
          posted_at: string
          status: string
          x_tweet_id: string
          x_tweet_url: string
        }
        Insert: {
          draft_id: string
          error_message?: string | null
          id?: string
          posted_at?: string
          status?: string
          x_tweet_id: string
          x_tweet_url: string
        }
        Update: {
          draft_id?: string
          error_message?: string | null
          id?: string
          posted_at?: string
          status?: string
          x_tweet_id?: string
          x_tweet_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_items: {
        Row: {
          aggregated_context: string
          dedupe_key: string
          evidence_points: string[]
          first_scan_run_id: string | null
          first_seen_at: string
          id: string
          last_scan_run_id: string | null
          last_seen_at: string
          primary_tweet_url: string
          published_at: string | null
          raw_headline: Json
          source_handles: string[]
          source_urls: string[]
          supporting_tweet_urls: string[]
          title: string
          trigger_id: string
          workflow_id: string
        }
        Insert: {
          aggregated_context: string
          dedupe_key: string
          evidence_points?: string[]
          first_scan_run_id?: string | null
          first_seen_at?: string
          id?: string
          last_scan_run_id?: string | null
          last_seen_at?: string
          primary_tweet_url?: string
          published_at?: string | null
          raw_headline?: Json
          source_handles?: string[]
          source_urls?: string[]
          supporting_tweet_urls?: string[]
          title: string
          trigger_id: string
          workflow_id: string
        }
        Update: {
          aggregated_context?: string
          dedupe_key?: string
          evidence_points?: string[]
          first_scan_run_id?: string | null
          first_seen_at?: string
          id?: string
          last_scan_run_id?: string | null
          last_seen_at?: string
          primary_tweet_url?: string
          published_at?: string | null
          raw_headline?: Json
          source_handles?: string[]
          source_urls?: string[]
          supporting_tweet_urls?: string[]
          title?: string
          trigger_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_items_first_scan_run_id_fkey"
            columns: ["first_scan_run_id"]
            isOneToOne: false
            referencedRelation: "scan_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_items_last_scan_run_id_fkey"
            columns: ["last_scan_run_id"]
            isOneToOne: false
            referencedRelation: "scan_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_items_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "triggers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_items_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_runs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          item_count: number | null
          new_item_count: number
          raw_output: string | null
          source: string
          started_at: string
          status: string
          trigger_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          item_count?: number | null
          new_item_count?: number
          raw_output?: string | null
          source?: string
          started_at?: string
          status?: string
          trigger_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          item_count?: number | null
          new_item_count?: number
          raw_output?: string | null
          source?: string
          started_at?: string
          status?: string
          trigger_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_runs_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          completed_at: string | null
          cost_usd: number | null
          error_message: string | null
          id: string
          monitor_id: string
          raw_output: Json | null
          started_at: string
          status: string
          story_count: number | null
          x_search_count: number | null
        }
        Insert: {
          completed_at?: string | null
          cost_usd?: number | null
          error_message?: string | null
          id?: string
          monitor_id: string
          raw_output?: Json | null
          started_at?: string
          status?: string
          story_count?: number | null
          x_search_count?: number | null
        }
        Update: {
          completed_at?: string | null
          cost_usd?: number | null
          error_message?: string | null
          id?: string
          monitor_id?: string
          raw_output?: Json | null
          started_at?: string
          status?: string
          story_count?: number | null
          x_search_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "monitors"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          created_at: string
          dedupe_key: string
          id: string
          monitor_id: string
          primary_tweet_url: string
          scan_id: string
          source_urls: string[]
          summary: string
          title: string
        }
        Insert: {
          created_at?: string
          dedupe_key: string
          id?: string
          monitor_id: string
          primary_tweet_url?: string
          scan_id: string
          source_urls?: string[]
          summary?: string
          title: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string
          id?: string
          monitor_id?: string
          primary_tweet_url?: string
          scan_id?: string
          source_urls?: string[]
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "monitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      triggers: {
        Row: {
          config: Json
          created_at: string
          frequency_amount: number
          frequency_unit: Database["public"]["Enums"]["trigger_frequency_unit"]
          id: string
          last_run_at: string | null
          next_run_at: string | null
          status: string
          type: string
          workflow_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          frequency_amount: number
          frequency_unit: Database["public"]["Enums"]["trigger_frequency_unit"]
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          status?: string
          type?: string
          workflow_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          frequency_amount?: number
          frequency_unit?: Database["public"]["Enums"]["trigger_frequency_unit"]
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          status?: string
          type?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "triggers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string
          drafting_instructions: string
          example_tweets: string[]
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          drafting_instructions?: string
          example_tweets?: string[]
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          drafting_instructions?: string
          example_tweets?: string[]
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      claim_due_workflow_trigger: {
        Args: never
        Returns: {
          claimed_at: string
          frequency_amount: number
          frequency_unit: Database["public"]["Enums"]["trigger_frequency_unit"]
          last_run_at: string
          scheduled_next_run_at: string
          trigger_config: Json
          trigger_id: string
          workflow_description: string
          workflow_id: string
          workflow_name: string
        }[]
      }
      trigger_frequency_interval: {
        Args: {
          frequency_amount: number
          frequency_unit: Database["public"]["Enums"]["trigger_frequency_unit"]
        }
        Returns: string
      }
    }
    Enums: {
      trigger_frequency_unit: "m" | "h" | "d" | "w"
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
      trigger_frequency_unit: ["m", "h", "d", "w"],
    },
  },
} as const
