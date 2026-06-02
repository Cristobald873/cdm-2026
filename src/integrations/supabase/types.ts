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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          match_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          match_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          match_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      group_results: {
        Row: {
          group_letter: string
          qualified_1: string | null
          qualified_2: string | null
          updated_at: string
        }
        Insert: {
          group_letter: string
          qualified_1?: string | null
          qualified_2?: string | null
          updated_at?: string
        }
        Update: {
          group_letter?: string
          qualified_1?: string | null
          qualified_2?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          away_team: string
          group_letter: string | null
          home_team: string
          id: string
          kickoff_at: string
          match_number: number | null
          penalty_winner: string | null
          real_away_score: number | null
          real_away_score_90: number | null
          real_away_score_aet: number | null
          real_away_score_pens: number | null
          real_home_score: number | null
          real_home_score_90: number | null
          real_home_score_aet: number | null
          real_home_score_pens: number | null
          stage: Database["public"]["Enums"]["match_stage"]
          teams_confirmed: boolean
          venue: string | null
          went_to_aet: boolean
          went_to_penalties: boolean
        }
        Insert: {
          away_team: string
          group_letter?: string | null
          home_team: string
          id: string
          kickoff_at: string
          match_number?: number | null
          penalty_winner?: string | null
          real_away_score?: number | null
          real_away_score_90?: number | null
          real_away_score_aet?: number | null
          real_away_score_pens?: number | null
          real_home_score?: number | null
          real_home_score_90?: number | null
          real_home_score_aet?: number | null
          real_home_score_pens?: number | null
          stage: Database["public"]["Enums"]["match_stage"]
          teams_confirmed?: boolean
          venue?: string | null
          went_to_aet?: boolean
          went_to_penalties?: boolean
        }
        Update: {
          away_team?: string
          group_letter?: string | null
          home_team?: string
          id?: string
          kickoff_at?: string
          match_number?: number | null
          penalty_winner?: string | null
          real_away_score?: number | null
          real_away_score_90?: number | null
          real_away_score_aet?: number | null
          real_away_score_pens?: number | null
          real_home_score?: number | null
          real_home_score_90?: number | null
          real_home_score_aet?: number | null
          real_home_score_pens?: number | null
          stage?: Database["public"]["Enums"]["match_stage"]
          teams_confirmed?: boolean
          venue?: string | null
          went_to_aet?: boolean
          went_to_penalties?: boolean
        }
        Relationships: []
      }
      notifications_sent: {
        Row: {
          id: string
          kind: string
          ref_id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          kind: string
          ref_id: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          kind?: string
          ref_id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pre_tournament_predictions: {
        Row: {
          group_letter: string
          id: string
          points_earned: number | null
          qualified_1: string | null
          qualified_2: string | null
          top_scorer: string | null
          tournament_winner: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          group_letter: string
          id?: string
          points_earned?: number | null
          qualified_1?: string | null
          qualified_2?: string | null
          top_scorer?: string | null
          tournament_winner?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          group_letter?: string
          id?: string
          points_earned?: number | null
          qualified_1?: string | null
          qualified_2?: string | null
          top_scorer?: string | null
          tournament_winner?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_tournament_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          created_at: string
          id: string
          match_id: string
          points_earned: number | null
          pred_away: number
          pred_home: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          points_earned?: number | null
          pred_away: number
          pred_home: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          points_earned?: number | null
          pred_away?: number
          pred_home?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string
          color: string
          created_at: string
          id: string
          is_admin: boolean
          pseudo: string
        }
        Insert: {
          avatar?: string
          color?: string
          created_at?: string
          id: string
          is_admin?: boolean
          pseudo: string
        }
        Update: {
          avatar?: string
          color?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          pseudo?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tournament_settings: {
        Row: {
          id: number
          real_top_scorer: string | null
          real_winner: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          real_top_scorer?: string | null
          real_winner?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          real_top_scorer?: string | null
          real_winner?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_match_points: {
        Args: {
          _pred_away: number
          _pred_home: number
          _real_away: number
          _real_home: number
          _stage: Database["public"]["Enums"]["match_stage"]
        }
        Returns: number
      }
      get_match_pred_stats: {
        Args: never
        Returns: {
          away_wins: number
          draws: number
          home_wins: number
          match_id: string
          total: number
        }[]
      }
      is_admin: { Args: { _uid: string }; Returns: boolean }
      pre_tournament_locked: { Args: never; Returns: boolean }
      stage_multiplier: {
        Args: { _stage: Database["public"]["Enums"]["match_stage"] }
        Returns: number
      }
    }
    Enums: {
      match_stage: "GROUP" | "R32" | "R16" | "QF" | "SF" | "THIRD" | "FINAL"
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
      match_stage: ["GROUP", "R32", "R16", "QF", "SF", "THIRD", "FINAL"],
    },
  },
} as const
