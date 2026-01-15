export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = "admin" | "model" | "brand" | "viewer"
export type ModelStatus = "pending" | "active" | "archived"
export type CaptureStatus = "pending" | "validated" | "rejected"
export type LicenseStatus = "active" | "expired" | "revoked"
export type ContractStatus = "draft" | "pending" | "signed" | "rejected"
export type PreviewStatus = "active" | "expired" | "deleted"
export type VTGJobStatus = "queued" | "processing" | "done" | "failed"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      models: {
        Row: {
          id: string
          user_id: string
          full_name: string
          email: string
          phone: string | null
          city: string | null
          country: string | null
          status: ModelStatus
          plan_type: string
          consent_given: boolean
          consent_date: string | null
          internal_id: string
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          email: string
          phone?: string | null
          city?: string | null
          country?: string | null
          status?: ModelStatus
          plan_type?: string
          consent_given?: boolean
          consent_date?: string | null
          internal_id: string
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          email?: string
          phone?: string | null
          city?: string | null
          country?: string | null
          status?: ModelStatus
          plan_type?: string
          consent_given?: boolean
          consent_date?: string | null
          internal_id?: string
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      forges: {
        Row: {
          id: string
          model_id: string
          state: string
          version: number
          digital_twin_id: string | null
          seed_hash: string | null
          capture_progress: number
          created_at: string
          updated_at: string
          certified_at: string | null
          created_by: string
          blockchain_tx_hash: string | null
          blockchain_timestamp: string | null
        }
        Insert: {
          id?: string
          model_id: string
          state?: string
          version?: number
          digital_twin_id?: string | null
          seed_hash?: string | null
          capture_progress?: number
          created_at?: string
          updated_at?: string
          certified_at?: string | null
          created_by: string
          blockchain_tx_hash?: string | null
          blockchain_timestamp?: string | null
        }
        Update: {
          id?: string
          model_id?: string
          state?: string
          version?: number
          digital_twin_id?: string | null
          seed_hash?: string | null
          capture_progress?: number
          created_at?: string
          updated_at?: string
          certified_at?: string | null
          created_by?: string
          blockchain_tx_hash?: string | null
          blockchain_timestamp?: string | null
        }
      }
      captures: {
        Row: {
          id: string
          model_id: string
          forge_id: string
          digital_twin_id: string | null
          asset_url: string
          asset_type: string
          angle: string
          file_name: string
          file_size: number
          mime_type: string
          resolution_width: number
          resolution_height: number
          stage: string
          status: CaptureStatus
          uploaded_at: string
        }
        Insert: {
          id?: string
          model_id: string
          forge_id: string
          digital_twin_id?: string | null
          asset_url: string
          asset_type?: string
          angle: string
          file_name: string
          file_size: number
          mime_type: string
          resolution_width: number
          resolution_height: number
          stage?: string
          status?: CaptureStatus
          uploaded_at?: string
        }
        Update: {
          id?: string
          model_id?: string
          forge_id?: string
          digital_twin_id?: string | null
          asset_url?: string
          asset_type?: string
          angle?: string
          file_name?: string
          file_size?: number
          mime_type?: string
          resolution_width?: number
          resolution_height?: number
          stage?: string
          status?: CaptureStatus
          uploaded_at?: string
        }
      }
      previews: {
        Row: {
          id: string
          capture_id: string | null
          digital_twin_id: string
          preview_url: string
          preview_type: string
          approved: boolean
          watermarked: boolean
          expires_at: string
          created_at: string
          created_by: string
          status: PreviewStatus
        }
        Insert: {
          id?: string
          capture_id?: string | null
          digital_twin_id: string
          preview_url: string
          preview_type: string
          approved?: boolean
          watermarked?: boolean
          expires_at: string
          created_at?: string
          created_by: string
          status?: PreviewStatus
        }
        Update: {
          id?: string
          capture_id?: string | null
          digital_twin_id?: string
          preview_url?: string
          preview_type?: string
          approved?: boolean
          watermarked?: boolean
          expires_at?: string
          created_at?: string
          created_by?: string
          status?: PreviewStatus
        }
      }
      licenses: {
        Row: {
          id: string
          model_id: string
          digital_twin_id: string
          client_id: string
          usage_type: string
          territory: string[]
          valid_from: string
          valid_until: string
          status: LicenseStatus
          max_downloads: number | null
          current_downloads: number
          created_by: string
          created_at: string
          revoked_at: string | null
          revoked_reason: string | null
        }
        Insert: {
          id?: string
          model_id: string
          digital_twin_id: string
          client_id: string
          usage_type: string
          territory?: string[]
          valid_from: string
          valid_until: string
          status?: LicenseStatus
          max_downloads?: number | null
          current_downloads?: number
          created_by: string
          created_at?: string
          revoked_at?: string | null
          revoked_reason?: string | null
        }
        Update: {
          id?: string
          model_id?: string
          digital_twin_id?: string
          client_id?: string
          usage_type?: string
          territory?: string[]
          valid_from?: string
          valid_until?: string
          status?: LicenseStatus
          max_downloads?: number | null
          current_downloads?: number
          created_by?: string
          created_at?: string
          revoked_at?: string | null
          revoked_reason?: string | null
        }
      }
      contracts: {
        Row: {
          id: string
          license_id: string
          model_id: string
          brand_id: string | null
          brand_name: string
          contract_url: string | null
          signed: boolean
          signed_at: string | null
          status: ContractStatus
          hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          license_id: string
          model_id: string
          brand_id?: string | null
          brand_name: string
          contract_url?: string | null
          signed?: boolean
          signed_at?: string | null
          status?: ContractStatus
          hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          license_id?: string
          model_id?: string
          brand_id?: string | null
          brand_name?: string
          contract_url?: string | null
          signed?: boolean
          signed_at?: string | null
          status?: ContractStatus
          hash?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      brands: {
        Row: {
          id: string
          user_id: string
          name: string
          logo_url: string | null
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          logo_url?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          logo_url?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      brand_models: {
        Row: {
          id: string
          brand_id: string
          model_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          model_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          model_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      visual_assets: {
        Row: {
          id: string
          digital_twin_id: string
          vtg_job_id: string | null
          asset_type: string
          category: string
          file_url: string
          hash: string
          license_id: string | null
          watermarked: boolean
          certificate_id: string | null
          resolution_width: number
          resolution_height: number
          format: string
          file_size: number
          created_at: string
        }
        Insert: {
          id?: string
          digital_twin_id: string
          vtg_job_id?: string | null
          asset_type: string
          category: string
          file_url: string
          hash: string
          license_id?: string | null
          watermarked?: boolean
          certificate_id?: string | null
          resolution_width: number
          resolution_height: number
          format: string
          file_size: number
          created_at?: string
        }
        Update: {
          id?: string
          digital_twin_id?: string
          vtg_job_id?: string | null
          asset_type?: string
          category?: string
          file_url?: string
          hash?: string
          license_id?: string | null
          watermarked?: boolean
          certificate_id?: string | null
          resolution_width?: number
          resolution_height?: number
          format?: string
          file_size?: number
          created_at?: string
        }
      }
      vtg_jobs: {
        Row: {
          id: string
          digital_twin_id: string
          mode: string
          category: string
          preset_id: string | null
          status: VTGJobStatus
          priority: number
          result: Json | null
          created_by: string
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          digital_twin_id: string
          mode: string
          category: string
          preset_id?: string | null
          status?: VTGJobStatus
          priority?: number
          result?: Json | null
          created_by: string
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          digital_twin_id?: string
          mode?: string
          category?: string
          preset_id?: string | null
          status?: VTGJobStatus
          priority?: number
          result?: Json | null
          created_by?: string
          created_at?: string
          completed_at?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string
          actor_name: string
          action: string
          target_table: string | null
          target_id: string | null
          forge_id: string | null
          model_id: string | null
          digital_twin_id: string | null
          metadata: Json | null
          ip_address: string | null
          user_agent: string | null
          session_id: string | null
          integrity_hash: string | null
          previous_log_hash: string | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id: string
          actor_name: string
          action: string
          target_table?: string | null
          target_id?: string | null
          forge_id?: string | null
          model_id?: string | null
          digital_twin_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          integrity_hash?: string | null
          previous_log_hash?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string
          actor_name?: string
          action?: string
          target_table?: string | null
          target_id?: string | null
          forge_id?: string | null
          model_id?: string | null
          digital_twin_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          integrity_hash?: string | null
          previous_log_hash?: string | null
          created_at?: string
        }
      }
      certificates: {
        Row: {
          id: string
          forge_id: string
          model_id: string
          digital_twin_id: string
          model_name: string
          version: number
          issued_at: string
          issued_by: string
          status: string
          expires_at: string | null
          revoked_at: string | null
          revoked_reason: string | null
          verification_code: string
          public_key: string | null
          signature: string | null
          plan_type: string
          forge_version: number
        }
        Insert: {
          id?: string
          forge_id: string
          model_id: string
          digital_twin_id: string
          model_name: string
          version?: number
          issued_at?: string
          issued_by: string
          status?: string
          expires_at?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          verification_code: string
          public_key?: string | null
          signature?: string | null
          plan_type: string
          forge_version?: number
        }
        Update: {
          id?: string
          forge_id?: string
          model_id?: string
          digital_twin_id?: string
          model_name?: string
          version?: number
          issued_at?: string
          issued_by?: string
          status?: string
          expires_at?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          verification_code?: string
          public_key?: string | null
          signature?: string | null
          plan_type?: string
          forge_version?: number
        }
      }
      financeiro_transacoes: {
        Row: {
          id: string
          license_id: string | null
          brand_id: string | null
          model_id: string | null
          amount: number
          currency: string
          transaction_type: string
          status: string
          description: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          license_id?: string | null
          brand_id?: string | null
          model_id?: string | null
          amount: number
          currency?: string
          transaction_type: string
          status?: string
          description?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          license_id?: string | null
          brand_id?: string | null
          model_id?: string | null
          amount?: number
          currency?: string
          transaction_type?: string
          status?: string
          description?: string | null
          created_at?: string
          processed_at?: string | null
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
      user_role: UserRole
      model_status: ModelStatus
      capture_status: CaptureStatus
      license_status: LicenseStatus
      contract_status: ContractStatus
      preview_status: PreviewStatus
      vtg_job_status: VTGJobStatus
    }
  }
}
