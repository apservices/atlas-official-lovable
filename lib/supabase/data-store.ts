"use client"

import { createClient } from "./client"
import type { Database } from "./database.types"
import type { RealtimeChannel } from "@supabase/supabase-js"

type Tables = Database["public"]["Tables"]
type Model = Tables["models"]["Row"]
type Forge = Tables["forges"]["Row"]
type Capture = Tables["captures"]["Row"]
type Preview = Tables["previews"]["Row"]
type License = Tables["licenses"]["Row"]
type Contract = Tables["contracts"]["Row"]
type VisualAsset = Tables["visual_assets"]["Row"]
type VTGJob = Tables["vtg_jobs"]["Row"]
type AuditLog = Tables["audit_logs"]["Row"]
type Certificate = Tables["certificates"]["Row"]
type Brand = Tables["brands"]["Row"]
type BrandModel = Tables["brand_models"]["Row"]
type Profile = Tables["profiles"]["Row"]

// Forge states in strict order
export const FORGE_STATES = [
  "CREATED",
  "CAPTURED",
  "NORMALIZED",
  "SEEDED",
  "PARAMETRIZED",
  "VALIDATED",
  "CERTIFIED",
] as const

export type ForgeState = (typeof FORGE_STATES)[number]

// =============================================================================
// Supabase Data Store - Replaces localStorage
// =============================================================================

class SupabaseDataStore {
  private supabase = createClient()
  private realtimeChannels: Map<string, RealtimeChannel> = new Map()

  // ─────────────────────────────────────────────────────────────────────────────
  // MODELS
  // ─────────────────────────────────────────────────────────────────────────────

