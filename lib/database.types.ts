export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: { id: string; display_name: string; created_at: string };
        Insert: { id: string; display_name: string; created_at?: string };
        Update: { display_name?: string };
        Relationships: [];
      };
      handover_events: {
        Row: {
          id: string;
          title: string;
          event_date: string;
          details: string;
          status: "open" | "closed";
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          event_date: string;
          details: string;
          status?: "open" | "closed";
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          event_date?: string;
          details?: string;
          status?: "open" | "closed";
          updated_at?: string;
        };
        Relationships: [];
      };
      handover_event_updates: {
        Row: { id: string; event_id: string; author_id: string; body: string; created_at: string };
        Insert: { id?: string; event_id: string; author_id: string; body: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_handover_event: {
        Args: { p_title: string; p_event_date: string; p_details: string };
        Returns: string;
      };
      update_handover_event: {
        Args: {
          p_event_id: string;
          p_title: string;
          p_event_date: string;
          p_details: string;
          p_status: "open" | "closed";
          p_body: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
