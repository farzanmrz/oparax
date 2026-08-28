export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {
      agents: {
        Row: {
          auto_post_master: boolean;
          auto_post_sources: Json;
          beat: string;
          created_at: string;
          created_via: string;
          id: string;
          name: string | null;
          owner_id: string;
          plan: string | null;
          public_handle: string | null;
          reporter_handle: string;
          reporter_tier: string | null;
          reporter_verified_at: string | null;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          tracked_handles: string[];
          trial_started_at: string | null;
          updated_at: string;
          websites: Json;
        };
        Insert: {
          auto_post_master?: boolean;
          auto_post_sources?: Json;
          beat: string;
          created_at?: string;
          created_via?: string;
          id?: string;
          name?: string | null;
          owner_id: string;
          plan?: string | null;
          public_handle?: string | null;
          reporter_handle: string;
          reporter_tier?: string | null;
          reporter_verified_at?: string | null;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          tracked_handles?: string[];
          trial_started_at?: string | null;
          updated_at?: string;
          websites?: Json;
        };
        Update: {
          auto_post_master?: boolean;
          auto_post_sources?: Json;
          beat?: string;
          created_at?: string;
          created_via?: string;
          id?: string;
          name?: string | null;
          owner_id?: string;
          plan?: string | null;
          public_handle?: string | null;
          reporter_handle?: string;
          reporter_tier?: string | null;
          reporter_verified_at?: string | null;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          tracked_handles?: string[];
          trial_started_at?: string | null;
          updated_at?: string;
          websites?: Json;
        };
        Relationships: [];
      };
      alerts: {
        Row: {
          agent_id: string;
          created_at: string;
          dm_message_id: string | null;
          draft_id: string | null;
          id: string;
          link_token: string | null;
          sent_at: string | null;
          source_post_id: string;
          status: string;
          story_id: string;
          suppress_reason: string | null;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          dm_message_id?: string | null;
          draft_id?: string | null;
          id?: string;
          link_token?: string | null;
          sent_at?: string | null;
          source_post_id: string;
          status: string;
          story_id: string;
          suppress_reason?: string | null;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
          dm_message_id?: string | null;
          draft_id?: string | null;
          id?: string;
          link_token?: string | null;
          sent_at?: string | null;
          source_post_id?: string;
          status?: string;
          story_id?: string;
          suppress_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_draft_id_fkey";
            columns: ["draft_id"];
            isOneToOne: false;
            referencedRelation: "drafts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_source_post_id_fkey";
            columns: ["source_post_id"];
            isOneToOne: false;
            referencedRelation: "source_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
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
      dm_connections: {
        Row: {
          agent_id: string;
          consent_at: string | null;
          created_at: string;
          handle: string;
          id: string;
          state: string;
          x_user_id: string;
        };
        Insert: {
          agent_id: string;
          consent_at?: string | null;
          created_at?: string;
          handle: string;
          id?: string;
          state?: string;
          x_user_id: string;
        };
        Update: {
          agent_id?: string;
          consent_at?: string | null;
          created_at?: string;
          handle?: string;
          id?: string;
          state?: string;
          x_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dm_connections_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: true;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      dm_send_ledger: {
        Row: {
          agent_id: string | null;
          id: string;
          idempotency_key: string;
          purpose: string;
          recipient_x_user_id: string;
          reserved_at: string;
          sent_at: string | null;
          state: string;
        };
        Insert: {
          agent_id?: string | null;
          id?: string;
          idempotency_key: string;
          purpose: string;
          recipient_x_user_id: string;
          reserved_at?: string;
          sent_at?: string | null;
          state?: string;
        };
        Update: {
          agent_id?: string | null;
          id?: string;
          idempotency_key?: string;
          purpose?: string;
          recipient_x_user_id?: string;
          reserved_at?: string;
          sent_at?: string | null;
          state?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dm_send_ledger_agent_id_fkey";
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
          claim_token: string;
          completed_at: string | null;
          created_at: string;
          id: string;
          source_post_id: string;
        };
        Insert: {
          agent_id: string;
          claim_token?: string;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          source_post_id: string;
        };
        Update: {
          agent_id?: string;
          claim_token?: string;
          completed_at?: string | null;
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
          id: string;
          is_winner: boolean;
          news_points: Json | null;
          news_synthesis: string | null;
          news_title: string | null;
          on_beat_reason: string | null;
          platform: string;
          source_post_id: string;
          story_id: string | null;
        };
        Insert: {
          agent_id: string;
          created_at?: string;
          id?: string;
          is_winner?: boolean;
          news_points?: Json | null;
          news_synthesis?: string | null;
          news_title?: string | null;
          on_beat_reason?: string | null;
          platform?: string;
          source_post_id: string;
          story_id?: string | null;
        };
        Update: {
          agent_id?: string;
          created_at?: string;
          id?: string;
          is_winner?: boolean;
          news_points?: Json | null;
          news_synthesis?: string | null;
          news_title?: string | null;
          on_beat_reason?: string | null;
          platform?: string;
          source_post_id?: string;
          story_id?: string | null;
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
          cost_checked_at: string | null;
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
          cost_checked_at?: string | null;
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
          cost_checked_at?: string | null;
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
      onboard_attempts: {
        Row: {
          created_at: string;
          day: string;
          handle: string;
          id: string;
          ip_hash: string;
          outcome: string;
        };
        Insert: {
          created_at?: string;
          day?: string;
          handle: string;
          id?: string;
          ip_hash: string;
          outcome: string;
        };
        Update: {
          created_at?: string;
          day?: string;
          handle?: string;
          id?: string;
          ip_hash?: string;
          outcome?: string;
        };
        Relationships: [];
      };
      source_configs: {
        Row: {
          agent_id: string;
          beat_guidance: Json | null;
          change_detection: string;
          created_at: string;
          display_name: string | null;
          domain: string;
          error_code: string | null;
          feed_url: string | null;
          full_text_available: string | null;
          id: string;
          language: string | null;
          last_matched_at: string | null;
          last_verified_at: string;
          listing_url: string | null;
          match_count: number | null;
          model_call_id: string | null;
          policy_note: string | null;
          prefilter: Json | null;
          refresh_attempts: number;
          retrieval: string | null;
          sample_size: number | null;
          sitemap_url: string | null;
          status: string;
          strip_phrases: Json | null;
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
          error_code?: string | null;
          feed_url?: string | null;
          full_text_available?: string | null;
          id?: string;
          language?: string | null;
          last_matched_at?: string | null;
          last_verified_at?: string;
          listing_url?: string | null;
          match_count?: number | null;
          model_call_id?: string | null;
          policy_note?: string | null;
          prefilter?: Json | null;
          refresh_attempts?: number;
          retrieval?: string | null;
          sample_size?: number | null;
          sitemap_url?: string | null;
          status?: string;
          strip_phrases?: Json | null;
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
          error_code?: string | null;
          feed_url?: string | null;
          full_text_available?: string | null;
          id?: string;
          language?: string | null;
          last_matched_at?: string | null;
          last_verified_at?: string;
          listing_url?: string | null;
          match_count?: number | null;
          model_call_id?: string | null;
          policy_note?: string | null;
          prefilter?: Json | null;
          refresh_attempts?: number;
          retrieval?: string | null;
          sample_size?: number | null;
          sitemap_url?: string | null;
          status?: string;
          strip_phrases?: Json | null;
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
          publisher_claim_kind: Database["public"]["Enums"]["publisher_claim_kind"];
          raw: Json | null;
          source: string;
          source_config_id: string | null;
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
          publisher_claim_kind?: Database["public"]["Enums"]["publisher_claim_kind"];
          raw?: Json | null;
          source?: string;
          source_config_id?: string | null;
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
          publisher_claim_kind?: Database["public"]["Enums"]["publisher_claim_kind"];
          raw?: Json | null;
          source?: string;
          source_config_id?: string | null;
          text?: string;
          title?: string | null;
          url?: string | null;
          x_post_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "source_posts_source_config_id_fkey";
            columns: ["source_config_id"];
            isOneToOne: false;
            referencedRelation: "source_configs";
            referencedColumns: ["id"];
          },
        ];
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
      x_handle_checks: {
        Row: {
          checked_at: string;
          handle: string;
          handle_lower: string;
          id: string;
          status: string;
          x_user_id: string | null;
        };
        Insert: {
          checked_at?: string;
          handle: string;
          handle_lower: string;
          id?: string;
          status: string;
          x_user_id?: string | null;
        };
        Update: {
          checked_at?: string;
          handle?: string;
          handle_lower?: string;
          id?: string;
          status?: string;
          x_user_id?: string | null;
        };
        Relationships: [];
      };
      x_webhook_events: {
        Row: {
          claimed_at: string | null;
          created_at: string;
          event_id: string;
          event_type: string;
          id: string;
          payload: Json;
          reason: string | null;
          sender_x_user_id: string | null;
          state: string;
          x_post_id: string | null;
        };
        Insert: {
          claimed_at?: string | null;
          created_at?: string;
          event_id: string;
          event_type: string;
          id?: string;
          payload: Json;
          reason?: string | null;
          sender_x_user_id?: string | null;
          state?: string;
          x_post_id?: string | null;
        };
        Update: {
          claimed_at?: string | null;
          created_at?: string;
          event_id?: string;
          event_type?: string;
          id?: string;
          payload?: Json;
          reason?: string | null;
          sender_x_user_id?: string | null;
          state?: string;
          x_post_id?: string | null;
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
          p_config_id: string;
          p_display_name: string;
          p_domain: string;
          p_feed_url: string;
          p_full_text_available: string;
          p_language: string;
          p_listing_url?: string;
          p_match_count: number;
          p_model_call_id: string;
          p_policy_note: string;
          p_prefilter: Json;
          p_retrieval: string;
          p_sample_size: number;
          p_sitemap_url: string;
          p_strip_phrases?: Json;
          p_url: string;
        };
        Returns: string;
      };
      attach_or_create_story: {
        Args: {
          p_agent_id: string;
          p_known_story_ids: string[];
          p_match_story_id: string;
          p_source_post_id: string;
          p_summary: string;
        };
        Returns: Json;
      };
      claim_draft: {
        Args: {
          p_agent_id: string;
          p_claim_token: string;
          p_source_post_id: string;
          p_stale_cutoff: string;
        };
        Returns: boolean;
      };
      claim_strip_phrase_refresh_attempt: {
        Args: { p_config_id: string };
        Returns: number;
      };
      complete_claimed_attachment: {
        Args: {
          p_agent_id: string;
          p_claim_token: string;
          p_source_post_id: string;
          p_story_id: string;
        };
        Returns: boolean;
      };
      delete_account: { Args: never; Returns: undefined };
      detect_spend_anomalies: {
        Args: { p_min_calls?: number; p_min_cost?: number; p_since: string };
        Returns: {
          calls: number;
          first_call: string;
          last_call: string;
          ref_id: string;
          stage: string;
          total_cost: number;
        }[];
      };
      insert_claimed_winner: {
        Args: {
          p_agent_id: string;
          p_claim_token: string;
          p_news_points: Json;
          p_news_synthesis: string;
          p_news_title: string;
          p_on_beat_reason: string;
          p_platform: string;
          p_source_post_id: string;
          p_story_id: string;
        };
        Returns: string;
      };
      record_seen_item: {
        Args: {
          p_bump_last_matched?: boolean;
          p_item_key: string;
          p_source_config_id: string;
        };
        Returns: boolean;
      };
      refresh_source_strip_phrases: {
        Args: {
          p_agent_id: string;
          p_config_id: string;
          p_model_call_id?: string;
          p_strip_phrases: Json;
        };
        Returns: string;
      };
      remove_source_config: {
        Args: { p_agent_id: string; p_url: string };
        Returns: undefined;
      };
      reserve_dm_send: {
        Args: {
          p_agent_id: string;
          p_idempotency_key: string;
          p_purpose: string;
          p_recipient: string;
        };
        Returns: string;
      };
      reserve_pending_source_config: {
        Args: {
          p_agent_id: string;
          p_display_name: string;
          p_domain: string;
          p_limit?: number;
          p_url: string;
        };
        Returns: string;
      };
      unseen_item_keys: {
        Args: { p_item_keys: string[]; p_source_config_id: string };
        Returns: string[];
      };
      upsert_claimed_exclusion: {
        Args: {
          p_agent_id: string;
          p_claim_token: string;
          p_excluded_at: string;
          p_on_beat_reason: string;
          p_source_post_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      publisher_claim_kind:
        | "official"
        | "insider-sourced"
        | "outlet-characterization"
        | "aggregator";
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
      publisher_claim_kind: [
        "official",
        "insider-sourced",
        "outlet-characterization",
        "aggregator",
      ],
    },
  },
} as const;
