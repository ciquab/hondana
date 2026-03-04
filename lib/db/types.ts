export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      badges: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      books: {
        Row: {
          author: string | null
          cover_url: string | null
          created_at: string
          id: string
          isbn13: string | null
          title: string
        }
        Insert: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          isbn13?: string | null
          title: string
        }
        Update: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          isbn13?: string | null
          title?: string
        }
        Relationships: []
      }
      child_auth_methods: {
        Row: {
          child_id: string
          created_at: string
          id: string
          illustration_secret: string | null
          pin_failed_count: number
          pin_hash: string | null
          pin_locked_until: string | null
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          illustration_secret?: string | null
          pin_failed_count?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          illustration_secret?: string | null
          pin_failed_count?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_auth_methods_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      child_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          child_id: string
          id: string
          source_record_id: string | null
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          child_id: string
          id?: string
          source_record_id?: string | null
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          child_id?: string
          id?: string
          source_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_badges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_badges_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "reading_records"
            referencedColumns: ["id"]
          },
        ]
      }
      child_message_views: {
        Row: {
          child_id: string
          comment_id: string
          id: string
          viewed_at: string
        }
        Insert: {
          child_id: string
          comment_id: string
          id?: string
          viewed_at?: string
        }
        Update: {
          child_id?: string
          comment_id?: string
          id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_message_views_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_message_views_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "record_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          birth_year: number | null
          created_at: string
          display_name: string
          family_id: string
          id: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          display_name: string
          family_id: string
          id?: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          display_name?: string
          family_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      family_invites: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          family_id: string
          id: string
          invite_code: string
          revoked_at: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          family_id: string
          id?: string
          invite_code: string
          revoked_at?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          family_id?: string
          id?: string
          invite_code?: string
          revoked_at?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_invites_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          family_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_records: {
        Row: {
          book_id: string
          child_id: string
          created_at: string
          created_by: string
          family_id: string
          finished_on: string | null
          id: string
          memo: string | null
          status: string
          updated_at: string
        }
        Insert: {
          book_id: string
          child_id: string
          created_at?: string
          created_by: string
          family_id: string
          finished_on?: string | null
          id?: string
          memo?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          child_id?: string
          created_at?: string
          created_by?: string
          family_id?: string
          finished_on?: string | null
          id?: string
          memo?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_records_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_records_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_records_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      record_comments: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          family_id: string
          id: string
          record_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          family_id: string
          id?: string
          record_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          family_id?: string
          id?: string
          record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_comments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_comments_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "reading_records"
            referencedColumns: ["id"]
          },
        ]
      }
      record_feeling_tags: {
        Row: {
          child_id: string
          created_at: string
          id: string
          record_id: string
          tag: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          record_id: string
          tag: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          record_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_feeling_tags_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_feeling_tags_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "reading_records"
            referencedColumns: ["id"]
          },
        ]
      }
      record_reactions: {
        Row: {
          created_at: string
          emoji: string
          family_id: string
          id: string
          record_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          family_id: string
          id?: string
          record_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          family_id?: string
          id?: string
          record_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_reactions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_reactions_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "reading_records"
            referencedColumns: ["id"]
          },
        ]
      }
      record_reactions_child: {
        Row: {
          child_id: string
          created_at: string
          id: string
          record_id: string
          stamp: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          record_id: string
          stamp: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          record_id?: string
          stamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_reactions_child_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_reactions_child_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "reading_records"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_family_invite: {
        Args: { code: string }
        Returns: string
      }
      create_family_invite: {
        Args: { target_family_id: string }
        Returns: string
      }
      create_family_with_owner: {
        Args: { family_name: string }
        Returns: string
      }
      get_active_family_invites: {
        Args: { target_family_id: string }
        Returns: {
          id: string
          invite_code: string
          expires_at: string
          created_at: string
        }[]
      }
      is_child_in_my_family: {
        Args: { target_child_id: string }
        Returns: boolean
      }
      is_family_member: { Args: { target_family_id: string }; Returns: boolean }
      revoke_family_invite: {
        Args: { target_invite_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
