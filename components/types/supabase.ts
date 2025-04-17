export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];


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
          // outros campos...
        };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
      };
      // outras tabelas se quiser...
    };
  };
}