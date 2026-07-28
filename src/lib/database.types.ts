export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          cap: string | null
          citta: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          indirizzo: string | null
          nome: string
          note: string | null
          piva: string | null
          provincia: string | null
          telefono: string | null
        }
        Insert: {
          cap?: string | null
          citta?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          indirizzo?: string | null
          nome: string
          note?: string | null
          piva?: string | null
          provincia?: string | null
          telefono?: string | null
        }
        Update: {
          cap?: string | null
          citta?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          indirizzo?: string | null
          nome?: string
          note?: string | null
          piva?: string | null
          provincia?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      contatori_commessa: {
        Row: {
          client_id: string
          tipo: string
          ultimo_numero: number
        }
        Insert: {
          client_id: string
          tipo: string
          ultimo_numero?: number
        }
        Update: {
          client_id?: string
          tipo?: string
          ultimo_numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "contatori_commessa_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      interventi: {
        Row: {
          aree_intervento: string | null
          client_id: string
          compilato_da: string
          created_at: string
          data: string
          deleted_at: string | null
          firma_cliente_svg: string | null
          firma_tecnico_svg: string | null
          id: string
          lavoro_svolto: string
          materiali_installati: string | null
          note: string | null
          numero: number
          ore: number | null
          persona_contatto: string | null
          tecnici_ids: string[]
          tipo: string
          updated_at: string
        }
        // `numero` è volutamente opzionale: viene assegnato dal trigger
        // `assegna_numero_intervento` lato database, mai dal client.
        Insert: {
          aree_intervento?: string | null
          client_id: string
          compilato_da: string
          created_at?: string
          data: string
          deleted_at?: string | null
          firma_cliente_svg?: string | null
          firma_tecnico_svg?: string | null
          id?: string
          lavoro_svolto: string
          materiali_installati?: string | null
          note?: string | null
          numero?: number
          ore?: number | null
          persona_contatto?: string | null
          tecnici_ids?: string[]
          tipo: string
          updated_at?: string
        }
        Update: {
          aree_intervento?: string | null
          client_id?: string
          compilato_da?: string
          created_at?: string
          data?: string
          deleted_at?: string | null
          firma_cliente_svg?: string | null
          firma_tecnico_svg?: string | null
          id?: string
          lavoro_svolto?: string
          materiali_installati?: string | null
          note?: string | null
          numero?: number
          ore?: number | null
          persona_contatto?: string | null
          tecnici_ids?: string[]
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interventi_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventi_compilato_da_fkey"
            columns: ["compilato_da"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          attivo: boolean
          created_at: string
          email: string | null
          id: string
          nome: string
          ruolo: string
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          email?: string | null
          id: string
          nome: string
          ruolo: string
        }
        Update: {
          attivo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          ruolo?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anteprima_numero: {
        Args: { p_client_id: string; p_tipo: string }
        Returns: number
      }
      serve_bootstrap: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"]
