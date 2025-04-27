
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bills: {
        Row: {
          bill_id: string
          created_at: string
          total_amount: number | null
          tip_percentage: number
          expires_at: string
        }
        Insert: {
          bill_id?: string
          created_at?: string
          total_amount?: number | null
          tip_percentage?: number
          expires_at?: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          total_amount?: number | null
          tip_percentage?: number
          expires_at?: string
        }
      }
      items: {
        Row: {
          item_id: string
          bill_id: string
          name: string
          price: number
          quantity: number
          unclaimed_quantity: number
          created_at: string
        }
        Insert: {
          item_id?: string
          bill_id: string
          name: string
          price: number
          quantity?: number
          unclaimed_quantity?: number
          created_at?: string
        }
        Update: {
          item_id?: string
          bill_id?: string
          name?: string
          price?: number
          quantity?: number
          unclaimed_quantity?: number
          created_at?: string
        }
      }
      guests: {
        Row: {
          guest_id: string
          bill_id: string
          name: string
          color: string
          joined_at: string
        }
        Insert: {
          guest_id?: string
          bill_id: string
          name: string
          color: string
          joined_at?: string
        }
        Update: {
          guest_id?: string
          bill_id?: string
          name?: string
          color?: string
          joined_at?: string
        }
      }
      claims: {
        Row: {
          claim_id: string
          item_id: string
          guest_id: string
          quantity_claimed: number
          created_at: string
        }
        Insert: {
          claim_id?: string
          item_id: string
          guest_id: string
          quantity_claimed?: number
          created_at?: string
        }
        Update: {
          claim_id?: string
          item_id?: string
          guest_id?: string
          quantity_claimed?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}