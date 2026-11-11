export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      book_clubs: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "book_clubs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      book_options: {
        Row: {
          added_by: string | null;
          book_id: string | null;
          created_at: string | null;
          description_override: string | null;
          id: string;
          meeting_id: string | null;
          nomination_note: string | null;
          page_count_override: number | null;
        };
        ComputedFields: never;
        Insert: {
          added_by?: string | null;
          book_id?: string | null;
          created_at?: string | null;
          description_override?: string | null;
          id?: string;
          meeting_id?: string | null;
          nomination_note?: string | null;
          page_count_override?: number | null;
        };
        Update: {
          added_by?: string | null;
          book_id?: string | null;
          created_at?: string | null;
          description_override?: string | null;
          id?: string;
          meeting_id?: string | null;
          nomination_note?: string | null;
          page_count_override?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "book_options_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "book_options_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "book_options_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      books: {
        Row: {
          author: string;
          cover_url: string | null;
          created_at: string | null;
          description: string | null;
          external_id: string | null;
          external_source: string | null;
          google_books_id: string | null;
          id: string;
          isbn: string | null;
          page_count: number | null;
          published_year: number | null;
          title: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          author: string;
          cover_url?: string | null;
          created_at?: string | null;
          description?: string | null;
          external_id?: string | null;
          external_source?: string | null;
          google_books_id?: string | null;
          id?: string;
          isbn?: string | null;
          page_count?: number | null;
          published_year?: number | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          author?: string;
          cover_url?: string | null;
          created_at?: string | null;
          description?: string | null;
          external_id?: string | null;
          external_source?: string | null;
          google_books_id?: string | null;
          id?: string;
          isbn?: string | null;
          page_count?: number | null;
          published_year?: number | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      calendar_feed_tokens: {
        Row: {
          book_club_id: string;
          created_at: string;
          token: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          book_club_id: string;
          created_at?: string;
          token: string;
          user_id: string;
        };
        Update: {
          book_club_id?: string;
          created_at?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_feed_tokens_book_club_id_fkey";
            columns: ["book_club_id"];
            isOneToOne: false;
            referencedRelation: "book_clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_feed_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      invite_links: {
        Row: {
          book_club_id: string;
          code: string;
          created_at: string | null;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          is_active: boolean | null;
        };
        ComputedFields: never;
        Insert: {
          book_club_id: string;
          code: string;
          created_at?: string | null;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
        };
        Update: {
          book_club_id?: string;
          code?: string;
          created_at?: string | null;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "invite_links_book_club_id_fkey";
            columns: ["book_club_id"];
            isOneToOne: false;
            referencedRelation: "book_clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invite_links_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_ranked_votes: {
        Row: {
          book_option_id: string;
          created_at: string | null;
          id: string;
          meeting_id: string;
          rank: number;
          updated_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          book_option_id: string;
          created_at?: string | null;
          id?: string;
          meeting_id: string;
          rank: number;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          book_option_id?: string;
          created_at?: string | null;
          id?: string;
          meeting_id?: string;
          rank?: number;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_ranked_votes_book_option_id_fkey";
            columns: ["book_option_id"];
            isOneToOne: false;
            referencedRelation: "book_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_ranked_votes_book_option_id_fkey";
            columns: ["book_option_id"];
            isOneToOne: false;
            referencedRelation: "view_vote_counts";
            referencedColumns: ["book_option_id"];
          },
          {
            foreignKeyName: "meeting_ranked_votes_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_ranked_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_voting_preferences: {
        Row: {
          created_at: string | null;
          id: string;
          meeting_id: string;
          updated_at: string | null;
          user_id: string;
          voting_method: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          id?: string;
          meeting_id: string;
          updated_at?: string | null;
          user_id: string;
          voting_method?: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          meeting_id?: string;
          updated_at?: string | null;
          user_id?: string;
          voting_method?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_voting_preferences_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_voting_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      meetings: {
        Row: {
          book_club_id: string | null;
          created_at: string | null;
          details: string | null;
          finalized_at: string | null;
          finalized_by: string | null;
          id: string;
          is_finalized: boolean | null;
          meeting_date: string;
          nomination_deadline: string | null;
          selected_book_id: string | null;
          theme_id: string | null;
          updated_at: string | null;
          voting_deadline: string | null;
        };
        ComputedFields: never;
        Insert: {
          book_club_id?: string | null;
          created_at?: string | null;
          details?: string | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          id?: string;
          is_finalized?: boolean | null;
          meeting_date: string;
          nomination_deadline?: string | null;
          selected_book_id?: string | null;
          theme_id?: string | null;
          updated_at?: string | null;
          voting_deadline?: string | null;
        };
        Update: {
          book_club_id?: string | null;
          created_at?: string | null;
          details?: string | null;
          finalized_at?: string | null;
          finalized_by?: string | null;
          id?: string;
          is_finalized?: boolean | null;
          meeting_date?: string;
          nomination_deadline?: string | null;
          selected_book_id?: string | null;
          theme_id?: string | null;
          updated_at?: string | null;
          voting_deadline?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meetings_book_club_id_fkey";
            columns: ["book_club_id"];
            isOneToOne: false;
            referencedRelation: "book_clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetings_finalized_by_fkey";
            columns: ["finalized_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetings_selected_book_id_fkey";
            columns: ["selected_book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetings_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetings_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "view_theme_vote_counts";
            referencedColumns: ["theme_id"];
          },
        ];
      };
      members: {
        Row: {
          book_club_id: string | null;
          id: string;
          is_admin: boolean | null;
          joined_at: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          book_club_id?: string | null;
          id?: string;
          is_admin?: boolean | null;
          joined_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          book_club_id?: string | null;
          id?: string;
          is_admin?: boolean | null;
          joined_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "members_book_club_id_fkey";
            columns: ["book_club_id"];
            isOneToOne: false;
            referencedRelation: "book_clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      mobile_sessions: {
        Row: {
          created_at: string;
          device_name: string | null;
          id: string;
          last_used_at: string;
          previous_token_hash: string | null;
          refresh_token_hash: string;
          revoked_at: string | null;
          rotated_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          device_name?: string | null;
          id?: string;
          last_used_at?: string;
          previous_token_hash?: string | null;
          refresh_token_hash: string;
          revoked_at?: string | null;
          rotated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          device_name?: string | null;
          id?: string;
          last_used_at?: string;
          previous_token_hash?: string | null;
          refresh_token_hash?: string;
          revoked_at?: string | null;
          rotated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mobile_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      personal_rankings: {
        Row: {
          book_club_id: string | null;
          book_id: string | null;
          created_at: string | null;
          id: string;
          rank: number | null;
          updated_at: string | null;
          user_id: string | null;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          book_club_id?: string | null;
          book_id?: string | null;
          created_at?: string | null;
          id?: string;
          rank?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
          year: number;
        };
        Update: {
          book_club_id?: string | null;
          book_id?: string | null;
          created_at?: string | null;
          id?: string;
          rank?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "personal_rankings_book_club_id_fkey";
            columns: ["book_club_id"];
            isOneToOne: false;
            referencedRelation: "book_clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "personal_rankings_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "personal_rankings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limits: {
        Row: {
          count: number;
          key: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          count?: number;
          key: string;
          window_start: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      theme_votes: {
        Row: {
          created_at: string | null;
          id: string;
          theme_id: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          id?: string;
          theme_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          theme_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "theme_votes_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "theme_votes_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "view_theme_vote_counts";
            referencedColumns: ["theme_id"];
          },
          {
            foreignKeyName: "theme_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      themes: {
        Row: {
          book_club_id: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          submitted_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          book_club_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          submitted_by?: string | null;
        };
        Update: {
          book_club_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          submitted_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "themes_book_club_id_fkey";
            columns: ["book_club_id"];
            isOneToOne: false;
            referencedRelation: "book_clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "themes_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_libraries: {
        Row: {
          created_at: string;
          library_key: string;
          name: string;
          position: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          library_key: string;
          name: string;
          position: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          library_key?: string;
          name?: string;
          position?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_libraries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string;
          google_id: string | null;
          id: string;
          is_super_admin: boolean;
          name: string;
          password_hash: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          google_id?: string | null;
          id?: string;
          is_super_admin?: boolean;
          name: string;
          password_hash?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          google_id?: string | null;
          id?: string;
          is_super_admin?: boolean;
          name?: string;
          password_hash?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          book_option_id: string | null;
          created_at: string | null;
          id: string;
          updated_at: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          book_option_id?: string | null;
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          book_option_id?: string | null;
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "votes_book_option_id_fkey";
            columns: ["book_option_id"];
            isOneToOne: false;
            referencedRelation: "book_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_book_option_id_fkey";
            columns: ["book_option_id"];
            isOneToOne: false;
            referencedRelation: "view_vote_counts";
            referencedColumns: ["book_option_id"];
          },
          {
            foreignKeyName: "votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      view_theme_vote_counts: {
        Row: {
          book_club_id: string | null;
          name: string | null;
          theme_id: string | null;
          vote_count: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "themes_book_club_id_fkey";
            columns: ["book_club_id"];
            isOneToOne: false;
            referencedRelation: "book_clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      view_vote_counts: {
        Row: {
          book_id: string | null;
          book_option_id: string | null;
          meeting_id: string | null;
          vote_count: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "book_options_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "book_options_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      assert_meeting_voting_open: {
        Args: { p_meeting_id: string; p_user_id: string };
        Returns: string;
      };
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      create_book_club: {
        Args: { p_creator_id: string; p_description?: string; p_name: string };
        Returns: string;
      };
      delete_book_club: {
        Args: {
          p_actor_id: string;
          p_book_club_id: string;
          p_confirmation_name: string;
        };
        Returns: undefined;
      };
      remove_club_member: {
        Args: { p_book_club_id: string; p_user_id: string };
        Returns: boolean;
      };
      save_meeting_ranked_votes: {
        Args: { p_meeting_id: string; p_rankings: Json; p_user_id: string };
        Returns: undefined;
      };
      save_year_rankings: {
        Args: {
          p_book_club_id: string;
          p_ranked: Json;
          p_unread: string[];
          p_user_id: string;
          p_year: number;
        };
        Returns: undefined;
      };
      set_meeting_voting_method: {
        Args: { p_meeting_id: string; p_method: string; p_user_id: string };
        Returns: undefined;
      };
      set_member_admin: {
        Args: {
          p_book_club_id: string;
          p_is_admin: boolean;
          p_user_id: string;
        };
        Returns: boolean;
      };
      set_user_libraries: {
        Args: { p_libraries: Json; p_user_id: string };
        Returns: undefined;
      };
      toggle_book_vote: {
        Args: { p_book_option_id: string; p_user_id: string };
        Returns: boolean;
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

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
