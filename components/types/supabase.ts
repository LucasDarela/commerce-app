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
        };
        Insert: Partial<Database["public"]["Tables"]["company_users"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_users"]["Row"]>;
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
