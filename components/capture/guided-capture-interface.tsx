"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import type { Database } from "@/lib/supabase/database.types"
import {
  GUIDED_CAPTURE_STEPS,
  captureSessionManager,
  validateCapturedImage,
  type CaptureSession,
  type GuidedCaptureStepId,
} from "@/lib/capture-session"
import { dataStore } from "@/lib/supabase/data-store"
import { getStorage } from "@/lib/supabase/storage"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  Check,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  EyeOff,
  User,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Forge = Database["public"]["Tables"]["forges"]["Row"]
type Model = Database["public"]["Tables"]["models"]["Row"]

interface GuidedCaptureInterfaceProps {
  forge: Forge
  model: Model
  onComplete: () => void
  onBack: () => void
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  face: <User className="w-6 h-6" />,
  "eye-closed": <EyeOff className="w-6 h-6" />,
  "arrow-right": <ArrowRight className="w-6 h-6" />,
  "arrow-left": <ArrowLeft className="w-6 h-6" />,
  "arrow-up": <ArrowUp className="w-6 h-6" />,
  "arrow-down": <ArrowDown className="w-6 h-6" />,
}

export function GuidedCaptureInterface({ forge, model, onComplete, onBack }: GuidedCaptureInterfaceProps) {
  const { user } = useAuth()
  const storage = getStorage()

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [session, setSession] = useState<CaptureSession | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [lastCapture, setLastCapture] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const currentStepIndex = session?.currentStepIndex ?? 0
  const currentStep = GUIDED_CAPTURE_STEPS[currentStepIndex] ?? null
  const completedSteps = session?.completedSteps ?? []

  const progress = GUIDED_CAPTURE_STEPS.length > 0 ? (completedSteps.length / GUIDED_CAPTURE_STEPS.length) * 100 : 0

  const isLastStep = currentStepIndex === GUIDED_CAPTURE_STEPS.length - 1
  const isStepComplete = currentStep ? completedSteps.includes(currentStep.id as GuidedCaptureStepId) : false

  // Initialize session
  useEffect(() => {
    if (!captureSessionManager) return

    const existing = captureSessionManager.getActiveSessionForForge(forge.id)
    if (existing && existing.mode === "GUIDED") {
      setSession(existing)
    } else {
      const created = captureSessionManager.createSession(forge.id, "GUIDED")
      setSession(created)
    }

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [forge.id])

  // Start camera
  useEffect(() => {
    if (!session) return

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
            setIsCameraReady(true)
          }
        }
      } catch (err) {
        if (err instanceof Error) {
          setCameraError(
            err.name === "NotAllowedError"
              ? "Camera permission denied. Please allow access."
              : `Failed to start camera: ${err.message}`,
          )
        }
      }
    }

    startCamera()
  }, [session])

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !session || !user || !currentStep || !dataStore) return

    setIsCapturing(true)
    setValidationError(null)

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas unavailable")

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Mirror the image for front-facing camera
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0)

      const imageData = canvas.toDataURL("image/jpeg", 0.95)
      setLastCapture(imageData)

      setIsValidating(true)
      await new Promise((r) => setTimeout(r, 500))

      const validation = validateCapturedImage(imageData, currentStep.id)

      if (!validation.valid) {
        setValidationError(validation.error || "Validation failed")
        captureSessionManager.addCapturedImage(session.id, currentStep.id, imageData, false)
        return
      }

      captureSessionManager.addCapturedImage(session.id, currentStep.id, imageData, true)

      // Convert data URL to Blob for upload
      const response = await fetch(imageData)
      const blob = await response.blob()
      const file = new File([blob], `capture_${currentStep.id}.jpg`, { type: "image/jpeg" })

      // Upload to Supabase Storage
      if (storage) {
        const uploadResult = await storage.uploadFile("captures", `${forge.id}/${currentStep.id}.jpg`, file, {
          upsert: true,
        })

        if (uploadResult) {
          // Create capture record in database
          await dataStore.createCapture({
            model_id: model.id,
            forge_id: forge.id,
            digital_twin_id: forge.digital_twin_id,
            angle: currentStep.id,
            file_name: `capture_${currentStep.id}.jpg`,
            asset_url: uploadResult.url,
            asset_type: "PHOTO",
            file_size: blob.size,
            mime_type: "image/jpeg",
            resolution_width: canvas.width,
            resolution_height: canvas.height,
            stage: "CAPTURE",
            status: "validated",
          })
        }
      }

      // Add audit log
      await dataStore.addAuditLog({
        actor_id: user.id,
        actor_name: user.name || "Unknown",
        action: "CAPTURE_UPLOADED",
        target_table: "captures",
        target_id: forge.id,
        forge_id: forge.id,
        model_id: forge.model_id,
        metadata: { angle: currentStep.id, mode: "GUIDED" },
      })

      // Update forge progress
      await dataStore.updateForgeProgress(forge.id, completedSteps.length + 1)

      const updated = captureSessionManager.getSession(session.id)
      if (updated) setSession({ ...updated })

      toast.success("Capture validated")

      if (!isLastStep) {
        setTimeout(handleNextStep, 1200)
      }
    } catch (e) {
      setValidationError(e instanceof Error ? e.message : "Capture failed")
    } finally {
      setIsCapturing(false)
      setIsValidating(false)
    }
  }, [
    session,
    user,
    currentStep,
    forge.id,
    forge.digital_twin_id,
    forge.model_id,
    completedSteps.length,
    isLastStep,
    storage,
  ])

  const handleNextStep = () => {
    if (!session) return
    captureSessionManager.advanceToNextStep(session.id)
    const updated = captureSessionManager.getSession(session.id)
    if (updated) setSession({ ...updated })
    setLastCapture(null)
    setValidationError(null)
  }

  const handleRetake = () => {
    setLastCapture(null)
    setValidationError(null)
  }

  const handleCompleteSession = async () => {
    if (!session || !user || !dataStore) return

    captureSessionManager.completeSession(session.id)

    const result = await dataStore.transitionForge(forge.id, "CAPTURED", user.id)
    if (result.success) {
      await dataStore.addAuditLog({
        actor_id: user.id,
        actor_name: user.name || "Unknown",
        action: "FORGE_STATE_CHANGED",
        target_table: "forges",
        target_id: forge.id,
        forge_id: forge.id,
        model_id: forge.model_id,
        metadata: { from: "CREATED", to: "CAPTURED", captureMode: "GUIDED" },
      })
      toast.success("Capture session completed!")
    }

    onComplete()
  }

  // Camera error state
  if (cameraError) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Camera Error</h3>
          <p className="text-sm text-muted-foreground mb-6">{cameraError}</p>
          <Button onClick={onBack}>Back to Mode Selection</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Guided Capture
              </CardTitle>
              <CardDescription>
                {model.name} — Step {currentStepIndex + 1} of {GUIDED_CAPTURE_STEPS.length}
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono">
              {forge.id.slice(0, 8)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />

            {/* Step Indicators */}
            <div className="flex gap-1">
              {GUIDED_CAPTURE_STEPS.map((step, i) => (
                <div
                  key={step.id}
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    i < currentStepIndex ? "bg-primary" : i === currentStepIndex ? "bg-primary/50" : "bg-muted",
                  )}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step Instructions */}
      {currentStep && (
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {STEP_ICONS[currentStep.icon] || <Camera className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{currentStep.id.replace(/-/g, " ").toUpperCase()}</h3>
                <p className="text-sm text-muted-foreground">{currentStep.instruction}</p>
              </div>
              {isStepComplete && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Captured
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera View */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-0 relative aspect-[3/4] md:aspect-video bg-black">
          {/* Loading State */}
          {!isCameraReady && !lastCapture && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}

          {/* Video Preview */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn("w-full h-full object-cover scale-x-[-1]", lastCapture && "hidden")}
          />

          {/* Captured Image Preview */}
          {lastCapture && (
            <img
              src={lastCapture || "/placeholder.svg"}
              alt="Captured"
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          )}

          {/* Validation Overlay */}
          {isValidating && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                <p className="text-sm text-foreground">Validating capture...</p>
              </div>
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-lg bg-destructive/90 text-destructive-foreground">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-sm">{validationError}</p>
              </div>
            </div>
          )}

          {/* Hidden Canvas for Capture */}
          <canvas ref={canvasRef} className="hidden" />
        </CardContent>

        {/* Controls */}
        <CardContent className="p-4 border-t border-border">
          <div className="flex items-center justify-center gap-4">
            {!lastCapture && (
              <Button
                size="lg"
                onClick={capturePhoto}
                disabled={!isCameraReady || isCapturing || isStepComplete}
                className="w-16 h-16 rounded-full"
              >
                {isCapturing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
              </Button>
            )}

            {lastCapture && validationError && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleRetake}
                className="w-16 h-16 rounded-full bg-transparent"
              >
                <RefreshCw className="w-6 h-6" />
              </Button>
            )}

            {isLastStep && isStepComplete && (
              <Button size="lg" onClick={handleCompleteSession}>
                Complete Session
                <Check className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Back Button */}
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Mode Selection
      </Button>
    </div>
  )
}
