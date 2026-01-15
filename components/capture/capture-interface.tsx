"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import type { Database } from "@/lib/supabase/database.types"
import { dataStore } from "@/lib/supabase/data-store"
import { getStorage } from "@/lib/supabase/storage"
import { useAuth } from "@/lib/auth-context"
import { CaptureModeSelector, type CaptureMode } from "./capture-mode-selector"
import { GuidedCaptureInterface } from "./guided-capture-interface"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, Check, X, Loader2, ImageIcon, AlertCircle, Camera } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Forge = Database["public"]["Tables"]["forges"]["Row"]
type Model = Database["public"]["Tables"]["models"]["Row"]

interface CaptureInterfaceProps {
  forge: Forge
  model: Model
  onComplete: () => void
}

interface UploadedFile {
  file: File
  preview: string
  status: "pending" | "uploading" | "success" | "error"
  error?: string
  url?: string
}

export function CaptureInterface({ forge, model, onComplete }: CaptureInterfaceProps) {
  const { user } = useAuth()
  const [selectedMode, setSelectedMode] = useState<CaptureMode | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const storage = getStorage()

  const handleModeSelected = useCallback((mode: CaptureMode) => {
    setSelectedMode(mode)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedMode(null)
    setUploadedFiles([])
  }, [])

  const handleFilesSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newFiles: UploadedFile[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])
  }, [])

  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }, [])

  const handleUpload = async () => {
    if (!user || !dataStore || !storage || uploadedFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const filesToUpload = uploadedFiles.filter((f) => f.status === "pending").map((f) => f.file)

      // Upload to Supabase Storage
      const results = await storage.uploadCaptures(forge.id, filesToUpload, (uploaded, total) => {
        setUploadProgress((uploaded / total) * 100)
      })

      // Create capture records in database
      for (const result of results) {
        await dataStore.createCapture({
          forge_id: forge.id,
          digital_twin_id: forge.digital_twin_id,
          angle: result.angle,
          file_name: result.fileName,
          file_url: result.url,
          file_path: result.path,
          file_size: 0, // Will be updated after processing
          mime_type: "image/jpeg",
          resolution_width: 0,
          resolution_height: 0,
          capture_type: "PHOTO",
          status: "pending",
          uploaded_by: user.id,
        })
      }

      // Update forge progress
      const currentProgress = forge.capture_progress || 0
      await dataStore.updateForgeProgress(forge.id, currentProgress + results.length)

      // Add audit log
      await dataStore.addAuditLog({
        actor_id: user.id,
        actor_name: user.name || "Unknown",
        action: "CAPTURES_UPLOADED",
        target_table: "captures",
        target_id: forge.id,
        forge_id: forge.id,
        model_id: forge.model_id,
        metadata: {
          count: results.length,
          mode: "MANUAL",
        },
      })

      // Update file statuses
      setUploadedFiles((prev) =>
        prev.map((f, i) =>
          i < results.length
            ? { ...f, status: "success" as const, url: results[i]?.url }
            : { ...f, status: "error" as const, error: "Upload failed" },
        ),
      )

      toast.success(`${results.length} captures uploaded successfully`)

      // Check if we should transition to CAPTURED state
      if ((forge.capture_progress || 0) + results.length >= 54) {
        const result = await dataStore.transitionForge(forge.id, "CAPTURED", user.id)
        if (result.success) {
          toast.success("Forge transitioned to CAPTURED state")
          onComplete()
        }
      }
    } catch (error) {
      console.error("[v0] Upload error:", error)
      toast.error("Failed to upload captures")
      setUploadedFiles((prev) => prev.map((f) => ({ ...f, status: "error" as const, error: "Upload failed" })))
    } finally {
      setIsUploading(false)
    }
  }

  // Show mode selector if no mode selected
  if (!selectedMode) {
    return <CaptureModeSelector onModeSelected={handleModeSelected} />
  }

  // Show guided capture interface
  if (selectedMode === "GUIDED") {
    return <GuidedCaptureInterface forge={forge} model={model} onComplete={onComplete} onBack={handleBack} />
  }

  // Manual upload interface
  const pendingCount = uploadedFiles.filter((f) => f.status === "pending").length
  const successCount = uploadedFiles.filter((f) => f.status === "success").length

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Manual Upload
              </CardTitle>
              <CardDescription>
                {model.name} — {forge.capture_progress || 0}/72 captures
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono">
              {forge.id.slice(0, 8)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Capture Progress</span>
              <span className="text-foreground">{Math.round(((forge.capture_progress || 0) / 72) * 100)}%</span>
            </div>
            <Progress value={((forge.capture_progress || 0) / 72) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Upload Captures</CardTitle>
          <CardDescription>Select multiple images to upload. Supported formats: JPG, PNG, WebP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
              "hover:border-primary/50 hover:bg-primary/5",
              "border-border bg-muted/30",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-foreground font-medium mb-1">Click to select files</p>
            <p className="text-sm text-muted-foreground">or drag and drop images here</p>
          </div>

          {/* File Preview Grid */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {uploadedFiles.length} file(s) selected • {successCount} uploaded
                </p>
                {pendingCount > 0 && (
                  <Button onClick={handleUpload} disabled={isUploading} size="sm">
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload {pendingCount}
                      </>
                    )}
                  </Button>
                )}
              </div>

              {isUploading && <Progress value={uploadProgress} className="h-2" />}

              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={file.preview || "/placeholder.svg"}
                      alt={`Capture ${index + 1}`}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />

                    {/* Status Overlay */}
                    <div
                      className={cn(
                        "absolute inset-0 flex items-center justify-center",
                        file.status === "success" && "bg-emerald-500/20",
                        file.status === "error" && "bg-destructive/20",
                        file.status === "uploading" && "bg-background/50",
                      )}
                    >
                      {file.status === "success" && <Check className="w-6 h-6 text-emerald-400" />}
                      {file.status === "error" && <AlertCircle className="w-6 h-6 text-destructive" />}
                      {file.status === "uploading" && <Loader2 className="w-6 h-6 text-primary animate-spin" />}
                    </div>

                    {/* Remove Button */}
                    {file.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-foreground" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {uploadedFiles.length === 0 && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-foreground">No files selected</p>
                <p className="text-xs text-muted-foreground">Upload capture images to continue the forge process</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Back Button */}
      <Button variant="ghost" onClick={handleBack}>
        Back to Mode Selection
      </Button>
    </div>
  )
}
