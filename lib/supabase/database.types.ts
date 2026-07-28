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
          account_tier: string;
          beat: string;
          created_at: string;
          drafting_instructions: string;
          handles: string[];
          id: string;
          name: string;
          next_run_at: string | null;
          scan_frequency: Json;
          search_template: Json | null;
          setup_session_id: string | null;
          setup_transcript: Json;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_tier: string;
          beat: string;
          created_at?: string;
          drafting_instructions: string;
          handles: string[];
          id?: string;
          name: string;
          next_run_at?: string | null;
          scan_frequency: Json;
          search_template?: Json | null;
          setup_session_id?: string | null;
          setup_transcript: Json;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          account_tier?: string;
          beat?: string;
          created_at?: string;
          drafting_instructions?: string;
          handles?: string[];
          id?: string;
          name?: string;
          next_run_at?: string | null;
          scan_frequency?: Json;
          search_template?: Json | null;
          setup_session_id?: string | null;
          setup_transcript?: Json;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      beat_conflicts: {
        Row: {
          created_at: string;
          experiment_id: string;
          ground_on_beat: boolean;
          ground_reason: string;
          id: string;
          judge_on_beat: boolean;
          judge_reason: string;
          source_post_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          experiment_id: string;
          ground_on_beat: boolean;
          ground_reason: string;
          id?: string;
          judge_on_beat: boolean;
          judge_reason: string;
          source_post_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          experiment_id?: string;
          ground_on_beat?: boolean;
          ground_reason?: string;
          id?: string;
          judge_on_beat?: boolean;
          judge_reason?: string;
          source_post_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "beat_conflicts_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "beat_conflicts_source_post_id_fkey";
            columns: ["source_post_id"];
            isOneToOne: false;
            referencedRelation: "source_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      corpus_posts: {
        Row: {
          created_at: string;
          exclude_reason: string | null;
          excluded_off_beat: boolean;
          experiment_id: string;
          id: string;
          is_long: boolean;
          like_count: number;
          media: Json;
          posted_at: string;
          repost_count: number;
          text: string;
          x_post_id: string;
        };
        Insert: {
          created_at?: string;
          exclude_reason?: string | null;
          excluded_off_beat?: boolean;
          experiment_id: string;
          id?: string;
          is_long?: boolean;
          like_count?: number;
          media?: Json;
          posted_at: string;
          repost_count?: number;
          text: string;
          x_post_id: string;
        };
        Update: {
          created_at?: string;
          exclude_reason?: string | null;
          excluded_off_beat?: boolean;
          experiment_id?: string;
          id?: string;
          is_long?: boolean;
          like_count?: number;
          media?: Json;
          posted_at?: string;
          repost_count?: number;
          text?: string;
          x_post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "corpus_posts_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
        ];
      };
      draft_claims: {
        Row: {
          created_at: string;
          experiment_id: string;
          id: string;
          source_post_id: string;
        };
        Insert: {
          created_at?: string;
          experiment_id: string;
          id?: string;
          source_post_id: string;
        };
        Update: {
          created_at?: string;
          experiment_id?: string;
          id?: string;
          source_post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "draft_claims_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draft_claims_source_post_id_fkey";
            columns: ["source_post_id"];
            isOneToOne: false;
            referencedRelation: "source_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      drafts: {
        Row: {
          agent_id: string;
          cost_deepseek: number | null;
          created_at: string;
          id: string;
          item: Json;
          posted_at: string | null;
          posted_tweet_id: string | null;
          posted_url: string | null;
          source: string;
          text: string;
          usage: Json | null;
        };
        Insert: {
          agent_id: string;
          cost_deepseek?: number | null;
          created_at?: string;
          id?: string;
          item: Json;
          posted_at?: string | null;
          posted_tweet_id?: string | null;
          posted_url?: string | null;
          source?: string;
          text: string;
          usage?: Json | null;
        };
        Update: {
          agent_id?: string;
          cost_deepseek?: number | null;
          created_at?: string;
          id?: string;
          item?: Json;
          posted_at?: string | null;
          posted_tweet_id?: string | null;
          posted_url?: string | null;
          source?: string;
          text?: string;
          usage?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "drafts_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      experiments: {
        Row: {
          auto_post_master: boolean;
          auto_post_sources: Json;
          beat: string;
          created_at: string;
          id: string;
          name: string | null;
          owner_id: string;
          reporter_handle: string;
          reporter_verified_at: string | null;
          status: string;
          tracked_handles: string[];
          updated_at: string;
          websites: Json;
        };
        Insert: {
          auto_post_master?: boolean;
          auto_post_sources?: Json;
          beat: string;
          created_at?: string;
          id?: string;
          name?: string | null;
          owner_id: string;
          reporter_handle: string;
          reporter_verified_at?: string | null;
          status?: string;
          tracked_handles?: string[];
          updated_at?: string;
          websites?: Json;
        };
        Update: {
          auto_post_master?: boolean;
          auto_post_sources?: Json;
          beat?: string;
          created_at?: string;
          id?: string;
          name?: string | null;
          owner_id?: string;
          reporter_handle?: string;
          reporter_verified_at?: string | null;
          status?: string;
          tracked_handles?: string[];
          updated_at?: string;
          websites?: Json;
        };
        Relationships: [];
      };
      model_calls: {
        Row: {
          cost_usd: number | null;
          created_at: string;
          generation_id: string | null;
          id: string;
          model: string;
          output: string | null;
          owner_id: string;
          reasoning: string | null;
          ref_id: string | null;
          ref_kind: string | null;
          role: string;
          stage: string;
          usage: Json | null;
        };
        Insert: {
          cost_usd?: number | null;
          created_at?: string;
          generation_id?: string | null;
          id?: string;
          model: string;
          output?: string | null;
          owner_id: string;
          reasoning?: string | null;
          ref_id?: string | null;
          ref_kind?: string | null;
          role?: string;
          stage: string;
          usage?: Json | null;
        };
        Update: {
          cost_usd?: number | null;
          created_at?: string;
          generation_id?: string | null;
          id?: string;
          model?: string;
          output?: string | null;
          owner_id?: string;
          reasoning?: string | null;
          ref_id?: string | null;
          ref_kind?: string | null;
          role?: string;
          stage?: string;
          usage?: Json | null;
        };
        Relationships: [];
      };
      post_drafts: {
        Row: {
          created_at: string;
          experiment_id: string;
          feedback: string | null;
          id: string;
          is_winner: boolean;
          judge_review: Json | null;
          judge_verdict: Json | null;
          model_call_id: string;
          parent_draft_id: string | null;
          platform: string;
          posted_at: string | null;
          posted_tweet_id: string | null;
          posted_url: string | null;
          source_post_id: string;
          story_id: string | null;
          synthesis: string | null;
          translation: string | null;
        };
        Insert: {
          created_at?: string;
          experiment_id: string;
          feedback?: string | null;
          id?: string;
          is_winner?: boolean;
          judge_review?: Json | null;
          judge_verdict?: Json | null;
          model_call_id: string;
          parent_draft_id?: string | null;
          platform?: string;
          posted_at?: string | null;
          posted_tweet_id?: string | null;
          posted_url?: string | null;
          source_post_id: string;
          story_id?: string | null;
          synthesis?: string | null;
          translation?: string | null;
        };
        Update: {
          created_at?: string;
          experiment_id?: string;
          feedback?: string | null;
          id?: string;
          is_winner?: boolean;
          judge_review?: Json | null;
          judge_verdict?: Json | null;
          model_call_id?: string;
          parent_draft_id?: string | null;
          platform?: string;
          posted_at?: string | null;
          posted_tweet_id?: string | null;
          posted_url?: string | null;
          source_post_id?: string;
          story_id?: string | null;
          synthesis?: string | null;
          translation?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "post_drafts_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_drafts_model_call_id_fkey";
            columns: ["model_call_id"];
            isOneToOne: false;
            referencedRelation: "model_calls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_drafts_parent_draft_id_fkey";
            columns: ["parent_draft_id"];
            isOneToOne: false;
            referencedRelation: "post_drafts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_drafts_source_post_id_fkey";
            columns: ["source_post_id"];
            isOneToOne: false;
            referencedRelation: "source_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_drafts_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      runs: {
        Row: {
          agent_id: string;
          cost_deepseek: number | null;
          cost_grok: number | null;
          error: string | null;
          finished_at: string | null;
          id: string;
          result: Json | null;
          source: string;
          started_at: string;
          status: string;
          trace: Json | null;
          usage: Json | null;
        };
        Insert: {
          agent_id: string;
          cost_deepseek?: number | null;
          cost_grok?: number | null;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          result?: Json | null;
          source?: string;
          started_at?: string;
          status?: string;
          trace?: Json | null;
          usage?: Json | null;
        };
        Update: {
          agent_id?: string;
          cost_deepseek?: number | null;
          cost_grok?: number | null;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          result?: Json | null;
          source?: string;
          started_at?: string;
          status?: string;
          trace?: Json | null;
          usage?: Json | null;
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
      slack_accounts: {
        Row: {
          access_token: string;
          bot_user_id: string;
          channel_id: string;
          channel_name: string;
          created_at: string;
          experiment_id: string;
          id: string;
          scopes: string;
          team_id: string;
          team_name: string;
          updated_at: string;
        };
        Insert: {
          access_token: string;
          bot_user_id: string;
          channel_id: string;
          channel_name: string;
          created_at?: string;
          experiment_id: string;
          id?: string;
          scopes: string;
          team_id: string;
          team_name: string;
          updated_at?: string;
        };
        Update: {
          access_token?: string;
          bot_user_id?: string;
          channel_id?: string;
          channel_name?: string;
          created_at?: string;
          experiment_id?: string;
          id?: string;
          scopes?: string;
          team_id?: string;
          team_name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "slack_accounts_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: true;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
        ];
      };
      slack_delivery_receipts: {
        Row: {
          created_at: string;
          experiment_id: string;
          id: string;
          interaction_id: string;
        };
        Insert: {
          created_at?: string;
          experiment_id: string;
          id?: string;
          interaction_id: string;
        };
        Update: {
          created_at?: string;
          experiment_id?: string;
          id?: string;
          interaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "slack_delivery_receipts_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
        ];
      };
      source_posts: {
        Row: {
          author_handle: string | null;
          created_at: string;
          external_id: string | null;
          id: string;
          posted_at: string | null;
          raw: Json | null;
          source: string;
          text: string;
          title: string | null;
          url: string | null;
          x_post_id: string | null;
        };
        Insert: {
          author_handle?: string | null;
          created_at?: string;
          external_id?: string | null;
          id?: string;
          posted_at?: string | null;
          raw?: Json | null;
          source?: string;
          text: string;
          title?: string | null;
          url?: string | null;
          x_post_id?: string | null;
        };
        Update: {
          author_handle?: string | null;
          created_at?: string;
          external_id?: string | null;
          id?: string;
          posted_at?: string | null;
          raw?: Json | null;
          source?: string;
          text?: string;
          title?: string | null;
          url?: string | null;
          x_post_id?: string | null;
        };
        Relationships: [];
      };
      stories: {
        Row: {
          created_at: string;
          experiment_id: string;
          id: string;
          summary: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          experiment_id: string;
          id?: string;
          summary: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          experiment_id?: string;
          id?: string;
          summary?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stories_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
        ];
      };
      story_assignments: {
        Row: {
          created_at: string;
          experiment_id: string;
          id: string;
          source_post_id: string;
          story_id: string;
        };
        Insert: {
          created_at?: string;
          experiment_id: string;
          id?: string;
          source_post_id: string;
          story_id: string;
        };
        Update: {
          created_at?: string;
          experiment_id?: string;
          id?: string;
          source_post_id?: string;
          story_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "story_assignments_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_assignments_source_post_id_fkey";
            columns: ["source_post_id"];
            isOneToOne: false;
            referencedRelation: "source_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_assignments_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      unmatched_deliveries: {
        Row: {
          author_handle: string;
          created_at: string;
          id: string;
          x_post_id: string;
        };
        Insert: {
          author_handle: string;
          created_at?: string;
          id?: string;
          x_post_id: string;
        };
        Update: {
          author_handle?: string;
          created_at?: string;
          id?: string;
          x_post_id?: string;
        };
        Relationships: [];
      };
      usage_events: {
        Row: {
          cost_usd: number | null;
          created_at: string;
          id: string;
          kind: string;
          owner_id: string;
          ref_id: string | null;
          units: number | null;
        };
        Insert: {
          cost_usd?: number | null;
          created_at?: string;
          id?: string;
          kind: string;
          owner_id: string;
          ref_id?: string | null;
          units?: number | null;
        };
        Update: {
          cost_usd?: number | null;
          created_at?: string;
          id?: string;
          kind?: string;
          owner_id?: string;
          ref_id?: string | null;
          units?: number | null;
        };
        Relationships: [];
      };
      voice_extraction_runs: {
        Row: {
          cost_usd: number | null;
          created_at: string;
          error_code: string | null;
          experiment_id: string;
          finished_at: string | null;
          id: string;
          progress_note: string | null;
          reasoning_partial: string | null;
          stage: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          cost_usd?: number | null;
          created_at?: string;
          error_code?: string | null;
          experiment_id: string;
          finished_at?: string | null;
          id?: string;
          progress_note?: string | null;
          reasoning_partial?: string | null;
          stage?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          cost_usd?: number | null;
          created_at?: string;
          error_code?: string | null;
          experiment_id?: string;
          finished_at?: string | null;
          id?: string;
          progress_note?: string | null;
          reasoning_partial?: string | null;
          stage?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voice_extraction_runs_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: true;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_guides: {
        Row: {
          cost_usd: number | null;
          created_at: string;
          experiment_id: string;
          guide_deploy: string;
          guide_raw: string;
          id: string;
          measured_facts: string;
          provenance: Json | null;
          updated_at: string;
        };
        Insert: {
          cost_usd?: number | null;
          created_at?: string;
          experiment_id: string;
          guide_deploy: string;
          guide_raw: string;
          id?: string;
          measured_facts: string;
          provenance?: Json | null;
          updated_at?: string;
        };
        Update: {
          cost_usd?: number | null;
          created_at?: string;
          experiment_id?: string;
          guide_deploy?: string;
          guide_raw?: string;
          id?: string;
          measured_facts?: string;
          provenance?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voice_guides_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_rules: {
        Row: {
          created_at: string;
          enabled: boolean;
          experiment_id: string;
          id: string;
          provenance_model_call_id: string | null;
          rule: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          experiment_id: string;
          id?: string;
          provenance_model_call_id?: string | null;
          rule: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          experiment_id?: string;
          id?: string;
          provenance_model_call_id?: string | null;
          rule?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voice_rules_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "voice_rules_provenance_model_call_id_fkey";
            columns: ["provenance_model_call_id"];
            isOneToOne: false;
            referencedRelation: "model_calls";
            referencedColumns: ["id"];
          },
        ];
      };
      x_accounts: {
        Row: {
          access_token: string;
          created_at: string;
          handle: string;
          refresh_token: string;
          scopes: string;
          tier: string | null;
          token_expires_at: string;
          updated_at: string;
          user_id: string;
          x_user_id: string;
        };
        Insert: {
          access_token: string;
          created_at?: string;
          handle: string;
          refresh_token: string;
          scopes: string;
          tier?: string | null;
          token_expires_at: string;
          updated_at?: string;
          user_id: string;
          x_user_id: string;
        };
        Update: {
          access_token?: string;
          created_at?: string;
          handle?: string;
          refresh_token?: string;
          scopes?: string;
          tier?: string | null;
          token_expires_at?: string;
          updated_at?: string;
          user_id?: string;
          x_user_id?: string;
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
      [_ in never]: never;
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
    Enums: {},
  },
} as const;
