export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string;
          customer: string;
          total: number;
          boleto_url: string | null;
          boleto_digitable_line: string | null;
          boleto_barcode_number: string | null;
          boleto_id: string | null;
          boleto_expiration_date: string | null;
          customer_signature: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
      };

      company_integrations: {
        Row: {
          company_id: string;
          provider: "mercado_pago" | "stripe"; // adicione outros se tiver
          access_token: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["company_integrations"]["Row"]
        >;
        Update: Partial<
          Database["public"]["Tables"]["company_integrations"]["Row"]
        >;
      };

      company_users: {
        Row: {
          user_id: string;
          company_id: string;
          role?: string;
        };
        Insert: Partial<Database["public"]["Tables"]["company_users"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_users"]["Row"]>;
      };

      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          avatar: string | null;
          phone: string | null;
          created_at?: string;
          abandon_step_1_sent_at?: string | null;
          abandon_step_2_sent_at?: string | null;
          abandon_step_3_sent_at?: string | null;
          is_super_admin?: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };

      companies: {
        Row: {
          id: string;
          name: string;
        };
        Insert: Partial<Database["public"]["Tables"]["companies"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["companies"]["Row"]>;
      };
    };
  };
}
