// export type Json =
//   | string
//   | number
//   | boolean
//   | null
//   | { [key: string]: Json | undefined }
//   | Json[]

// export type Database = {
//   // Allows to automatically instantiate createClient with right options
//   // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
//   __InternalSupabase: {
//     PostgrestVersion: "12.2.3 (519615d)"
//   }
//   public: {
//     Tables: {
//       bank_accounts: {
//         Row: {
//           account: string
//           agency_name: string | null
//           bank_code: string | null
//           boleto_issuer: string | null
//           branch: string
//           cedent_account: string | null
//           company_code: string | null
//           company_id: string
//           created_at: string | null
//           deleted_at: string | null
//           emits_check: boolean | null
//           final_number: string | null
//           id: string
//           initial_number: string | null
//           interest: string | null
//           late_fee: string | null
//           launch_account: string | null
//           main_account: boolean | null
//           message_1: string | null
//           message_2: string | null
//           message_3: string | null
//           message_4: string | null
//           name: string
//           protest_days: string | null
//           remittance_program: string | null
//           return_program: string | null
//           updated_at: string | null
//           wallet: string | null
//         }
//         Insert: {
//           account: string
//           agency_name?: string | null
//           bank_code?: string | null
//           boleto_issuer?: string | null
//           branch: string
//           cedent_account?: string | null
//           company_code?: string | null
//           company_id: string
//           created_at?: string | null
//           deleted_at?: string | null
//           emits_check?: boolean | null
//           final_number?: string | null
//           id?: string
//           initial_number?: string | null
//           interest?: string | null
//           late_fee?: string | null
//           launch_account?: string | null
//           main_account?: boolean | null
//           message_1?: string | null
//           message_2?: string | null
//           message_3?: string | null
//           message_4?: string | null
//           name: string
//           protest_days?: string | null
//           remittance_program?: string | null
//           return_program?: string | null
//           updated_at?: string | null
//           wallet?: string | null
//         }
//         Update: {
//           account?: string
//           agency_name?: string | null
//           bank_code?: string | null
//           boleto_issuer?: string | null
//           branch?: string
//           cedent_account?: string | null
//           company_code?: string | null
//           company_id?: string
//           created_at?: string | null
//           deleted_at?: string | null
//           emits_check?: boolean | null
//           final_number?: string | null
//           id?: string
//           initial_number?: string | null
//           interest?: string | null
//           late_fee?: string | null
//           launch_account?: string | null
//           main_account?: boolean | null
//           message_1?: string | null
//           message_2?: string | null
//           message_3?: string | null
//           message_4?: string | null
//           name?: string
//           protest_days?: string | null
//           remittance_program?: string | null
//           return_program?: string | null
//           updated_at?: string | null
//           wallet?: string | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "bank_accounts_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       barrel_controls: {
//         Row: {
//           arrived_30: number | null
//           arrived_50: number | null
//           company_id: string
//           created_at: string | null
//           date: string
//           had_30: number | null
//           had_50: number | null
//           id: string
//           note: string | null
//           returned_30: number | null
//           returned_50: number | null
//           supplier_id: string | null
//           total_30: number | null
//           total_50: number | null
//         }
//         Insert: {
//           arrived_30?: number | null
//           arrived_50?: number | null
//           company_id: string
//           created_at?: string | null
//           date: string
//           had_30?: number | null
//           had_50?: number | null
//           id?: string
//           note?: string | null
//           returned_30?: number | null
//           returned_50?: number | null
//           supplier_id?: string | null
//           total_30?: number | null
//           total_50?: number | null
//         }
//         Update: {
//           arrived_30?: number | null
//           arrived_50?: number | null
//           company_id?: string
//           created_at?: string | null
//           date?: string
//           had_30?: number | null
//           had_50?: number | null
//           id?: string
//           note?: string | null
//           returned_30?: number | null
//           returned_50?: number | null
//           supplier_id?: string | null
//           total_30?: number | null
//           total_50?: number | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "barrel_controls_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "barrel_controls_supplier_id_fkey"
//             columns: ["supplier_id"]
//             isOneToOne: false
//             referencedRelation: "suppliers"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       companies: {
//         Row: {
//           address: string | null
//           city: string | null
//           complement: string | null
//           corporate_name: string | null
//           cpf_emitente: string | null
//           created_at: string | null
//           document: string | null
//           email: string | null
//           icon: string | null
//           id: string
//           logo_url: string | null
//           name: string
//           neighborhood: string | null
//           number: number | null
//           phone: string | null
//           regime_tributario: number | null
//           state: string | null
//           state_registration: string | null
//           trade_name: string | null
//           zip_code: string | null
//         }
//         Insert: {
//           address?: string | null
//           city?: string | null
//           complement?: string | null
//           corporate_name?: string | null
//           cpf_emitente?: string | null
//           created_at?: string | null
//           document?: string | null
//           email?: string | null
//           icon?: string | null
//           id?: string
//           logo_url?: string | null
//           name: string
//           neighborhood?: string | null
//           number?: number | null
//           phone?: string | null
//           regime_tributario?: number | null
//           state?: string | null
//           state_registration?: string | null
//           trade_name?: string | null
//           zip_code?: string | null
//         }
//         Update: {
//           address?: string | null
//           city?: string | null
//           complement?: string | null
//           corporate_name?: string | null
//           cpf_emitente?: string | null
//           created_at?: string | null
//           document?: string | null
//           email?: string | null
//           icon?: string | null
//           id?: string
//           logo_url?: string | null
//           name?: string
//           neighborhood?: string | null
//           number?: number | null
//           phone?: string | null
//           regime_tributario?: number | null
//           state?: string | null
//           state_registration?: string | null
//           trade_name?: string | null
//           zip_code?: string | null
//         }
//         Relationships: []
//       }
//       companies_insert_audit: {
//         Row: {
//           app_name: string | null
//           at: string | null
//           id: number
//           jwt: Json | null
//           new_company_id: string | null
//           payload: Json | null
//         }
//         Insert: {
//           app_name?: string | null
//           at?: string | null
//           id?: number
//           jwt?: Json | null
//           new_company_id?: string | null
//           payload?: Json | null
//         }
//         Update: {
//           app_name?: string | null
//           at?: string | null
//           id?: number
//           jwt?: Json | null
//           new_company_id?: string | null
//           payload?: Json | null
//         }
//         Relationships: []
//       }
//       company_integrations: {
//         Row: {
//           access_token: string
//           company_id: string
//           created_at: string | null
//           env: string | null
//           id: string
//           provider: string
//           webhook_token: string | null
//         }
//         Insert: {
//           access_token: string
//           company_id: string
//           created_at?: string | null
//           env?: string | null
//           id?: string
//           provider: string
//           webhook_token?: string | null
//         }
//         Update: {
//           access_token?: string
//           company_id?: string
//           created_at?: string | null
//           env?: string | null
//           id?: string
//           provider?: string
//           webhook_token?: string | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "company_integrations_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       company_users: {
//         Row: {
//           company_id: string
//           created_at: string | null
//           id: string
//           role: string | null
//           user_id: string
//         }
//         Insert: {
//           company_id: string
//           created_at?: string | null
//           id?: string
//           role?: string | null
//           user_id: string
//         }
//         Update: {
//           company_id?: string
//           created_at?: string | null
//           id?: string
//           role?: string | null
//           user_id?: string
//         }
//         Relationships: [
//           {
//             foreignKeyName: "company_users_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "company_users_user_id_fkey"
//             columns: ["user_id"]
//             isOneToOne: false
//             referencedRelation: "profiles"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       customers: {
//         Row: {
//           address: string | null
//           asaas_customer_id: string | null
//           city: string | null
//           company_id: string
//           complement: string | null
//           created_at: string | null
//           document: string | null
//           email: string | null
//           emit_nf: boolean | null
//           fantasy_name: string | null
//           id: string
//           name: string | null
//           neighborhood: string | null
//           number: number | null
//           phone: string | null
//           price_table_id: string
//           state: string | null
//           state_registration: string | null
//           type: string
//           zip_code: string | null
//         }
//         Insert: {
//           address?: string | null
//           asaas_customer_id?: string | null
//           city?: string | null
//           company_id: string
//           complement?: string | null
//           created_at?: string | null
//           document?: string | null
//           email?: string | null
//           emit_nf?: boolean | null
//           fantasy_name?: string | null
//           id?: string
//           name?: string | null
//           neighborhood?: string | null
//           number?: number | null
//           phone?: string | null
//           price_table_id: string
//           state?: string | null
//           state_registration?: string | null
//           type?: string
//           zip_code?: string | null
//         }
//         Update: {
//           address?: string | null
//           asaas_customer_id?: string | null
//           city?: string | null
//           company_id?: string
//           complement?: string | null
//           created_at?: string | null
//           document?: string | null
//           email?: string | null
//           emit_nf?: boolean | null
//           fantasy_name?: string | null
//           id?: string
//           name?: string | null
//           neighborhood?: string | null
//           number?: number | null
//           phone?: string | null
//           price_table_id?: string
//           state?: string | null
//           state_registration?: string | null
//           type?: string
//           zip_code?: string | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "customers_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "customers_price_table_id_fkey"
//             columns: ["price_table_id"]
//             isOneToOne: false
//             referencedRelation: "price_tables"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "fk_company_id"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       email_credentials: {
//         Row: {
//           company_id: string | null
//           created_at: string | null
//           id: string
//           sender_email: string
//           sender_name: string | null
//           sendgrid_api_key: string
//         }
//         Insert: {
//           company_id?: string | null
//           created_at?: string | null
//           id?: string
//           sender_email: string
//           sender_name?: string | null
//           sendgrid_api_key: string
//         }
//         Update: {
//           company_id?: string | null
//           created_at?: string | null
//           id?: string
//           sender_email?: string
//           sender_name?: string | null
//           sendgrid_api_key?: string
//         }
//         Relationships: [
//           {
//             foreignKeyName: "email_credentials_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       equipment_loan_returns: {
//         Row: {
//           company_id: string
//           created_at: string
//           customer_id: string
//           equipment_id: string
//           id: string
//           loan_id: string
//           note_number: string | null
//           previous_quantity: number
//           remaining_quantity: number
//           return_date: string
//           returned_quantity: number
//           user_id: string | null
//         }
//         Insert: {
//           company_id: string
//           created_at?: string
//           customer_id: string
//           equipment_id: string
//           id?: string
//           loan_id: string
//           note_number?: string | null
//           previous_quantity: number
//           remaining_quantity: number
//           return_date?: string
//           returned_quantity: number
//           user_id?: string | null
//         }
//         Update: {
//           company_id?: string
//           created_at?: string
//           customer_id?: string
//           equipment_id?: string
//           id?: string
//           loan_id?: string
//           note_number?: string | null
//           previous_quantity?: number
//           remaining_quantity?: number
//           return_date?: string
//           returned_quantity?: number
//           user_id?: string | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "equipment_loan_returns_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "equipment_loan_returns_customer_id_fkey"
//             columns: ["customer_id"]
//             isOneToOne: false
//             referencedRelation: "customers"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "equipment_loan_returns_equipment_id_fkey"
//             columns: ["equipment_id"]
//             isOneToOne: false
//             referencedRelation: "equipments"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "equipment_loan_returns_loan_id_fkey"
//             columns: ["loan_id"]
//             isOneToOne: false
//             referencedRelation: "equipment_loans"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       equipment_loans: {
//         Row: {
//           company_id: string | null
//           condition_on_loan: string | null
//           condition_on_return: string | null
//           created_at: string | null
//           customer_id: string | null
//           customer_name: string | null
//           equipment_id: string | null
//           id: string
//           loan_date: string
//           note_date: string | null
//           note_number: string | null
//           notes: string | null
//           quantity: number | null
//           return_date: string | null
//           status: string | null
//         }
//         Insert: {
//           company_id?: string | null
//           condition_on_loan?: string | null
//           condition_on_return?: string | null
//           created_at?: string | null
//           customer_id?: string | null
//           customer_name?: string | null
//           equipment_id?: string | null
//           id?: string
//           loan_date: string
//           note_date?: string | null
//           note_number?: string | null
//           notes?: string | null
//           quantity?: number | null
//           return_date?: string | null
//           status?: string | null
//         }
//         Update: {
//           company_id?: string | null
//           condition_on_loan?: string | null
//           condition_on_return?: string | null
//           created_at?: string | null
//           customer_id?: string | null
//           customer_name?: string | null
//           equipment_id?: string | null
//           id?: string
//           loan_date?: string
//           note_date?: string | null
//           note_number?: string | null
//           notes?: string | null
//           quantity?: number | null
//           return_date?: string | null
//           status?: string | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "equipment_loans_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "equipment_loans_customer_id_fkey"
//             columns: ["customer_id"]
//             isOneToOne: false
//             referencedRelation: "customers"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "equipment_loans_equipment_id_fkey"
//             columns: ["equipment_id"]
//             isOneToOne: false
//             referencedRelation: "equipments"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       equipments: {
//         Row: {
//           code: string | null
//           company_id: string
//           created_at: string | null
//           description: string | null
//           id: string
//           is_available: boolean | null
//           name: string
//           status: string | null
//           stock: number | null
//           type: string
//           value: number | null
//         }
//         Insert: {
//           code?: string | null
//           company_id: string
//           created_at?: string | null
//           description?: string | null
//           id?: string
//           is_available?: boolean | null
//           name: string
//           status?: string | null
//           stock?: number | null
//           type: string
//           value?: number | null
//         }
//         Update: {
//           code?: string | null
//           company_id?: string
//           created_at?: string | null
//           description?: string | null
//           id?: string
//           is_available?: boolean | null
//           name?: string
//           status?: string | null
//           stock?: number | null
//           type?: string
//           value?: number | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "equipments_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       financial_equipments: {
//         Row: {
//           created_at: string | null
//           equipment_id: string | null
//           financial_record_id: string | null
//           id: string
//           quantity: number
//           unit_price: number
//         }
//         Insert: {
//           created_at?: string | null
//           equipment_id?: string | null
//           financial_record_id?: string | null
//           id?: string
//           quantity: number
//           unit_price: number
//         }
//         Update: {
//           created_at?: string | null
//           equipment_id?: string | null
//           financial_record_id?: string | null
//           id?: string
//           quantity?: number
//           unit_price?: number
//         }
//         Relationships: [
//           {
//             foreignKeyName: "financial_equipments_equipment_id_fkey"
//             columns: ["equipment_id"]
//             isOneToOne: false
//             referencedRelation: "equipments"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "financial_equipments_financial_record_id_fkey"
//             columns: ["financial_record_id"]
//             isOneToOne: false
//             referencedRelation: "financial_records"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       financial_products: {
//         Row: {
//           company_id: string | null
//           created_at: string | null
//           id: string
//           note_id: string | null
//           product_id: string | null
//           quantity: number | null
//           unit_price: number | null
//         }
//         Insert: {
//           company_id?: string | null
//           created_at?: string | null
//           id?: string
//           note_id?: string | null
//           product_id?: string | null
//           quantity?: number | null
//           unit_price?: number | null
//         }
//         Update: {
//           company_id?: string | null
//           created_at?: string | null
//           id?: string
//           note_id?: string | null
//           product_id?: string | null
//           quantity?: number | null
//           unit_price?: number | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "financial_products_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "financial_products_note_id_fkey"
//             columns: ["note_id"]
//             isOneToOne: false
//             referencedRelation: "financial_records"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "financial_products_product_id_fkey"
//             columns: ["product_id"]
//             isOneToOne: false
//             referencedRelation: "products"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       financial_records: {
//         Row: {
//           amount: number
//           bank_account_id: string | null
//           category: string | null
//           company_id: string
//           created_at: string | null
//           description: string | null
//           due_date: string
//           id: string
//           invoice_number: string | null
//           issue_date: string
//           notes: string | null
//           payment_method: string | null
//           status: string
//           supplier: string
//           supplier_id: string | null
//           total_payed: number | null
//           type: string
//         }
//         Insert: {
//           amount: number
//           bank_account_id?: string | null
//           category?: string | null
//           company_id: string
//           created_at?: string | null
//           description?: string | null
//           due_date: string
//           id?: string
//           invoice_number?: string | null
//           issue_date: string
//           notes?: string | null
//           payment_method?: string | null
//           status?: string
//           supplier: string
//           supplier_id?: string | null
//           total_payed?: number | null
//           type?: string
//         }
//         Update: {
//           amount?: number
//           bank_account_id?: string | null
//           category?: string | null
//           company_id?: string
//           created_at?: string | null
//           description?: string | null
//           due_date?: string
//           id?: string
//           invoice_number?: string | null
//           issue_date?: string
//           notes?: string | null
//           payment_method?: string | null
//           status?: string
//           supplier?: string
//           supplier_id?: string | null
//           total_payed?: number | null
//           type?: string
//         }
//         Relationships: [
//           {
//             foreignKeyName: "financial_records_bank_account_id_fkey"
//             columns: ["bank_account_id"]
//             isOneToOne: false
//             referencedRelation: "bank_accounts"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "financial_records_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "fk_supplier"
//             columns: ["supplier_id"]
//             isOneToOne: false
//             referencedRelation: "suppliers"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       fiscal_operations: {
//         Row: {
//           cfop: string | null
//           cofins: string | null
//           company_id: string | null
//           consumidor_final: string | null
//           created_at: string | null
//           csosn_icms: string | null
//           cst_icms: string | null
//           finalidade_emissao: string | null
//           icms_origem: string | null
//           icms_situacao_tributaria: string | null
//           id: string
//           ipi: string | null
//           local_destino: string | null
//           modalidade_frete: string | null
//           natureza_operacao: string | null
//           ncm: string | null
//           operation_id: number | null
//           pis: string | null
//           presenca_comprador: string | null
//           pst: number | null
//           state: string | null
//           tipo_documento: string | null
//           vbc_st_ret: number | null
//           vicms_st_ret: number | null
//           vicms_substituto: number | null
//         }
//         Insert: {
//           cfop?: string | null
//           cofins?: string | null
//           company_id?: string | null
//           consumidor_final?: string | null
//           created_at?: string | null
//           csosn_icms?: string | null
//           cst_icms?: string | null
//           finalidade_emissao?: string | null
//           icms_origem?: string | null
//           icms_situacao_tributaria?: string | null
//           id?: string
//           ipi?: string | null
//           local_destino?: string | null
//           modalidade_frete?: string | null
//           natureza_operacao?: string | null
//           ncm?: string | null
//           operation_id?: number | null
//           pis?: string | null
//           presenca_comprador?: string | null
//           pst?: number | null
//           state?: string | null
//           tipo_documento?: string | null
//           vbc_st_ret?: number | null
//           vicms_st_ret?: number | null
//           vicms_substituto?: number | null
//         }
//         Update: {
//           cfop?: string | null
//           cofins?: string | null
//           company_id?: string | null
//           consumidor_final?: string | null
//           created_at?: string | null
//           csosn_icms?: string | null
//           cst_icms?: string | null
//           finalidade_emissao?: string | null
//           icms_origem?: string | null
//           icms_situacao_tributaria?: string | null
//           id?: string
//           ipi?: string | null
//           local_destino?: string | null
//           modalidade_frete?: string | null
//           natureza_operacao?: string | null
//           ncm?: string | null
//           operation_id?: number | null
//           pis?: string | null
//           presenca_comprador?: string | null
//           pst?: number | null
//           state?: string | null
//           tipo_documento?: string | null
//           vbc_st_ret?: number | null
//           vicms_st_ret?: number | null
//           vicms_substituto?: number | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "fiscal_operations_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       invoice_counters: {
//         Row: {
//           company_id: string
//           counter_key: string | null
//           last_number: number
//           serie: string
//         }
//         Insert: {
//           company_id: string
//           counter_key?: string | null
//           last_number?: number
//           serie?: string
//         }
//         Update: {
//           company_id?: string
//           counter_key?: string | null
//           last_number?: number
//           serie?: string
//         }
//         Relationships: [
//           {
//             foreignKeyName: "invoice_counters_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       invoices: {
//         Row: {
//           chave_nfe: string | null
//           company_id: string | null
//           created_at: string | null
//           customer_name: string | null
//           danfe_url: string | null
//           data_emissao: string | null
//           focus_ref: string | null
//           id: string
//           natureza_operacao: string | null
//           note_number: string | null
//           numero: string | null
//           order_id: string | null
//           ref: string | null
//           serie: string | null
//           status: string | null
//           valor_total: number | null
//           xml_url: string | null
//         }
//         Insert: {
//           chave_nfe?: string | null
//           company_id?: string | null
//           created_at?: string | null
//           customer_name?: string | null
//           danfe_url?: string | null
//           data_emissao?: string | null
//           focus_ref?: string | null
//           id?: string
//           natureza_operacao?: string | null
//           note_number?: string | null
//           numero?: string | null
//           order_id?: string | null
//           ref?: string | null
//           serie?: string | null
//           status?: string | null
//           valor_total?: number | null
//           xml_url?: string | null
//         }
//         Update: {
//           chave_nfe?: string | null
//           company_id?: string | null
//           created_at?: string | null
//           customer_name?: string | null
//           danfe_url?: string | null
//           data_emissao?: string | null
//           focus_ref?: string | null
//           id?: string
//           natureza_operacao?: string | null
//           note_number?: string | null
//           numero?: string | null
//           order_id?: string | null
//           ref?: string | null
//           serie?: string | null
//           status?: string | null
//           valor_total?: number | null
//           xml_url?: string | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "invoices_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "invoices_order_id_fkey"
//             columns: ["order_id"]
//             isOneToOne: false
//             referencedRelation: "orders"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       nfe_credentials: {
//         Row: {
//           certificate_file_url: string | null
//           certificate_password: string | null
//           cnpj: string
//           company_id: string | null
//           created_at: string | null
//           environment: string | null
//           focus_token: string
//           id: string
//         }
//         Insert: {
//           certificate_file_url?: string | null
//           certificate_password?: string | null
//           cnpj: string
//           company_id?: string | null
//           created_at?: string | null
//           environment?: string | null
//           focus_token: string
//           id?: string
//         }
//         Update: {
//           certificate_file_url?: string | null
//           certificate_password?: string | null
//           cnpj?: string
//           company_id?: string | null
//           created_at?: string | null
//           environment?: string | null
//           focus_token?: string
//           id?: string
//         }
//         Relationships: [
//           {
//             foreignKeyName: "nfe_credentials_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: true
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       notifications: {
//         Row: {
//           company_id: string | null
//           date: string | null
//           description: string | null
//           id: string
//           meta: Json | null
//           read: boolean | null
//           title: string | null
//           type: string | null
//         }
//         Insert: {
//           company_id?: string | null
//           date?: string | null
//           description?: string | null
//           id?: string
//           meta?: Json | null
//           read?: boolean | null
//           title?: string | null
//           type?: string | null
//         }
//         Update: {
//           company_id?: string | null
//           date?: string | null
//           description?: string | null
//           id?: string
//           meta?: Json | null
//           read?: boolean | null
//           title?: string | null
//           type?: string | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "notifications_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       order_items: {
//         Row: {
//           id: string
//           order_id: string | null
//           price: number
//           product_id: string | null
//           quantity: number
//         }
//         Insert: {
//           id?: string
//           order_id?: string | null
//           price: number
//           product_id?: string | null
//           quantity: number
//         }
//         Update: {
//           id?: string
//           order_id?: string | null
//           price?: number
//           product_id?: string | null
//           quantity?: number
//         }
//         Relationships: [
//           {
//             foreignKeyName: "order_items_order_id_fkey"
//             columns: ["order_id"]
//             isOneToOne: false
//             referencedRelation: "orders"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "order_items_product_id_fkey"
//             columns: ["product_id"]
//             isOneToOne: false
//             referencedRelation: "products"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       orders: {
//         Row: {
//           amount: number
//           appointment_date: string
//           appointment_hour: string | null
//           appointment_local: string | null
//           boleto_barcode_number: string | null
//           boleto_digitable_line: string | null
//           boleto_expiration_date: string | null
//           boleto_id: string | null
//           boleto_url: string | null
//           company_id: string
//           created_at: string | null
//           customer: string
//           customer_id: string | null
//           customer_signature: string | null
//           days_ticket: number
//           delivery_status: string | null
//           document_type: string | null
//           driver_id: string | null
//           due_date: string | null
//           freight: number | null
//           id: string
//           issue_date: string | null
//           note_number: string
//           order_index: number
//           payment_method: string | null
//           payment_status: string | null
//           phone: string
//           products: string
//           route_number: number | null
//           stock_updated: boolean | null
//           text_note: string | null
//           total: number
//           total_payed: number | null
//         }
//         Insert: {
//           amount: number
//           appointment_date: string
//           appointment_hour?: string | null
//           appointment_local?: string | null
//           boleto_barcode_number?: string | null
//           boleto_digitable_line?: string | null
//           boleto_expiration_date?: string | null
//           boleto_id?: string | null
//           boleto_url?: string | null
//           company_id: string
//           created_at?: string | null
//           customer: string
//           customer_id?: string | null
//           customer_signature?: string | null
//           days_ticket: number
//           delivery_status?: string | null
//           document_type?: string | null
//           driver_id?: string | null
//           due_date?: string | null
//           freight?: number | null
//           id?: string
//           issue_date?: string | null
//           note_number: string
//           order_index: number
//           payment_method?: string | null
//           payment_status?: string | null
//           phone: string
//           products: string
//           route_number?: number | null
//           stock_updated?: boolean | null
//           text_note?: string | null
//           total: number
//           total_payed?: number | null
//         }
//         Update: {
//           amount?: number
//           appointment_date?: string
//           appointment_hour?: string | null
//           appointment_local?: string | null
//           boleto_barcode_number?: string | null
//           boleto_digitable_line?: string | null
//           boleto_expiration_date?: string | null
//           boleto_id?: string | null
//           boleto_url?: string | null
//           company_id?: string
//           created_at?: string | null
//           customer?: string
//           customer_id?: string | null
//           customer_signature?: string | null
//           days_ticket?: number
//           delivery_status?: string | null
//           document_type?: string | null
//           driver_id?: string | null
//           due_date?: string | null
//           freight?: number | null
//           id?: string
//           issue_date?: string | null
//           note_number?: string
//           order_index?: number
//           payment_method?: string | null
//           payment_status?: string | null
//           phone?: string
//           products?: string
//           route_number?: number | null
//           stock_updated?: boolean | null
//           text_note?: string | null
//           total?: number
//           total_payed?: number | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "fk_company_id"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "sales_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "sales_customer_id_fkey"
//             columns: ["customer_id"]
//             isOneToOne: false
//             referencedRelation: "customers"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       payment_methods: {
//         Row: {
//           code: string
//           company_id: string
//           created_at: string
//           default_days: number
//           enabled: boolean
//           id: string
//           name: string
//           updated_at: string
//         }
//         Insert: {
//           code: string
//           company_id: string
//           created_at?: string
//           default_days?: number
//           enabled?: boolean
//           id?: string
//           name: string
//           updated_at?: string
//         }
//         Update: {
//           code?: string
//           company_id?: string
//           created_at?: string
//           default_days?: number
//           enabled?: boolean
//           id?: string
//           name?: string
//           updated_at?: string
//         }
//         Relationships: [
//           {
//             foreignKeyName: "payment_methods_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       price_table_products: {
//         Row: {
//           id: string
//           price: number
//           price_table_id: string
//           product_id: string
//         }
//         Insert: {
//           id?: string
//           price: number
//           price_table_id: string
//           product_id: string
//         }
//         Update: {
//           id?: string
//           price?: number
//           price_table_id?: string
//           product_id?: string
//         }
//         Relationships: [
//           {
//             foreignKeyName: "price_table_products_price_table_id_fkey"
//             columns: ["price_table_id"]
//             isOneToOne: false
//             referencedRelation: "price_tables"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "price_table_products_product_id_fkey"
//             columns: ["product_id"]
//             isOneToOne: false
//             referencedRelation: "products"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       price_tables: {
//         Row: {
//           company_id: string
//           created_at: string | null
//           id: string
//           name: string
//         }
//         Insert: {
//           company_id: string
//           created_at?: string | null
//           id?: string
//           name: string
//         }
//         Update: {
//           company_id?: string
//           created_at?: string | null
//           id?: string
//           name?: string
//         }
//         Relationships: [
//           {
//             foreignKeyName: "price_tables_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       product_loans: {
//         Row: {
//           company_id: string | null
//           created_at: string | null
//           equipment_id: string
//           id: string
//           product_id: string
//           quantity: number
//         }
//         Insert: {
//           company_id?: string | null
//           created_at?: string | null
//           equipment_id: string
//           id?: string
//           product_id: string
//           quantity?: number
//         }
//         Update: {
//           company_id?: string | null
//           created_at?: string | null
//           equipment_id?: string
//           id?: string
//           product_id?: string
//           quantity?: number
//         }
//         Relationships: [
//           {
//             foreignKeyName: "fk_product_loans_company"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "product_loans_equipment_id_fkey"
//             columns: ["equipment_id"]
//             isOneToOne: false
//             referencedRelation: "equipments"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "product_loans_product_id_fkey"
//             columns: ["product_id"]
//             isOneToOne: false
//             referencedRelation: "products"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       products: {
//         Row: {
//           aplication: string | null
//           code: number
//           company_id: string
//           created_at: string | null
//           description: string | null
//           id: string
//           loan_product_code: string | null
//           manufacturer: string | null
//           material_class: string | null
//           material_origin: string | null
//           name: string
//           percentage_taxes: string | null
//           standard_price: number | null
//           stock: number | null
//           submaterial_class: string | null
//           unit: string | null
//         }
//         Insert: {
//           aplication?: string | null
//           code: number
//           company_id: string
//           created_at?: string | null
//           description?: string | null
//           id?: string
//           loan_product_code?: string | null
//           manufacturer?: string | null
//           material_class?: string | null
//           material_origin?: string | null
//           name: string
//           percentage_taxes?: string | null
//           standard_price?: number | null
//           stock?: number | null
//           submaterial_class?: string | null
//           unit?: string | null
//         }
//         Update: {
//           aplication?: string | null
//           code?: number
//           company_id?: string
//           created_at?: string | null
//           description?: string | null
//           id?: string
//           loan_product_code?: string | null
//           manufacturer?: string | null
//           material_class?: string | null
//           material_origin?: string | null
//           name?: string
//           percentage_taxes?: string | null
//           standard_price?: number | null
//           stock?: number | null
//           submaterial_class?: string | null
//           unit?: string | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "fk_company_id"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "products_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       profiles: {
//         Row: {
//           avatar: string | null
//           company_id: string | null
//           email: string | null
//           id: string
//           is_blocked: boolean | null
//           username: string | null
//         }
//         Insert: {
//           avatar?: string | null
//           company_id?: string | null
//           email?: string | null
//           id: string
//           is_blocked?: boolean | null
//           username?: string | null
//         }
//         Update: {
//           avatar?: string | null
//           company_id?: string | null
//           email?: string | null
//           id?: string
//           is_blocked?: boolean | null
//           username?: string | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "profiles_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       stock_movements: {
//         Row: {
//           company_id: string
//           created_at: string
//           created_by: string
//           id: string
//           note_id: string | null
//           product_id: string | null
//           quantity: number
//           reason: string | null
//           type: string
//         }
//         Insert: {
//           company_id: string
//           created_at?: string
//           created_by?: string
//           id?: string
//           note_id?: string | null
//           product_id?: string | null
//           quantity: number
//           reason?: string | null
//           type: string
//         }
//         Update: {
//           company_id?: string
//           created_at?: string
//           created_by?: string
//           id?: string
//           note_id?: string | null
//           product_id?: string | null
//           quantity?: number
//           reason?: string | null
//           type?: string
//         }
//         Relationships: [
//           {
//             foreignKeyName: "stock_movements_product_id_fkey"
//             columns: ["product_id"]
//             isOneToOne: false
//             referencedRelation: "products"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       stripe_webhook_events: {
//         Row: {
//           event_type: string | null
//           id: number
//           payload: Json | null
//           processed: boolean | null
//           processed_at: string | null
//           received_at: string | null
//           stripe_event_id: string | null
//         }
//         Insert: {
//           event_type?: string | null
//           id?: number
//           payload?: Json | null
//           processed?: boolean | null
//           processed_at?: string | null
//           received_at?: string | null
//           stripe_event_id?: string | null
//         }
//         Update: {
//           event_type?: string | null
//           id?: number
//           payload?: Json | null
//           processed?: boolean | null
//           processed_at?: string | null
//           received_at?: string | null
//           stripe_event_id?: string | null
//         }
//         Relationships: []
//       }
//       subscriptions: {
//         Row: {
//           cancel_at_period_end: boolean | null
//           canceled_at: string | null
//           company_id: string
//           created_at: string | null
//           id: string
//           latest_invoice_id: string | null
//           metadata: Json | null
//           price_id: string | null
//           quantity: number | null
//           raw_payload: Json | null
//           started_at: string | null
//           status: string
//           stripe_customer_id: string | null
//           stripe_subscription_id: string | null
//           trial_end: string | null
//           trial_start: string | null
//           updated_at: string | null
//           user_id: string | null
//         }
//         Insert: {
//           cancel_at_period_end?: boolean | null
//           canceled_at?: string | null
//           company_id: string
//           created_at?: string | null
//           id?: string
//           latest_invoice_id?: string | null
//           metadata?: Json | null
//           price_id?: string | null
//           quantity?: number | null
//           raw_payload?: Json | null
//           started_at?: string | null
//           status?: string
//           stripe_customer_id?: string | null
//           stripe_subscription_id?: string | null
//           trial_end?: string | null
//           trial_start?: string | null
//           updated_at?: string | null
//           user_id?: string | null
//         }
//         Update: {
//           cancel_at_period_end?: boolean | null
//           canceled_at?: string | null
//           company_id?: string
//           created_at?: string | null
//           id?: string
//           latest_invoice_id?: string | null
//           metadata?: Json | null
//           price_id?: string | null
//           quantity?: number | null
//           raw_payload?: Json | null
//           started_at?: string | null
//           status?: string
//           stripe_customer_id?: string | null
//           stripe_subscription_id?: string | null
//           trial_end?: string | null
//           trial_start?: string | null
//           updated_at?: string | null
//           user_id?: string | null
//         }
//         Relationships: []
//       }
//       suppliers: {
//         Row: {
//           address: string | null
//           city: string | null
//           company_id: string
//           complement: string | null
//           created_at: string | null
//           document: string
//           email: string | null
//           fantasy_name: string | null
//           id: string
//           name: string
//           neighborhood: string | null
//           number: string | null
//           phone: string | null
//           state: string | null
//           state_registration: string | null
//           type: string | null
//           zip_code: string | null
//         }
//         Insert: {
//           address?: string | null
//           city?: string | null
//           company_id: string
//           complement?: string | null
//           created_at?: string | null
//           document: string
//           email?: string | null
//           fantasy_name?: string | null
//           id?: string
//           name: string
//           neighborhood?: string | null
//           number?: string | null
//           phone?: string | null
//           state?: string | null
//           state_registration?: string | null
//           type?: string | null
//           zip_code?: string | null
//         }
//         Update: {
//           address?: string | null
//           city?: string | null
//           company_id?: string
//           complement?: string | null
//           created_at?: string | null
//           document?: string
//           email?: string | null
//           fantasy_name?: string | null
//           id?: string
//           name?: string
//           neighborhood?: string | null
//           number?: string | null
//           phone?: string | null
//           state?: string | null
//           state_registration?: string | null
//           type?: string | null
//           zip_code?: string | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "fk_company_id"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//           {
//             foreignKeyName: "suppliers_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//     }
//     Views: {
//       current_user_company_id: {
//         Row: {
//           company_id: string | null
//         }
//         Insert: {
//           company_id?: string | null
//         }
//         Update: {
//           company_id?: string | null
//         }
//         Relationships: [
//           {
//             foreignKeyName: "company_users_company_id_fkey"
//             columns: ["company_id"]
//             isOneToOne: false
//             referencedRelation: "companies"
//             referencedColumns: ["id"]
//           },
//         ]
//       }
//       current_user_is_admin: {
//         Row: {
//           is_admin: boolean | null
//         }
//         Relationships: []
//       }
//     }
//     Functions: {
//       bootstrap_user: { Args: never; Returns: undefined }
//       check_user_exists: { Args: { email_input: string }; Returns: boolean }
//       current_user_company_id: { Args: never; Returns: string }
//       customer_has_overdue_boleto: {
//         Args: { p_company_id: string; p_customer_id: string }
//         Returns: boolean
//       }
//       customer_overdue_boletos: {
//         Args: { p_company_id?: string; p_customer_id: string }
//         Returns: {
//           due_date: string
//           note_number: string
//           order_id: string
//           payment_status: string
//           total: number
//         }[]
//       }
//       equipment_return_partial: {
//         Args: {
//           p_loan_id: string
//           p_returned_quantity: number
//           p_user_id?: string
//         }
//         Returns: {
//           loan_id: string
//           remaining_quantity: number
//           return_date: string
//           status: string
//         }[]
//       }
//       get_next_invoice_number: {
//         Args: { p_company_id: string; p_serie: string }
//         Returns: number
//       }
//       increment_invoice_counter:
//         | {
//             Args: { p_company_id?: string; p_counter_key: string }
//             Returns: {
//               next_number: number
//             }[]
//           }
//         | {
//             Args: { p_key: string }
//             Returns: {
//               next_number: number
//             }[]
//           }
//       set_invoice_counter: {
//         Args: { p_company_id: string; p_last: number; p_serie: string }
//         Returns: undefined
//       }
//     }
//     Enums: {
//       stock_movement_type: "input" | "output" | "return" | "adjustment"
//     }
//     CompositeTypes: {
//       [_ in never]: never
//     }
//   }
// }

// type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

// type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

// export type Tables<
//   DefaultSchemaTableNameOrOptions extends
//     | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
//     | { schema: keyof DatabaseWithoutInternals },
//   TableName extends DefaultSchemaTableNameOrOptions extends {
//     schema: keyof DatabaseWithoutInternals
//   }
//     ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
//         DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
//     : never = never,
// > = DefaultSchemaTableNameOrOptions extends {
//   schema: keyof DatabaseWithoutInternals
// }
//   ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
//       DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
//       Row: infer R
//     }
//     ? R
//     : never
//   : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
//         DefaultSchema["Views"])
//     ? (DefaultSchema["Tables"] &
//         DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
//         Row: infer R
//       }
//       ? R
//       : never
//     : never

// export type TablesInsert<
//   DefaultSchemaTableNameOrOptions extends
//     | keyof DefaultSchema["Tables"]
//     | { schema: keyof DatabaseWithoutInternals },
//   TableName extends DefaultSchemaTableNameOrOptions extends {
//     schema: keyof DatabaseWithoutInternals
//   }
//     ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
//     : never = never,
// > = DefaultSchemaTableNameOrOptions extends {
//   schema: keyof DatabaseWithoutInternals
// }
//   ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
//       Insert: infer I
//     }
//     ? I
//     : never
//   : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
//     ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
//         Insert: infer I
//       }
//       ? I
//       : never
//     : never

// export type TablesUpdate<
//   DefaultSchemaTableNameOrOptions extends
//     | keyof DefaultSchema["Tables"]
//     | { schema: keyof DatabaseWithoutInternals },
//   TableName extends DefaultSchemaTableNameOrOptions extends {
//     schema: keyof DatabaseWithoutInternals
//   }
//     ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
//     : never = never,
// > = DefaultSchemaTableNameOrOptions extends {
//   schema: keyof DatabaseWithoutInternals
// }
//   ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
//       Update: infer U
//     }
//     ? U
//     : never
//   : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
//     ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
//         Update: infer U
//       }
//       ? U
//       : never
//     : never

// export type Enums<
//   DefaultSchemaEnumNameOrOptions extends
//     | keyof DefaultSchema["Enums"]
//     | { schema: keyof DatabaseWithoutInternals },
//   EnumName extends DefaultSchemaEnumNameOrOptions extends {
//     schema: keyof DatabaseWithoutInternals
//   }
//     ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
//     : never = never,
// > = DefaultSchemaEnumNameOrOptions extends {
//   schema: keyof DatabaseWithoutInternals
// }
//   ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
//   : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
//     ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
//     : never

// export type CompositeTypes<
//   PublicCompositeTypeNameOrOptions extends
//     | keyof DefaultSchema["CompositeTypes"]
//     | { schema: keyof DatabaseWithoutInternals },
//   CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
//     schema: keyof DatabaseWithoutInternals
//   }
//     ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
//     : never = never,
// > = PublicCompositeTypeNameOrOptions extends {
//   schema: keyof DatabaseWithoutInternals
// }
//   ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
//   : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
//     ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
//     : never

// export const Constants = {
//   public: {
//     Enums: {
//       stock_movement_type: ["input", "output", "return", "adjustment"],
//     },
//   },
// } as const
export type Database = any;
