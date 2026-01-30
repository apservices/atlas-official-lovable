"use client"

import { createClient } from "./client"

export type StorageBucket = "captures" | "previews" | "assets" | "contracts" | "avatars"

class SupabaseStorage {
  private supabase = createClient()

  /**
   * Upload a file to a storage bucket
   */
  async uploadFile(
    bucket: StorageBucket,
    path: string,
    file: File,
    options?: { upsert?: boolean },
  ): Promise<{ url: string; path: string } | null> {
    const { data, error } = await this.supabase.storage.from(bucket).upload(path, file, {
      upsert: options?.upsert ?? false,
      contentType: file.type,
    })

    if (error) {
      console.error(`[v0] Error uploading to ${bucket}:`, error)
      throw new Error(error.message)
    }

    const {
      data: { publicUrl },
    } = this.supabase.storage.from(bucket).getPublicUrl(data.path)

    return {
      url: publicUrl,
      path: data.path,
    }
  }

  /**
   * Get a signed URL for private bucket access
   */
  async getSignedUrl(bucket: StorageBucket, path: string, expiresIn = 3600): Promise<string | null> {
    const { data, error } = await this.supabase.storage.from(bucket).createSignedUrl(path, expiresIn)

    if (error) {
      console.error(`[v0] Error getting signed URL from ${bucket}:`, error)
      return null
    }

    return data.signedUrl
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: StorageBucket, path: string): Promise<boolean> {
    const { error } = await this.supabase.storage.from(bucket).remove([path])

    if (error) {
      console.error(`[v0] Error deleting from ${bucket}:`, error)
      return false
    }

    return true
  }

  /**
   * List files in a directory
   */
  async listFiles(bucket: StorageBucket, path?: string): Promise<{ name: string; id: string }[]> {
    const { data, error } = await this.supabase.storage.from(bucket).list(path)

    if (error) {
      console.error(`[v0] Error listing files from ${bucket}:`, error)
      return []
    }

    return data || []
  }

  /**
   * Upload multiple capture images
   */
  async uploadCaptures(
    modelId: string,
    files: File[],
    onProgress?: (uploaded: number, total: number) => void,
  ): Promise<{ url: string; path: string; fileName: string; angle: string }[]> {
    const results: { url: string; path: string; fileName: string; angle: string }[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const angle = `angle-${String(i + 1).padStart(3, "0")}`
      const extension = file.name.split(".").pop() || "jpg"
      const path = `captures/${modelId}/${angle}.${extension}`

      try {
        console.log(`[Storage] Uploading file ${i + 1}/${files.length}: ${file.name} (${file.size} bytes)`)
        const result = await this.uploadFile("captures", path, file, { upsert: true })
        if (result) {
          console.log(`[Storage] Successfully uploaded: ${result.path}`)
          results.push({
            ...result,
            fileName: file.name,
            angle,
          })
        } else {
          console.error(`[Storage] Upload returned null for: ${file.name}`)
        }
      } catch (error) {
        console.error(`[Storage] Error uploading capture ${i + 1}:`, error)
        throw error // Re-throw to let caller handle
      }

      onProgress?.(i + 1, files.length)
    }

    console.log(`[Storage] Upload complete. Successfully uploaded ${results.length}/${files.length} files`)
    return results
  }

  /**
   * Upload a preview image
   */
  async uploadPreview(
    digitalTwinId: string,
    file: File,
    previewType: string,
  ): Promise<{ url: string; path: string } | null> {
    const extension = file.name.split(".").pop() || "jpg"
    const timestamp = Date.now()
    const path = `previews/${digitalTwinId}/${previewType}_${timestamp}.${extension}`

    return this.uploadFile("previews", path, file, { upsert: false })
  }

  /**
   * Upload a visual asset
   */
  async uploadAsset(
    licenseId: string,
    file: File,
    category: string,
  ): Promise<{ url: string; path: string } | null> {
    const extension = file.name.split(".").pop() || "png"
    const timestamp = Date.now()
    const path = `assets/${licenseId}/${category}_${timestamp}.${extension}`

    return this.uploadFile("assets", path, file, { upsert: false })
  }

  /**
   * Upload an avatar
   */
  async uploadAvatar(userId: string, file: File): Promise<{ url: string; path: string } | null> {
    const extension = file.name.split(".").pop() || "jpg"
    const path = `avatars/${userId}.png`

    return this.uploadFile("avatars", path, file, { upsert: true })
  }

  /**
   * Get public URL for an avatar
   */
  getAvatarUrl(userId: string): string {
    const { data } = this.supabase.storage.from("avatars").getPublicUrl(`avatars/${userId}.png`)
    return data.publicUrl
  }
}

// Singleton instance
let storageInstance: SupabaseStorage | null = null

export function getStorage(): SupabaseStorage {
  if (!storageInstance) {
    storageInstance = new SupabaseStorage()
  }
  return storageInstance
}

export const storage = typeof window !== "undefined" ? getStorage() : null