  async getModels(): Promise<Model[]> {
    const { data, error } = await this.supabase.from("models").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching models:", error)
      return []
    }
    return data || []
  }

  async getModel(id: string): Promise<Model | null> {
    const { data, error } = await this.supabase.from("models").select("*").eq("id", id).single()

    if (error) {
      console.error("[v0] Error fetching model:", error)
      return null
    }
    return data
  }

  async getModelByUserId(userId: string): Promise<Model | null> {
    const { data, error } = await this.supabase.from("models").select("*").eq("user_id", userId).single()

    if (error && error.code !== "PGRST116") {
      console.error("[v0] Error fetching model by user:", error)
    }
    return data || null
  }

  async createModel(model: Tables["models"]["Insert"]): Promise<Model | null> {
    const { data, error } = await this.supabase.from("models").insert(model).select().single()

    if (error) {
      console.error("[v0] Error creating model:", error)
      throw new Error(error.message)
    }

    await this.addAuditLog({
      actor_id: model.created_by,
      actor_name: "System",
      action: "MODEL_CREATED",
      target_table: "models",
      target_id: data.id,
      model_id: data.id,
    })

    return data
  }

  async updateModel(id: string, updates: Tables["models"]["Update"]): Promise<Model | null> {
    const { data, error } = await this.supabase.from("models").update(updates).eq("id", id).select().single()

    if (error) {
      console.error("[v0] Error updating model:", error)
      throw new Error(error.message)
    }
    return data
  }

  async deleteModel(id: string): Promise<boolean> {
    const { error } = await this.supabase.from("models").delete().eq("id", id)

    if (error) {
      console.error("[v0] Error deleting model:", error)
      return false
    }
    return true
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FORGES
  // ─────────────────────────────────────────────────────────────────────────────

  async getForges(): Promise<Forge[]> {
    const { data, error } = await this.supabase.from("forges").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching forges:", error)
      return []
    }
    return data || []
  }

  async getForge(id: string): Promise<Forge | null> {
    const { data, error } = await this.supabase.from("forges").select("*").eq("id", id).single()

    if (error) {
      console.error("[v0] Error fetching forge:", error)
      return null
    }
    return data
  }

  async getForgesByModel(modelId: string): Promise<Forge[]> {
    const { data, error } = await this.supabase
      .from("forges")
      .select("*")
      .eq("model_id", modelId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching forges by model:", error)
      return []
    }
    return data || []
  }

  async getForgeByDigitalTwinId(digitalTwinId: string): Promise<Forge | null> {
    const { data, error } = await this.supabase.from("forges").select("*").eq("digital_twin_id", digitalTwinId).single()

    if (error && error.code !== "PGRST116") {
      console.error("[v0] Error fetching forge by digital twin:", error)
    }
    return data || null
  }

  async createForge(forge: Tables["forges"]["Insert"]): Promise<Forge | null> {
    const { data, error } = await this.supabase.from("forges").insert(forge).select().single()

    if (error) {
      console.error("[v0] Error creating forge:", error)
      throw new Error(error.message)
    }

    await this.addAuditLog({
      actor_id: forge.created_by,
      actor_name: "System",
      action: "FORGE_CREATED",
      target_table: "forges",
      target_id: data.id,
      forge_id: data.id,
      model_id: forge.model_id,
    })

    return data
  }

  async transitionForge(
    id: string,
    targetState: ForgeState,
    userId: string,
  ): Promise<{ success: boolean; error?: string; forge?: Forge }> {
    const forge = await this.getForge(id)
    if (!forge) {
      return { success: false, error: "Forge not found" }
    }

    if (forge.state === "CERTIFIED") {
      return { success: false, error: "Certified forges cannot be modified" }
    }

    // Validate state transition
    const currentIndex = FORGE_STATES.indexOf(forge.state as ForgeState)
    const targetIndex = FORGE_STATES.indexOf(targetState)

    if (targetIndex !== currentIndex + 1) {
      return { success: false, error: "Invalid state transition" }
    }

    const updates: Tables["forges"]["Update"] = {
      state: targetState,
      updated_at: new Date().toISOString(),
    }

    // Handle special state transitions
    if (targetState === "SEEDED" && !forge.seed_hash) {
      updates.seed_hash = `sha256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(
        "",
      )}`
    }

    if (targetState === "CERTIFIED") {
      const model = await this.getModel(forge.model_id)
      const randomPart = Math.random().toString(36).substr(2, 4).toUpperCase()
      updates.digital_twin_id = `DTW-${new Date().getFullYear()}-${model?.internal_id || "000"}-${randomPart}`
      updates.certified_at = new Date().toISOString()
    }

    const { data, error } = await this.supabase.from("forges").update(updates).eq("id", id).select().single()

    if (error) {
      console.error("[v0] Error transitioning forge:", error)
      return { success: false, error: error.message }
    }

    await this.addAuditLog({
      actor_id: userId,
      actor_name: "System",
      action: "FORGE_STATE_CHANGED",
      target_table: "forges",
      target_id: id,
      forge_id: id,
      model_id: forge.model_id,
      metadata: { from_state: forge.state, to_state: targetState },
    })

    return { success: true, forge: data }
  }

  async updateForgeProgress(id: string, progress: number): Promise<Forge | null> {
    const { data, error } = await this.supabase
      .from("forges")
      .update({ capture_progress: Math.min(72, Math.max(0, progress)) })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating forge progress:", error)
      return null
    }
    return data
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CAPTURES
  // ─────────────────────────────────────────────────────────────────────────────

  async getCaptures(forgeId: string): Promise<Capture[]> {
    const { data, error } = await this.supabase
      .from("captures")
      .select("*")
      .eq("forge_id", forgeId)
      .order("uploaded_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching captures:", error)
      return []
    }
    return data || []
  }

  async getCapturesByDigitalTwin(digitalTwinId: string): Promise<Capture[]> {
    const { data, error } = await this.supabase
      .from("captures")
      .select("*")
      .eq("digital_twin_id", digitalTwinId)
      .order("uploaded_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching captures by digital twin:", error)
      return []
    }
    return data || []
  }

  async createCapture(capture: Tables["captures"]["Insert"]): Promise<Capture | null> {
    const { data, error } = await this.supabase.from("captures").insert(capture).select().single()

    if (error) {
      console.error("[v0] Error creating capture:", error)
      throw new Error(error.message)
    }
    return data
  }

  async updateCaptureStatus(id: string, status: "pending" | "validated" | "rejected"): Promise<Capture | null> {
    const { data, error } = await this.supabase.from("captures").update({ status }).eq("id", id).select().single()

    if (error) {
      console.error("[v0] Error updating capture status:", error)
      return null
    }
    return data
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PREVIEWS
  // ─────────────────────────────────────────────────────────────────────────────

  async getPreviews(digitalTwinId: string): Promise<Preview[]> {
    const { data, error } = await this.supabase
      .from("previews")
      .select("*")
      .eq("digital_twin_id", digitalTwinId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching previews:", error)
      return []
    }
    return data || []
  }

  async getActivePreviews(): Promise<Preview[]> {
    const { data, error } = await this.supabase
      .from("previews")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching active previews:", error)
      return []
    }
    return data || []
  }

  async createPreview(preview: Tables["previews"]["Insert"]): Promise<Preview | null> {
    const { data, error } = await this.supabase.from("previews").insert(preview).select().single()

    if (error) {
      console.error("[v0] Error creating preview:", error)
      throw new Error(error.message)
    }

    await this.addAuditLog({
      actor_id: preview.created_by,
      actor_name: "System",
      action: "PREVIEW_GENERATED",
      target_table: "previews",
      target_id: data.id,
      digital_twin_id: preview.digital_twin_id,
      metadata: { preview_type: preview.preview_type },
    })

    return data
  }

  async expirePreview(id: string): Promise<boolean> {
    const { error } = await this.supabase.from("previews").update({ status: "expired" }).eq("id", id)

    if (error) {
      console.error("[v0] Error expiring preview:", error)
      return false
    }
    return true
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LICENSES
  // ─────────────────────────────────────────────────────────────────────────────

  async getLicenses(): Promise<License[]> {
    const { data, error } = await this.supabase.from("licenses").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching licenses:", error)
      return []
    }
    return data || []
  }

  async getLicensesByDigitalTwin(digitalTwinId: string): Promise<License[]> {
    const { data, error } = await this.supabase
      .from("licenses")
      .select("*")
      .eq("digital_twin_id", digitalTwinId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching licenses by digital twin:", error)
      return []
    }
    return data || []
  }

  async getLicensesByClient(clientId: string): Promise<License[]> {
    const { data, error } = await this.supabase
      .from("licenses")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching licenses by client:", error)
      return []
    }
    return data || []
  }

  async getActiveLicenses(): Promise<License[]> {
    const { data, error } = await this.supabase
      .from("licenses")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching active licenses:", error)
      return []
    }
    return data || []
  }

  async createLicense(license: Tables["licenses"]["Insert"]): Promise<License | null> {
    const { data, error } = await this.supabase.from("licenses").insert(license).select().single()

    if (error) {
      console.error("[v0] Error creating license:", error)
      throw new Error(error.message)
    }

    await this.addAuditLog({
      actor_id: license.created_by,
      actor_name: "System",
      action: "LICENSE_ACTIVATED",
      target_table: "licenses",
      target_id: data.id,
      digital_twin_id: license.digital_twin_id,
      model_id: license.model_id,
    })

    return data
  }

  async revokeLicense(id: string, reason: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("licenses")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error revoking license:", error)
      return false
    }

    await this.addAuditLog({
      actor_id: userId,
      actor_name: "System",
      action: "LICENSE_REVOKED",
      target_table: "licenses",
      target_id: id,
      digital_twin_id: data.digital_twin_id,
      metadata: { reason },
    })

    return true
  }

  async incrementDownloadCount(id: string): Promise<boolean> {
    const { error } = await this.supabase.rpc("record_asset_download", {
      asset_id_param: id,
      license_id_param: id,
      user_id_param: id,
    })

    if (error) {
      // Fallback to manual increment
      const { error: updateError } = await this.supabase
        .from("licenses")
        .update({ current_downloads: this.supabase.rpc("increment_downloads") })
        .eq("id", id)

      if (updateError) {
        console.error("[v0] Error incrementing downloads:", updateError)
        return false
      }
    }
    return true
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTRACTS
  // ─────────────────────────────────────────────────────────────────────────────

  async getContracts(): Promise<Contract[]> {
    const { data, error } = await this.supabase.from("contracts").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching contracts:", error)
      return []
    }
    return data || []
  }

  async getContractsByModel(modelId: string): Promise<Contract[]> {
    const { data, error } = await this.supabase
      .from("contracts")
      .select("*")
      .eq("model_id", modelId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching contracts by model:", error)
      return []
    }
    return data || []
  }

  async getContractsByBrand(brandId: string): Promise<Contract[]> {
    const { data, error } = await this.supabase
      .from("contracts")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching contracts by brand:", error)
      return []
    }
    return data || []
  }

  async signContract(id: string): Promise<Contract | null> {
    const { data, error } = await this.supabase
      .from("contracts")
      .update({
        signed: true,
        signed_at: new Date().toISOString(),
        status: "signed",
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error signing contract:", error)
      return null
    }
    return data
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VISUAL ASSETS
  // ─────────────────────────────────────────────────────────────────────────────

  async getVisualAssets(digitalTwinId: string): Promise<VisualAsset[]> {
    const { data, error } = await this.supabase
      .from("visual_assets")
      .select("*")
      .eq("digital_twin_id", digitalTwinId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching visual assets:", error)
      return []
    }
    return data || []
  }

  async getLicensedAssets(digitalTwinId: string, licenseId?: string): Promise<VisualAsset[]> {
    let query = this.supabase
      .from("visual_assets")
      .select("*")
      .eq("digital_twin_id", digitalTwinId)
      .eq("asset_type", "LICENSED")

    if (licenseId) {
      query = query.eq("license_id", licenseId)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching licensed assets:", error)
      return []
    }
    return data || []
  }

  async createVisualAsset(asset: Tables["visual_assets"]["Insert"]): Promise<VisualAsset | null> {
    const { data, error } = await this.supabase.from("visual_assets").insert(asset).select().single()

    if (error) {
      console.error("[v0] Error creating visual asset:", error)
      throw new Error(error.message)
    }
    return data
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VTG JOBS
  // ─────────────────────────────────────────────────────────────────────────────

  async getVTGJobs(digitalTwinId: string): Promise<VTGJob[]> {
    const { data, error } = await this.supabase
      .from("vtg_jobs")
      .select("*")
      .eq("digital_twin_id", digitalTwinId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching VTG jobs:", error)
      return []
    }
    return data || []
  }

  async createVTGJob(job: Tables["vtg_jobs"]["Insert"]): Promise<VTGJob | null> {
    const { data, error } = await this.supabase.from("vtg_jobs").insert(job).select().single()

    if (error) {
      console.error("[v0] Error creating VTG job:", error)
      throw new Error(error.message)
    }
    return data
  }

  async updateVTGJobStatus(
    id: string,
    status: "queued" | "processing" | "done" | "failed",
    result?: Record<string, unknown>,
  ): Promise<VTGJob | null> {
    const updates: Tables["vtg_jobs"]["Update"] = { status }

    if (result) {
      updates.result = result
    }

    if (status === "done" || status === "failed") {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await this.supabase.from("vtg_jobs").update(updates).eq("id", id).select().single()

    if (error) {
      console.error("[v0] Error updating VTG job status:", error)
      return null
    }
    return data
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CERTIFICATES
  // ─────────────────────────────────────────────────────────────────────────────

  async getCertificates(): Promise<Certificate[]> {
    const { data, error } = await this.supabase
      .from("certificates")
      .select("*")
      .order("issued_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching certificates:", error)
      return []
    }
    return data || []
  }

  async getCertificate(id: string): Promise<Certificate | null> {
    const { data, error } = await this.supabase.from("certificates").select("*").eq("id", id).single()

    if (error) {
      console.error("[v0] Error fetching certificate:", error)
      return null
    }
    return data
  }

  async getCertificateByDigitalTwin(digitalTwinId: string): Promise<Certificate | null> {
    const { data, error } = await this.supabase
      .from("certificates")
      .select("*")
      .eq("digital_twin_id", digitalTwinId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("[v0] Error fetching certificate by digital twin:", error)
    }
    return data || null
  }

  async createCertificate(cert: Tables["certificates"]["Insert"]): Promise<Certificate | null> {
    const { data, error } = await this.supabase.from("certificates").insert(cert).select().single()

    if (error) {
      console.error("[v0] Error creating certificate:", error)
      throw new Error(error.message)
    }
    return data
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BRANDS
  // ─────────────────────────────────────────────────────────────────────────────

  async getBrands(): Promise<Brand[]> {
    const { data, error } = await this.supabase.from("brands").select("*").order("name", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching brands:", error)
      return []
    }
    return data || []
  }

  async getBrand(id: string): Promise<Brand | null> {
    const { data, error } = await this.supabase.from("brands").select("*").eq("id", id).single()

    if (error) {
      console.error("[v0] Error fetching brand:", error)
      return null
    }
    return data
  }

  async getBrandByUserId(userId: string): Promise<Brand | null> {
    const { data, error } = await this.supabase.from("brands").select("*").eq("user_id", userId).single()

    if (error && error.code !== "PGRST116") {
      console.error("[v0] Error fetching brand by user:", error)
    }
    return data || null
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BRAND-MODEL RELATIONSHIPS
  // ─────────────────────────────────────────────────────────────────────────────

  async getBrandModels(brandId: string): Promise<BrandModel[]> {
    const { data, error } = await this.supabase.from("brand_models").select("*").eq("brand_id", brandId)

    if (error) {
      console.error("[v0] Error fetching brand models:", error)
      return []
    }
    return data || []
  }

  async addModelToBrand(brandId: string, modelId: string, status = "shortlisted"): Promise<BrandModel | null> {
    const { data, error } = await this.supabase
      .from("brand_models")
      .insert({ brand_id: brandId, model_id: modelId, status })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error adding model to brand:", error)
      return null
    }
    return data
  }

  async updateBrandModelStatus(id: string, status: string): Promise<BrandModel | null> {
    const { data, error } = await this.supabase.from("brand_models").update({ status }).eq("id", id).select().single()

    if (error) {
      console.error("[v0] Error updating brand model status:", error)
      return null
    }
    return data
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AUDIT LOGS
  // ─────────────────────────────────────────────────────────────────────────────

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    const { data, error } = await this.supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[v0] Error fetching audit logs:", error)
      return []
    }
    return data || []
  }

  async getAuditLogsByActor(actorId: string, limit = 50): Promise<AuditLog[]> {
    const { data, error } = await this.supabase
      .from("audit_logs")
      .select("*")
      .eq("actor_id", actorId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[v0] Error fetching audit logs by actor:", error)
      return []
    }
    return data || []
  }

  async addAuditLog(log: Tables["audit_logs"]["Insert"]): Promise<AuditLog | null> {
    const { data, error } = await this.supabase.from("audit_logs").insert(log).select().single()

    if (error) {
      console.error("[v0] Error adding audit log:", error)
      return null
    }
    return data
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATISTICS
  // ─────────────────────────────────────────────────────────────────────────────

  async getStats(): Promise<{
    totalModels: number
    activeModels: number
    pendingConsent: number
    totalForges: number
    certifiedForges: number
    inProgressForges: number
    forgesByState: Record<string, number>
    activePreviews: number
    activeLicenses: number
    totalAssets: number
  }> {
    const [models, forges, previews, licenses, assets] = await Promise.all([
      this.getModels(),
      this.getForges(),
      this.getActivePreviews(),
      this.getActiveLicenses(),
      this.supabase.from("visual_assets").select("id", { count: "exact" }),
    ])

    const forgesByState: Record<string, number> = {}
    FORGE_STATES.forEach((state) => {
      forgesByState[state] = forges.filter((f) => f.state === state).length
    })

    return {
      totalModels: models.length,
      activeModels: models.filter((m) => m.status === "active").length,
      pendingConsent: models.filter((m) => !m.consent_given).length,
      totalForges: forges.length,
      certifiedForges: forges.filter((f) => f.state === "CERTIFIED").length,
      inProgressForges: forges.filter((f) => f.state !== "CERTIFIED").length,
      forgesByState,
      activePreviews: previews.length,
      activeLicenses: licenses.length,
      totalAssets: assets.count || 0,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REALTIME SUBSCRIPTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  subscribeToTable<T extends keyof Tables>(
    table: T,
    callback: (payload: { eventType: string; new: Tables[T]["Row"]; old: Tables[T]["Row"] }) => void,
    filter?: { column: string; value: string },
  ): () => void {
    const channelName = filter ? `${table}_${filter.column}_${filter.value}` : table

    if (this.realtimeChannels.has(channelName)) {
      return () => {}
    }

    let channel = this.supabase.channel(channelName)

    const config: Parameters<typeof channel.on>[1] = {
      event: "*",
      schema: "public",
      table: table as string,
    }

    if (filter) {
      config.filter = `${filter.column}=eq.${filter.value}`
    }

    channel = channel.on("postgres_changes", config, (payload) => {
      callback({
        eventType: payload.eventType,
        new: payload.new as Tables[T]["Row"],
        old: payload.old as Tables[T]["Row"],
      })
    })

    channel.subscribe()
    this.realtimeChannels.set(channelName, channel)

    return () => {
      channel.unsubscribe()
      this.realtimeChannels.delete(channelName)
    }
  }

  unsubscribeAll(): void {
    this.realtimeChannels.forEach((channel) => {
      channel.unsubscribe()
    })
    this.realtimeChannels.clear()
  }
}

// Singleton instance
let dataStoreInstance: SupabaseDataStore | null = null

export function getDataStore(): SupabaseDataStore {
  if (!dataStoreInstance) {
    dataStoreInstance = new SupabaseDataStore()
  }
  return dataStoreInstance
}

export const dataStore = typeof window !== "undefined" ? getDataStore() : null
