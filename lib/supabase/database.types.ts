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
      beat_conflicts: {
        Row: {
          agent_id: string;
          created_at: string;
          ground_on_beat: boolean;
          ground_reason: string;
          id: string;
          judge_on_beat: boolean;
          judge_reason: string;
          source_post_id: string;
          status: string;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          ground_on_beat: boolean;
          ground_reason: string;
          id?: string;
          judge_on_beat: boolean;
          judge_reason: string;
          source_post_id: string;
          status?: string;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
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
            foreignKeyName: "beat_conflicts_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
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
          agent_id: string;
          created_at: string;
          exclude_reason: string | null;
          excluded_off_beat: boolean;
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
          agent_id: string;
          created_at?: string;
          exclude_reason?: string | null;
          excluded_off_beat?: boolean;
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
          agent_id?: string;
          created_at?: string;
          exclude_reason?: string | null;
          excluded_off_beat?: boolean;
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
            foreignKeyName: "corpus_posts_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      draft_claims: {
        Row: {
          agent_id: string;
          created_at: string;
          id: string;
          source_post_id: string;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          id?: string;
          source_post_id: string;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
          id?: string;
          source_post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "draft_claims_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
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
          created_at: string;
          feedback: string | null;
          id: string;
          is_winner: boolean;
          judge_review: Json | null;
          judge_verdict: Json | null;
          model_call_id: string;
          news_synthesis: string | null;
          news_title: string | null;
          parent_draft_id: string | null;
          platform: string;
          posted_at: string | null;
          posted_tweet_id: string | null;
          posted_url: string | null;
          posting_claimed_at: string | null;
          source_post_id: string;
          story_id: string | null;
          translation: string | null;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          feedback?: string | null;
          id?: string;
          is_winner?: boolean;
          judge_review?: Json | null;
          judge_verdict?: Json | null;
          model_call_id: string;
          news_synthesis?: string | null;
          news_title?: string | null;
          parent_draft_id?: string | null;
          platform?: string;
          posted_at?: string | null;
          posted_tweet_id?: string | null;
          posted_url?: string | null;
          posting_claimed_at?: string | null;
          source_post_id: string;
          story_id?: string | null;
          translation?: string | null;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
          feedback?: string | null;
          id?: string;
          is_winner?: boolean;
          judge_review?: Json | null;
          judge_verdict?: Json | null;
          model_call_id?: string;
          news_synthesis?: string | null;
          news_title?: string | null;
          parent_draft_id?: string | null;
          platform?: string;
          posted_at?: string | null;
          posted_tweet_id?: string | null;
          posted_url?: string | null;
          posting_claimed_at?: string | null;
          source_post_id?: string;
          story_id?: string | null;
          translation?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "drafts_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drafts_model_call_id_fkey";
            columns: ["model_call_id"];
            isOneToOne: false;
            referencedRelation: "model_calls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drafts_parent_draft_id_fkey";
            columns: ["parent_draft_id"];
            isOneToOne: false;
            referencedRelation: "drafts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drafts_source_post_id_fkey";
            columns: ["source_post_id"];
            isOneToOne: false;
            referencedRelation: "source_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drafts_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      excluded_posts: {
        Row: {
          agent_id: string;
          excluded_at: string;
          id: string;
          on_beat_reason: string;
          source_post_id: string;
        };
        Insert: {
          agent_id: string;
          excluded_at?: string;
          id?: string;
          on_beat_reason: string;
          source_post_id: string;
        };
        Update: {
          agent_id?: string;
          excluded_at?: string;
          id?: string;
          on_beat_reason?: string;
          source_post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "excluded_posts_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "excluded_posts_source_post_id_fkey";
            columns: ["source_post_id"];
            isOneToOne: false;
            referencedRelation: "source_posts";
            referencedColumns: ["id"];
          },
        ];
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
      slack_accounts: {
        Row: {
          access_token: string;
          agent_id: string;
          bot_user_id: string;
          channel_id: string;
          channel_name: string;
          created_at: string;
          id: string;
          scopes: string;
          team_id: string;
          team_name: string;
          updated_at: string;
        };
        Insert: {
          access_token: string;
          agent_id: string;
          bot_user_id: string;
          channel_id: string;
          channel_name: string;
          created_at?: string;
          id?: string;
          scopes: string;
          team_id: string;
          team_name: string;
          updated_at?: string;
        };
        Update: {
          access_token?: string;
          agent_id?: string;
          bot_user_id?: string;
          channel_id?: string;
          channel_name?: string;
          created_at?: string;
          id?: string;
          scopes?: string;
          team_id?: string;
          team_name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "slack_accounts_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: true;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      slack_delivery_receipts: {
        Row: {
          agent_id: string;
          created_at: string;
          id: string;
          interaction_id: string;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          id?: string;
          interaction_id: string;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
          id?: string;
          interaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "slack_delivery_receipts_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      source_configs: {
        Row: {
          agent_id: string;
          beat_guidance: Json | null;
          change_detection: string;
          created_at: string;
          display_name: string | null;
          domain: string;
          feed_url: string | null;
          full_text_available: string | null;
          id: string;
          language: string | null;
          last_matched_at: string | null;
          last_verified_at: string;
          match_count: number | null;
          model_call_id: string | null;
          policy_note: string | null;
          prefilter: Json | null;
          retrieval: string | null;
          sample_size: number | null;
          sitemap_url: string | null;
          status: string;
          updated_at: string;
          url: string;
        };
        Insert: {
          agent_id: string;
          beat_guidance?: Json | null;
          change_detection: string;
          created_at?: string;
          display_name?: string | null;
          domain: string;
          feed_url?: string | null;
          full_text_available?: string | null;
          id?: string;
          language?: string | null;
          last_matched_at?: string | null;
          last_verified_at?: string;
          match_count?: number | null;
          model_call_id?: string | null;
          policy_note?: string | null;
          prefilter?: Json | null;
          retrieval?: string | null;
          sample_size?: number | null;
          sitemap_url?: string | null;
          status?: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          agent_id?: string;
          beat_guidance?: Json | null;
          change_detection?: string;
          created_at?: string;
          display_name?: string | null;
          domain?: string;
          feed_url?: string | null;
          full_text_available?: string | null;
          id?: string;
          language?: string | null;
          last_matched_at?: string | null;
          last_verified_at?: string;
          match_count?: number | null;
          model_call_id?: string | null;
          policy_note?: string | null;
          prefilter?: Json | null;
          retrieval?: string | null;
          sample_size?: number | null;
          sitemap_url?: string | null;
          status?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "source_configs_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "source_configs_model_call_id_fkey";
            columns: ["model_call_id"];
            isOneToOne: false;
            referencedRelation: "model_calls";
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
          lang: string | null;
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
          lang?: string | null;
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
          lang?: string | null;
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
      source_seen_items: {
        Row: {
          first_seen_at: string;
          id: string;
          item_key: string;
          source_config_id: string;
        };
        Insert: {
          first_seen_at?: string;
          id?: string;
          item_key: string;
          source_config_id: string;
        };
        Update: {
          first_seen_at?: string;
          id?: string;
          item_key?: string;
          source_config_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "source_seen_items_source_config_id_fkey";
            columns: ["source_config_id"];
            isOneToOne: false;
            referencedRelation: "source_configs";
            referencedColumns: ["id"];
          },
        ];
      };
      stories: {
        Row: {
          agent_id: string;
          created_at: string;
          id: string;
          summary: string;
          updated_at: string;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          id?: string;
          summary: string;
          updated_at?: string;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
          id?: string;
          summary?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stories_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      story_assignments: {
        Row: {
          agent_id: string;
          created_at: string;
          id: string;
          source_post_id: string;
          story_id: string;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          id?: string;
          source_post_id: string;
          story_id: string;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
          id?: string;
          source_post_id?: string;
          story_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "story_assignments_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
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
          agent_id: string;
          cost_usd: number | null;
          created_at: string;
          error_code: string | null;
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
          agent_id: string;
          cost_usd?: number | null;
          created_at?: string;
          error_code?: string | null;
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
          agent_id?: string;
          cost_usd?: number | null;
          created_at?: string;
          error_code?: string | null;
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
            foreignKeyName: "voice_extraction_runs_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: true;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_guides: {
        Row: {
          agent_id: string;
          cost_usd: number | null;
          created_at: string;
          guide_deploy: string;
          guide_raw: string;
          id: string;
          measured_facts: string;
          provenance: Json | null;
          updated_at: string;
        };
        Insert: {
          agent_id: string;
          cost_usd?: number | null;
          created_at?: string;
          guide_deploy: string;
          guide_raw: string;
          id?: string;
          measured_facts: string;
          provenance?: Json | null;
          updated_at?: string;
        };
        Update: {
          agent_id?: string;
          cost_usd?: number | null;
          created_at?: string;
          guide_deploy?: string;
          guide_raw?: string;
          id?: string;
          measured_facts?: string;
          provenance?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voice_guides_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_rules: {
        Row: {
          agent_id: string;
          created_at: string;
          enabled: boolean;
          id: string;
          provenance_model_call_id: string | null;
          rule: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          provenance_model_call_id?: string | null;
          rule: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          provenance_model_call_id?: string | null;
          rule?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voice_rules_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
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
      add_source_config: {
        Args: {
          p_agent_id: string;
          p_beat_guidance?: Json;
          p_change_detection: string;
          p_display_name: string;
          p_domain: string;
          p_feed_url: string;
          p_full_text_available: string;
          p_language: string;
          p_match_count: number;
          p_model_call_id: string;
          p_policy_note: string;
          p_prefilter: Json;
          p_retrieval: string;
          p_sample_size: number;
          p_sitemap_url: string;
          p_url: string;
        };
        Returns: string;
      };
      delete_account: { Args: never; Returns: undefined };
      reclaim_extraction_run: {
        Args: { p_agent_id: string; p_stale_cutoff: string };
        Returns: boolean;
      };
      record_seen_item: {
        Args: {
          p_bump_last_matched?: boolean;
          p_item_key: string;
          p_source_config_id: string;
        };
        Returns: boolean;
      };
      remove_source_config: {
        Args: { p_agent_id: string; p_url: string };
        Returns: undefined;
      };
      reserve_pending_source_config: {
        Args: {
          p_agent_id: string;
          p_display_name: string;
          p_domain: string;
          p_url: string;
        };
        Returns: string;
      };
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
