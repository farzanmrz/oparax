export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string;
          drafting_instructions: string;
          example_tweets: string[];
          id: string;
          monitored_handles: string[];
          monitoring_description: string;
          name: string;
          next_run_at: string | null;
          preferred_domains: string[];
          scan_cadence_minutes: number | null;
          scan_from: string | null;
          scan_to: string | null;
          schedule_days: number[];
          schedule_timezone: string | null;
          schedule_window_end: string | null;
          schedule_window_start: string | null;
          search_web: boolean;
          search_x: boolean;
          status: Database["public"]["Enums"]["agent_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          drafting_instructions?: string;
          example_tweets?: string[];
          id?: string;
          monitored_handles?: string[];
          monitoring_description?: string;
          name: string;
          next_run_at?: string | null;
          preferred_domains?: string[];
          scan_cadence_minutes?: number | null;
          scan_from?: string | null;
          scan_to?: string | null;
          schedule_days?: number[];
          schedule_timezone?: string | null;
          schedule_window_end?: string | null;
          schedule_window_start?: string | null;
          search_web?: boolean;
          search_x?: boolean;
          status?: Database["public"]["Enums"]["agent_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          drafting_instructions?: string;
          example_tweets?: string[];
          id?: string;
          monitored_handles?: string[];
          monitoring_description?: string;
          name?: string;
          next_run_at?: string | null;
          preferred_domains?: string[];
          scan_cadence_minutes?: number | null;
          scan_from?: string | null;
          scan_to?: string | null;
          schedule_days?: number[];
          schedule_timezone?: string | null;
          schedule_window_end?: string | null;
          schedule_window_start?: string | null;
          search_web?: boolean;
          search_x?: boolean;
          status?: Database["public"]["Enums"]["agent_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      api_usage_events: {
        Row: {
          agent_id: string | null;
          cost_usd: number | null;
          created_at: string;
          gateway_generation_id: string | null;
          id: string;
          input_tokens: number | null;
          kind: Database["public"]["Enums"]["usage_kind"];
          message_id: string | null;
          metadata: Json | null;
          model: string | null;
          output_tokens: number | null;
          provider: Database["public"]["Enums"]["usage_provider"];
          resolved_provider: string | null;
          run_id: string | null;
          session_id: string | null;
          tool_call_id: string | null;
          tool_name: string | null;
          user_id: string | null;
        };
        Insert: {
          agent_id?: string | null;
          cost_usd?: number | null;
          created_at?: string;
          gateway_generation_id?: string | null;
          id?: string;
          input_tokens?: number | null;
          kind: Database["public"]["Enums"]["usage_kind"];
          message_id?: string | null;
          metadata?: Json | null;
          model?: string | null;
          output_tokens?: number | null;
          provider: Database["public"]["Enums"]["usage_provider"];
          resolved_provider?: string | null;
          run_id?: string | null;
          session_id?: string | null;
          tool_call_id?: string | null;
          tool_name?: string | null;
          user_id?: string | null;
        };
        Update: {
          agent_id?: string | null;
          cost_usd?: number | null;
          created_at?: string;
          gateway_generation_id?: string | null;
          id?: string;
          input_tokens?: number | null;
          kind?: Database["public"]["Enums"]["usage_kind"];
          message_id?: string | null;
          metadata?: Json | null;
          model?: string | null;
          output_tokens?: number | null;
          provider?: Database["public"]["Enums"]["usage_provider"];
          resolved_provider?: string | null;
          run_id?: string | null;
          session_id?: string | null;
          tool_call_id?: string | null;
          tool_name?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "api_usage_events_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "api_usage_events_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
        ];
      };
      run_items: {
        Row: {
          agent_id: string;
          created_at: string;
          dedupe_key: string;
          drafted_text: string;
          error_message: string | null;
          final_text: string | null;
          id: string;
          posted_at: string | null;
          primary_tweet_url: string;
          run_id: string;
          source_urls: string[];
          status: Database["public"]["Enums"]["item_status"];
          story_summary: string;
          story_title: string;
          updated_at: string;
          x_tweet_id: string | null;
          x_tweet_url: string | null;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          dedupe_key: string;
          drafted_text?: string;
          error_message?: string | null;
          final_text?: string | null;
          id?: string;
          posted_at?: string | null;
          primary_tweet_url?: string;
          run_id: string;
          source_urls?: string[];
          status?: Database["public"]["Enums"]["item_status"];
          story_summary?: string;
          story_title?: string;
          updated_at?: string;
          x_tweet_id?: string | null;
          x_tweet_url?: string | null;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
          dedupe_key?: string;
          drafted_text?: string;
          error_message?: string | null;
          final_text?: string | null;
          id?: string;
          posted_at?: string | null;
          primary_tweet_url?: string;
          run_id?: string;
          source_urls?: string[];
          status?: Database["public"]["Enums"]["item_status"];
          story_summary?: string;
          story_title?: string;
          updated_at?: string;
          x_tweet_id?: string | null;
          x_tweet_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "run_items_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "run_items_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
        ];
      };
      runs: {
        Row: {
          agent_id: string;
          completed_at: string | null;
          cost_usd: number | null;
          error_message: string | null;
          id: string;
          inputs: Json | null;
          item_count: number | null;
          source: Database["public"]["Enums"]["run_source"];
          started_at: string;
          status: Database["public"]["Enums"]["run_status"];
          x_search_count: number | null;
        };
        Insert: {
          agent_id: string;
          completed_at?: string | null;
          cost_usd?: number | null;
          error_message?: string | null;
          id?: string;
          inputs?: Json | null;
          item_count?: number | null;
          source?: Database["public"]["Enums"]["run_source"];
          started_at?: string;
          status?: Database["public"]["Enums"]["run_status"];
          x_search_count?: number | null;
        };
        Update: {
          agent_id?: string;
          completed_at?: string | null;
          cost_usd?: number | null;
          error_message?: string | null;
          id?: string;
          inputs?: Json | null;
          item_count?: number | null;
          source?: Database["public"]["Enums"]["run_source"];
          started_at?: string;
          status?: Database["public"]["Enums"]["run_status"];
          x_search_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "runs_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      usage_reconciliations: {
        Row: {
          drift_pct: number | null;
          estimated_usd: number;
          id: string;
          period_end: string;
          period_start: string;
          provider: string;
          provider_usd: number | null;
          raw: Json | null;
          synced_at: string;
        };
        Insert: {
          drift_pct?: number | null;
          estimated_usd?: number;
          id?: string;
          period_end: string;
          period_start: string;
          provider: string;
          provider_usd?: number | null;
          raw?: Json | null;
          synced_at?: string;
        };
        Update: {
          drift_pct?: number | null;
          estimated_usd?: number;
          id?: string;
          period_end?: string;
          period_start?: string;
          provider?: string;
          provider_usd?: number | null;
          raw?: Json | null;
          synced_at?: string;
        };
        Relationships: [];
      };
      verified_x_handles: {
        Row: {
          last_checked_at: string;
          name: string | null;
          protected: boolean;
          username: string;
          verified_at: string;
          x_user_id: string;
        };
        Insert: {
          last_checked_at?: string;
          name?: string | null;
          protected?: boolean;
          username: string;
          verified_at?: string;
          x_user_id: string;
        };
        Update: {
          last_checked_at?: string;
          name?: string | null;
          protected?: boolean;
          username?: string;
          verified_at?: string;
          x_user_id?: string;
        };
        Relationships: [];
      };
      x_connections: {
        Row: {
          access_token: string;
          created_at: string;
          expires_at: string;
          id: string;
          refresh_token: string;
          scopes: string[];
          updated_at: string;
          user_id: string;
          x_user_id: string;
          x_username: string;
        };
        Insert: {
          access_token: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          refresh_token: string;
          scopes?: string[];
          updated_at?: string;
          user_id: string;
          x_user_id: string;
          x_username: string;
        };
        Update: {
          access_token?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          refresh_token?: string;
          scopes?: string[];
          updated_at?: string;
          user_id?: string;
          x_user_id?: string;
          x_username?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_account: { Args: never; Returns: undefined };
    };
    Enums: {
      agent_status: "active" | "paused" | "inactive";
      item_status: "drafted" | "posted" | "failed";
      run_source: "manual" | "cron";
      run_status: "running" | "completed" | "failed";
      usage_kind: "chat" | "scan" | "draft" | "redraft" | "x_verify" | "web_validate";
      usage_provider: "xai" | "gateway" | "x_api" | "internal" | "deepinfra" | "deepseek";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      agent_status: ["active", "paused", "inactive"],
      item_status: ["drafted", "posted", "failed"],
      run_source: ["manual", "cron"],
      run_status: ["running", "completed", "failed"],
      usage_kind: ["chat", "scan", "draft", "redraft", "x_verify", "web_validate"],
      usage_provider: ["xai", "gateway", "x_api", "internal", "deepinfra", "deepseek"],
    },
  },
} as const;
