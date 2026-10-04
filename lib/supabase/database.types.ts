export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      card_versions: {
        Row: {
          card: Json | null;
          created_at: string;
          id: number;
          record: Json;
          story_id: string | null;
          version: number;
        };
        Insert: {
          card?: Json | null;
          created_at?: string;
          id?: never;
          record: Json;
          story_id?: string | null;
          version: number;
        };
        Update: {
          card?: Json | null;
          created_at?: string;
          id?: never;
          record?: Json;
          story_id?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "card_versions_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      config: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          emailed_at: string | null;
          error: string | null;
          id: string;
          message: string;
          tries: number;
        };
        Insert: {
          created_at?: string;
          email: string;
          emailed_at?: string | null;
          error?: string | null;
          id?: string;
          message: string;
          tries?: number;
        };
        Update: {
          created_at?: string;
          email?: string;
          emailed_at?: string | null;
          error?: string | null;
          id?: string;
          message?: string;
          tries?: number;
        };
        Relationships: [];
      };
      cost_ledger: {
        Row: {
          created_at: string;
          day: string;
          external_id: string | null;
          hour: string;
          id: number;
          kind: string;
          monitor_id: string | null;
          run_id: string | null;
          service: string;
          settled: boolean;
          source_id: string | null;
          units: number;
          usd: number;
          usd_reserved: number;
        };
        Insert: {
          created_at?: string;
          day?: string;
          external_id?: string | null;
          hour?: string;
          id?: never;
          kind: string;
          monitor_id?: string | null;
          run_id?: string | null;
          service: string;
          settled?: boolean;
          source_id?: string | null;
          units?: number;
          usd: number;
          usd_reserved?: number;
        };
        Update: {
          created_at?: string;
          day?: string;
          external_id?: string | null;
          hour?: string;
          id?: never;
          kind?: string;
          monitor_id?: string | null;
          run_id?: string | null;
          service?: string;
          settled?: boolean;
          source_id?: string | null;
          units?: number;
          usd?: number;
          usd_reserved?: number;
        };
        Relationships: [];
      };
      deliveries: {
        Row: {
          attempted_at: string;
          dm_event_id: string | null;
          error: string | null;
          monitor_id: string;
          sent_at: string | null;
          state: string;
          story_id: string;
          tries: number;
        };
        Insert: {
          attempted_at?: string;
          dm_event_id?: string | null;
          error?: string | null;
          monitor_id: string;
          sent_at?: string | null;
          state: string;
          story_id: string;
          tries?: number;
        };
        Update: {
          attempted_at?: string;
          dm_event_id?: string | null;
          error?: string | null;
          monitor_id?: string;
          sent_at?: string | null;
          state?: string;
          story_id?: string;
          tries?: number;
        };
        Relationships: [
          {
            foreignKeyName: "deliveries_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      digest_items: {
        Row: {
          created_at: string;
          description: string;
          external_id: string;
          fit_score: number | null;
          id: string;
          kind: string;
          monitor_id: string | null;
          name: string;
          url: string;
          why_now: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          external_id: string;
          fit_score?: number | null;
          id?: string;
          kind: string;
          monitor_id?: string | null;
          name: string;
          url: string;
          why_now: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          external_id?: string;
          fit_score?: number | null;
          id?: string;
          kind?: string;
          monitor_id?: string | null;
          name?: string;
          url?: string;
          why_now?: string;
        };
        Relationships: [
          {
            foreignKeyName: "digest_items_monitor_id_fkey";
            columns: ["monitor_id"];
            isOneToOne: false;
            referencedRelation: "monitors";
            referencedColumns: ["id"];
          },
        ];
      };
      dm_events: {
        Row: {
          event_id: string;
          handled: string | null;
          monitor_id: string | null;
          payload: Json | null;
          received_at: string;
          sender_x_user_id: string | null;
          text: string | null;
        };
        Insert: {
          event_id: string;
          handled?: string | null;
          monitor_id?: string | null;
          payload?: Json | null;
          received_at?: string;
          sender_x_user_id?: string | null;
          text?: string | null;
        };
        Update: {
          event_id?: string;
          handled?: string | null;
          monitor_id?: string | null;
          payload?: Json | null;
          received_at?: string;
          sender_x_user_id?: string | null;
          text?: string | null;
        };
        Relationships: [];
      };
      followed_repos: {
        Row: {
          checked_at: string | null;
          created_at: string;
          crossed_at: string | null;
          monitor_id: string;
          repo: string;
          stars: number | null;
          threshold: number;
        };
        Insert: {
          checked_at?: string | null;
          created_at?: string;
          crossed_at?: string | null;
          monitor_id: string;
          repo: string;
          stars?: number | null;
          threshold?: number;
        };
        Update: {
          checked_at?: string | null;
          created_at?: string;
          crossed_at?: string | null;
          monitor_id?: string;
          repo?: string;
          stars?: number | null;
          threshold?: number;
        };
        Relationships: [
          {
            foreignKeyName: "followed_repos_monitor_id_fkey";
            columns: ["monitor_id"];
            isOneToOne: false;
            referencedRelation: "monitors";
            referencedColumns: ["id"];
          },
        ];
      };
      handle_waitlist: {
        Row: {
          beat: string | null;
          created_at: string;
          handle: string;
          handle_source: string;
          id: string;
          user_id: string | null;
        };
        Insert: {
          beat?: string | null;
          created_at?: string;
          handle: string;
          handle_source?: string;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          beat?: string | null;
          created_at?: string;
          handle?: string;
          handle_source?: string;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      items: {
        Row: {
          author: Json | null;
          created_at: string;
          date_source: string | null;
          final_url: string | null;
          id: string;
          image: string | null;
          kind: string;
          lang: string | null;
          outcome: string;
          published_at: string;
          source_id: string;
          source_ids: string[];
          text: string;
          text_from: string | null;
          title: string;
          unreadable_reason: string | null;
          url: string;
        };
        Insert: {
          author?: Json | null;
          created_at?: string;
          date_source?: string | null;
          final_url?: string | null;
          id: string;
          image?: string | null;
          kind: string;
          lang?: string | null;
          outcome: string;
          published_at: string;
          source_id: string;
          source_ids?: string[];
          text?: string;
          text_from?: string | null;
          title?: string;
          unreadable_reason?: string | null;
          url: string;
        };
        Update: {
          author?: Json | null;
          created_at?: string;
          date_source?: string | null;
          final_url?: string | null;
          id?: string;
          image?: string | null;
          kind?: string;
          lang?: string | null;
          outcome?: string;
          published_at?: string;
          source_id?: string;
          source_ids?: string[];
          text?: string;
          text_from?: string | null;
          title?: string;
          unreadable_reason?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "items_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      monitor_accounts: {
        Row: {
          counts_checked_at: string | null;
          created_at: string;
          handle: string;
          monitor_id: string;
          name: string;
          posts_per_day: number | null;
          score: number | null;
          since_id: string | null;
          watched: boolean;
          watched_at: string | null;
          why: string;
          x_user_id: string | null;
        };
        Insert: {
          counts_checked_at?: string | null;
          created_at?: string;
          handle: string;
          monitor_id: string;
          name?: string;
          posts_per_day?: number | null;
          score?: number | null;
          since_id?: string | null;
          watched?: boolean;
          watched_at?: string | null;
          why?: string;
          x_user_id?: string | null;
        };
        Update: {
          counts_checked_at?: string | null;
          created_at?: string;
          handle?: string;
          monitor_id?: string;
          name?: string;
          posts_per_day?: number | null;
          score?: number | null;
          since_id?: string | null;
          watched?: boolean;
          watched_at?: string | null;
          why?: string;
          x_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "monitor_accounts_monitor_id_fkey";
            columns: ["monitor_id"];
            isOneToOne: false;
            referencedRelation: "monitors";
            referencedColumns: ["id"];
          },
        ];
      };
      monitor_items: {
        Row: {
          card: Json | null;
          card_status: string | null;
          created_at: string;
          error: string | null;
          fit_band: string | null;
          fit_score: number | null;
          item_id: string;
          judged_at: string | null;
          monitor_id: string;
          stage: string;
          status: string;
          story_id: string | null;
          tries: number;
        };
        Insert: {
          card?: Json | null;
          card_status?: string | null;
          created_at?: string;
          error?: string | null;
          fit_band?: string | null;
          fit_score?: number | null;
          item_id: string;
          judged_at?: string | null;
          monitor_id: string;
          stage?: string;
          status: string;
          story_id?: string | null;
          tries?: number;
        };
        Update: {
          card?: Json | null;
          card_status?: string | null;
          created_at?: string;
          error?: string | null;
          fit_band?: string | null;
          fit_score?: number | null;
          item_id?: string;
          judged_at?: string | null;
          monitor_id?: string;
          stage?: string;
          status?: string;
          story_id?: string | null;
          tries?: number;
        };
        Relationships: [
          {
            foreignKeyName: "monitor_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      monitor_sources: {
        Row: {
          added_by: string;
          created_at: string;
          monitor_id: string;
          no_filter: boolean;
          prefilled_at: string | null;
          removed_at: string | null;
          score: number | null;
          source_id: string;
          why: string;
        };
        Insert: {
          added_by: string;
          created_at?: string;
          monitor_id: string;
          no_filter?: boolean;
          prefilled_at?: string | null;
          removed_at?: string | null;
          score?: number | null;
          source_id: string;
          why?: string;
        };
        Update: {
          added_by?: string;
          created_at?: string;
          monitor_id?: string;
          no_filter?: boolean;
          prefilled_at?: string | null;
          removed_at?: string | null;
          score?: number | null;
          source_id?: string;
          why?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monitor_sources_monitor_id_fkey";
            columns: ["monitor_id"];
            isOneToOne: false;
            referencedRelation: "monitors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monitor_sources_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      monitors: {
        Row: {
          alert_hour: number;
          alert_timezone: string | null;
          beat: string;
          bot_connected_at: string | null;
          bot_state: string;
          brief: Json | null;
          budget_exhausted_at: string | null;
          build_error: string | null;
          build_finished_at: string | null;
          build_lease_owner: string | null;
          build_lease_until: string | null;
          build_log: Json;
          build_started_at: string | null;
          build_state: Json | null;
          build_step: number;
          build_tries: number;
          cadence: string;
          cancel_at_period_end: boolean;
          checkout_opened_at: string | null;
          checkout_session_id: string | null;
          created_at: string;
          digest_github: boolean;
          digest_product_hunt: boolean;
          display_handle: string;
          handle: string;
          id: string;
          last_alert_at: string | null;
          last_invoice_id: string | null;
          paid_through: string | null;
          pool_limit: number;
          pool_period_start: string | null;
          pool_used: number;
          profile: Json | null;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscriber_x_user_id: string | null;
          subscription_status: string | null;
          tier: string;
          trial_started_at: string | null;
          updated_at: string;
          user_id: string;
          x_user_id: string | null;
        };
        Insert: {
          alert_hour?: number;
          alert_timezone?: string | null;
          beat: string;
          bot_connected_at?: string | null;
          bot_state?: string;
          brief?: Json | null;
          budget_exhausted_at?: string | null;
          build_error?: string | null;
          build_finished_at?: string | null;
          build_lease_owner?: string | null;
          build_lease_until?: string | null;
          build_log?: Json;
          build_started_at?: string | null;
          build_state?: Json | null;
          build_step?: number;
          build_tries?: number;
          cadence?: string;
          cancel_at_period_end?: boolean;
          checkout_opened_at?: string | null;
          checkout_session_id?: string | null;
          created_at?: string;
          digest_github?: boolean;
          digest_product_hunt?: boolean;
          display_handle: string;
          handle: string;
          id?: string;
          last_alert_at?: string | null;
          last_invoice_id?: string | null;
          paid_through?: string | null;
          pool_limit?: number;
          pool_period_start?: string | null;
          pool_used?: number;
          profile?: Json | null;
          status: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscriber_x_user_id?: string | null;
          subscription_status?: string | null;
          tier?: string;
          trial_started_at?: string | null;
          updated_at?: string;
          user_id: string;
          x_user_id?: string | null;
        };
        Update: {
          alert_hour?: number;
          alert_timezone?: string | null;
          beat?: string;
          bot_connected_at?: string | null;
          bot_state?: string;
          brief?: Json | null;
          budget_exhausted_at?: string | null;
          build_error?: string | null;
          build_finished_at?: string | null;
          build_lease_owner?: string | null;
          build_lease_until?: string | null;
          build_log?: Json;
          build_started_at?: string | null;
          build_state?: Json | null;
          build_step?: number;
          build_tries?: number;
          cadence?: string;
          cancel_at_period_end?: boolean;
          checkout_opened_at?: string | null;
          checkout_session_id?: string | null;
          created_at?: string;
          digest_github?: boolean;
          digest_product_hunt?: boolean;
          display_handle?: string;
          handle?: string;
          id?: string;
          last_alert_at?: string | null;
          last_invoice_id?: string | null;
          paid_through?: string | null;
          pool_limit?: number;
          pool_period_start?: string | null;
          pool_used?: number;
          profile?: Json | null;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscriber_x_user_id?: string | null;
          subscription_status?: string | null;
          tier?: string;
          trial_started_at?: string | null;
          updated_at?: string;
          user_id?: string;
          x_user_id?: string | null;
        };
        Relationships: [];
      };
      repo_snapshots: {
        Row: {
          day: string;
          observed_at: string;
          repo: string;
          stars: number;
        };
        Insert: {
          day: string;
          observed_at?: string;
          repo: string;
          stars: number;
        };
        Update: {
          day?: string;
          observed_at?: string;
          repo?: string;
          stars?: number;
        };
        Relationships: [];
      };
      run_claims: {
        Row: {
          claimed_at: string;
          expires_at: string;
          job: string;
          run_id: string;
        };
        Insert: {
          claimed_at: string;
          expires_at: string;
          job: string;
          run_id: string;
        };
        Update: {
          claimed_at?: string;
          expires_at?: string;
          job?: string;
          run_id?: string;
        };
        Relationships: [];
      };
      sources: {
        Row: {
          created_at: string;
          description: string;
          etag: string | null;
          focus: string;
          followers: number | null;
          id: string;
          items_per_week: number | null;
          kind: string;
          lang: string;
          last_fetched_at: string | null;
          last_item_at: string | null;
          last_modified: string | null;
          name: string;
          next_fetch_at: string;
          paused_at: string | null;
          paused_days: number;
          paused_reason: string | null;
          posts_per_day: number | null;
          recent_titles: Json;
          target: string;
          unreadable_streak: number;
          updated_at: string;
          x_user_id: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string;
          etag?: string | null;
          focus?: string;
          followers?: number | null;
          id: string;
          items_per_week?: number | null;
          kind: string;
          lang?: string;
          last_fetched_at?: string | null;
          last_item_at?: string | null;
          last_modified?: string | null;
          name: string;
          next_fetch_at?: string;
          paused_at?: string | null;
          paused_days?: number;
          paused_reason?: string | null;
          posts_per_day?: number | null;
          recent_titles?: Json;
          target: string;
          unreadable_streak?: number;
          updated_at?: string;
          x_user_id?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string;
          etag?: string | null;
          focus?: string;
          followers?: number | null;
          id?: string;
          items_per_week?: number | null;
          kind?: string;
          lang?: string;
          last_fetched_at?: string | null;
          last_item_at?: string | null;
          last_modified?: string | null;
          name?: string;
          next_fetch_at?: string;
          paused_at?: string | null;
          paused_days?: number;
          paused_reason?: string | null;
          posts_per_day?: number | null;
          recent_titles?: Json;
          target?: string;
          unreadable_streak?: number;
          updated_at?: string;
          x_user_id?: string | null;
        };
        Relationships: [];
      };
      stories: {
        Row: {
          alerted_at: string | null;
          card: Json | null;
          created_at: string;
          fallback_title: string;
          headline: string | null;
          id: string;
          image: string | null;
          last_changed_at: string;
          last_published_at: string;
          monitor_id: string | null;
          opened_at: string;
          status: string;
          version: number;
        };
        Insert: {
          alerted_at?: string | null;
          card?: Json | null;
          created_at?: string;
          fallback_title: string;
          headline?: string | null;
          id?: string;
          image?: string | null;
          last_changed_at: string;
          last_published_at: string;
          monitor_id?: string | null;
          opened_at: string;
          status: string;
          version?: number;
        };
        Update: {
          alerted_at?: string | null;
          card?: Json | null;
          created_at?: string;
          fallback_title?: string;
          headline?: string | null;
          id?: string;
          image?: string | null;
          last_changed_at?: string;
          last_published_at?: string;
          monitor_id?: string | null;
          opened_at?: string;
          status?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "stories_monitor_id_fkey";
            columns: ["monitor_id"];
            isOneToOne: false;
            referencedRelation: "monitors";
            referencedColumns: ["id"];
          },
        ];
      };
      story_items: {
        Row: {
          added_at: string;
          adds_score: number | null;
          item_id: string;
          join_score: number | null;
          role: string;
          story_id: string;
        };
        Insert: {
          added_at?: string;
          adds_score?: number | null;
          item_id: string;
          join_score?: number | null;
          role: string;
          story_id: string;
        };
        Update: {
          added_at?: string;
          adds_score?: number | null;
          item_id?: string;
          join_score?: number | null;
          role?: string;
          story_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "story_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_items_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      stripe_events: {
        Row: {
          error: string | null;
          id: string;
          processed_at: string | null;
          processing_until: string | null;
          received_at: string;
          type: string;
        };
        Insert: {
          error?: string | null;
          id: string;
          processed_at?: string | null;
          processing_until?: string | null;
          received_at?: string;
          type: string;
        };
        Update: {
          error?: string | null;
          id?: string;
          processed_at?: string | null;
          processing_until?: string | null;
          received_at?: string;
          type?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admit_build: {
        Args: {
          p_alert_timezone: string;
          p_beat: string;
          p_display_handle: string;
          p_handle: string;
          p_lease_seconds: number;
          p_run_id: string;
          p_user_id: string;
          p_x_user_id?: string;
        };
        Returns: {
          handle: string;
          monitor_id: string;
          outcome: string;
        }[];
      };
      apply_bot_command: {
        Args: {
          p_command: string;
          p_event_id: string;
          p_sender_x_user_id: string;
        };
        Returns: {
          changed: boolean;
          monitor_id: string;
        }[];
      };
      attach_sightings: {
        Args: {
          p_monitor_ids: string[];
          p_new_item_ids: string[];
          p_seen_item_ids: string[];
          p_source: string;
        };
        Returns: undefined;
      };
      claim_build: {
        Args: { p_lease_seconds: number; p_monitor: string; p_run_id: string };
        Returns: boolean;
      };
      claim_run: {
        Args: { p_job: string; p_run_id: string; p_ttl_seconds: number };
        Returns: boolean;
      };
      complete_build: {
        Args: {
          p_accounts: Json;
          p_brief: Json;
          p_monitor: string;
          p_monitor_sources: Json;
          p_new_sources: Json;
          p_profile: Json;
          p_run_id: string;
          p_x_user_id: string;
        };
        Returns: string;
      };
      confirm_build_identity: {
        Args: {
          p_build_state: Json;
          p_display_handle: string;
          p_monitor: string;
          p_run_id: string;
          p_x_user_id: string;
        };
        Returns: string;
      };
      debit_posts: {
        Args: { p_item_ids: string[]; p_monitor: string };
        Returns: {
          attached: string[];
          paused: boolean;
          remaining: number;
        }[];
      };
      expire_unconfirmed_build: {
        Args: { p_monitor: string; p_run_id: string };
        Returns: boolean;
      };
      release_build: {
        Args: { p_monitor: string; p_run_id: string };
        Returns: boolean;
      };
      release_run: {
        Args: { p_job: string; p_run_id: string };
        Returns: undefined;
      };
      reserve_cost: {
        Args: {
          p_kind: string;
          p_monitor: string;
          p_run: string;
          p_service: string;
          p_source: string;
          p_usd: number;
        };
        Returns: number;
      };
      user_id_by_email: { Args: { p_email: string }; Returns: string };
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
