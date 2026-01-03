export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          phone: string | null;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          onboarding_completed: boolean;
          account_status: "pending_verification" | "active" | "suspended" | "deleted";
          email_verified: boolean;
          phone_verified: boolean;
          password_hash: string | null;
          role: "user" | "admin" | "test" | null;
          failed_login_attempts: number;
          locked_until: string | null;
          last_login_at: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          phone?: string | null;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          account_status?: "pending_verification" | "active" | "suspended" | "deleted";
          email_verified?: boolean;
          phone_verified?: boolean;
          password_hash?: string | null;
          role?: "user" | "admin" | "test" | null;
          failed_login_attempts?: number;
          locked_until?: string | null;
          last_login_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          account_status?: "pending_verification" | "active" | "suspended" | "deleted";
          email_verified?: boolean;
          phone_verified?: boolean;
          password_hash?: string | null;
          role?: "user" | "admin" | "test" | null;
          failed_login_attempts?: number;
          locked_until?: string | null;
          last_login_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pending_signups: {
        Row: {
          id: string;
          username: string;
          email: string | null;
          phone: string | null;
          password_hash: string;
          idempotency_key: string;
          attempts: number;
          max_attempts: number;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          email?: string | null;
          phone?: string | null;
          password_hash: string;
          idempotency_key: string;
          attempts?: number;
          max_attempts?: number;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string | null;
          phone?: string | null;
          password_hash?: string;
          idempotency_key?: string;
          attempts?: number;
          max_attempts?: number;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      otp_codes: {
        Row: {
          id: string;
          identifier: string;
          identifier_type: "email" | "phone";
          code_hash: string;
          purpose: "signup_verification" | "login" | "password_reset";
          expires_at: string;
          attempts: number;
          max_attempts: number;
          used: boolean;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          identifier: string;
          identifier_type: "email" | "phone";
          code_hash: string;
          purpose: "signup_verification" | "login" | "password_reset";
          expires_at: string;
          attempts?: number;
          max_attempts?: number;
          used?: boolean;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          identifier?: string;
          identifier_type?: "email" | "phone";
          code_hash?: string;
          purpose?: "signup_verification" | "login" | "password_reset";
          expires_at?: string;
          attempts?: number;
          max_attempts?: number;
          used?: boolean;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      otp_rate_limits: {
        Row: {
          id: string;
          identifier: string;
          action: string;
          count: number;
          window_start: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          identifier: string;
          action: string;
          count?: number;
          window_start: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          identifier?: string;
          action?: string;
          count?: number;
          window_start?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      auth_sessions: {
        Row: {
          id: string;
          user_id: string;
          refresh_token_hash: string;
          device_info: Json | null;
          ip_address: string | null;
          expires_at: string;
          revoked: boolean;
          revoked_at: string | null;
          last_used_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          refresh_token_hash: string;
          device_info?: Json | null;
          ip_address?: string | null;
          expires_at: string;
          revoked?: boolean;
          revoked_at?: string | null;
          last_used_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          refresh_token_hash?: string;
          device_info?: Json | null;
          ip_address?: string | null;
          expires_at?: string;
          revoked?: boolean;
          revoked_at?: string | null;
          last_used_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: "free" | "basic" | "pro" | "enterprise";
          status: "active" | "past_due" | "canceled" | "expired" | "trialing";
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          crypto_wallet_address: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          ended_at: string | null;
          trial_end: string | null;
          pending_plan: "free" | "basic" | "pro" | "enterprise" | null;
          pending_plan_effective_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan: "free" | "basic" | "pro" | "enterprise";
          status: "active" | "past_due" | "canceled" | "expired" | "trialing";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          crypto_wallet_address?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          ended_at?: string | null;
          trial_end?: string | null;
          pending_plan?: "free" | "basic" | "pro" | "enterprise" | null;
          pending_plan_effective_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan?: "free" | "basic" | "pro" | "enterprise";
          status?: "active" | "past_due" | "canceled" | "expired" | "trialing";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          crypto_wallet_address?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          ended_at?: string | null;
          trial_end?: string | null;
          pending_plan?: "free" | "basic" | "pro" | "enterprise" | null;
          pending_plan_effective_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscription_events: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string;
          event_type: string;
          from_plan: "free" | "basic" | "pro" | "enterprise" | null;
          to_plan: "free" | "basic" | "pro" | "enterprise" | null;
          amount_cents: number | null;
          currency: string;
          payment_method: "stripe" | "crypto" | "manual" | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id: string;
          event_type: string;
          from_plan?: "free" | "basic" | "pro" | "enterprise" | null;
          to_plan?: "free" | "basic" | "pro" | "enterprise" | null;
          amount_cents?: number | null;
          currency?: string;
          payment_method?: "stripe" | "crypto" | "manual" | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_id?: string;
          event_type?: string;
          from_plan?: "free" | "basic" | "pro" | "enterprise" | null;
          to_plan?: "free" | "basic" | "pro" | "enterprise" | null;
          amount_cents?: number | null;
          currency?: string;
          payment_method?: "stripe" | "crypto" | "manual" | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      token_balances: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          subscription_tokens: number;
          subscription_tokens_reset_at: string | null;
          purchased_tokens: number;
          free_daily_tokens: number;
          free_daily_tokens_reset_at: string | null;
          lifetime_earned: number;
          lifetime_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          subscription_tokens?: number;
          subscription_tokens_reset_at?: string | null;
          purchased_tokens?: number;
          free_daily_tokens?: number;
          free_daily_tokens_reset_at?: string | null;
          lifetime_earned?: number;
          lifetime_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          balance?: number;
          subscription_tokens?: number;
          subscription_tokens_reset_at?: string | null;
          purchased_tokens?: number;
          free_daily_tokens?: number;
          free_daily_tokens_reset_at?: string | null;
          lifetime_earned?: number;
          lifetime_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      token_pools: {
        Row: {
          id: string;
          user_id: string;
          source_type: "free" | "subscription" | "purchase" | "admin" | "expiration" | "rollover";
          amount: number;
          remaining: number;
          expires_at: string | null;
          rollover_eligible: boolean;
          reference_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_type: "free" | "subscription" | "purchase" | "admin" | "expiration" | "rollover";
          amount: number;
          remaining: number;
          expires_at?: string | null;
          rollover_eligible?: boolean;
          reference_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_type?: "free" | "subscription" | "purchase" | "admin" | "expiration" | "rollover";
          amount?: number;
          remaining?: number;
          expires_at?: string | null;
          rollover_eligible?: boolean;
          reference_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      token_ledger: {
        Row: {
          id: string;
          user_id: string;
          pool_id: string | null;
          amount: number;
          balance_after: number;
          action: string;
          description: string | null;
          reference_type: string | null;
          reference_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          pool_id?: string | null;
          amount: number;
          balance_after: number;
          action: string;
          description?: string | null;
          reference_type?: string | null;
          reference_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          pool_id?: string | null;
          amount?: number;
          balance_after?: number;
          action?: string;
          description?: string | null;
          reference_type?: string | null;
          reference_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      character_dna: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          avatar_url: string | null;
          status: "active" | "archived" | "deleted";
          is_demo: boolean;
          is_public: boolean;
          version: number;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          avatar_url?: string | null;
          status?: "active" | "archived" | "deleted";
          is_demo?: boolean;
          is_public?: boolean;
          version?: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          avatar_url?: string | null;
          status?: "active" | "archived" | "deleted";
          is_demo?: boolean;
          is_public?: boolean;
          version?: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dna_traits: {
        Row: {
          id: string;
          character_id: string;
          category: "core" | "emotional" | "cognitive" | "social" | "behavioral";
          trait_key: string;
          trait_value: number;
          influence_weight: number;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          character_id: string;
          category: "core" | "emotional" | "cognitive" | "social" | "behavioral";
          trait_key: string;
          trait_value: number;
          influence_weight?: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          character_id?: string;
          category?: "core" | "emotional" | "cognitive" | "social" | "behavioral";
          trait_key?: string;
          trait_value?: number;
          influence_weight?: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dna_versions: {
        Row: {
          id: string;
          character_id: string;
          version: number;
          traits_snapshot: Json;
          change_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          character_id: string;
          version: number;
          traits_snapshot: Json;
          change_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          character_id?: string;
          version?: number;
          traits_snapshot?: Json;
          change_reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          character_id: string;
          title: string | null;
          is_active: boolean;
          tokens_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          character_id: string;
          title?: string | null;
          is_active?: boolean;
          tokens_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          character_id?: string;
          title?: string | null;
          is_active?: boolean;
          tokens_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          tokens_used: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          tokens_used?: number;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          tokens_used?: number;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      simulations: {
        Row: {
          id: string;
          user_id: string;
          character_ids: string[];
          scenario: string;
          status: "pending" | "running" | "completed" | "failed";
          result: Json | null;
          tokens_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          character_ids: string[];
          scenario: string;
          status?: "pending" | "running" | "completed" | "failed";
          result?: Json | null;
          tokens_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          character_ids?: string[];
          scenario?: string;
          status?: "pending" | "running" | "completed" | "failed";
          result?: Json | null;
          tokens_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      account_status: "pending_verification" | "active" | "suspended" | "deleted";
      user_role: "user" | "admin" | "test";
      otp_purpose: "signup_verification" | "login" | "password_reset";
      identifier_type: "email" | "phone";
      subscription_plan: "free" | "basic" | "pro" | "enterprise";
      subscription_status: "active" | "past_due" | "canceled" | "expired" | "trialing";
      payment_method: "stripe" | "crypto" | "manual";
      token_source: "free" | "subscription" | "purchase" | "admin" | "expiration" | "rollover";
      token_action: "chat" | "create_character" | "character_edit" | "dna_edit" | "dna_edit_advanced" | "simulation_basic" | "simulation_advanced" | "fine_tune" | "api_call" | "grant" | "revoke" | "expire" | "rollover";
      trait_category: "core" | "emotional" | "cognitive" | "social" | "behavioral";
      character_status: "active" | "archived" | "deleted";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions]["Row"]
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions]["Insert"]
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions]["Update"]
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never;
