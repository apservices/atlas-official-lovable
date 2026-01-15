"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { dataStore } from "@/lib/supabase/data-store"
import { useAuth } from "@/lib/auth-context"
import type { Database } from "@/lib/supabase/database.types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, ImageIcon, Loader2, AlertCircle, Check, X, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

type Forge = Database["public"]["Tables"]["forges"]["Row"]
type Model = Database["public"]["Tables"]["models"]["Row"]
type Capture = Database["public"]["Tables"]["captures"]["Row"]

export default function CaptureViewerPage() {
  const { user } = useAuth()
  const [selectedDigitalTwinId, setSelectedDigitalTwinId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [forges, setForges] = useState<Forge[]>([])
  const [models, setModels] = useState<Map<string, Model>>(new Map())
  const [captures, setCaptures] = useState<Capture[]>([])
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null)

  useEffect(() => {
    loadForges()
  }, [user])

  const loadForges = async () => {
    setIsLoading(true)
    try {
      if (!dataStore) return

      const allForges = await dataStore.getForges()

      // For models, only show their own forge
      if (user?.role === "model" && user.linkedModelId) {
        const modelForges = allForges.filter((f) => f.model_id === user.linkedModelId)
        setForges(modelForges)
      } else {
        // Admin can see all forges with captures
        const forgesWithCaptures = allForges.filter((f) => f.state !== "CREATED" && f.digital_twin_id)
        setForges(forgesWithCaptures)
      }

      // Load all models
      const allModels = await dataStore.getModels()
      const modelMap = new Map<string, Model>()
      allModels.forEach((m) => modelMap.set(m.id, m))
      setModels(modelMap)
    } catch (error) {
      console.error("[v0] Error loading forges:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCaptures = async (digitalTwinId: string) => {
    try {
      if (!dataStore) return
      const captureData = await dataStore.getCapturesByDigitalTwin(digitalTwinId)
      setCaptures(captureData)
    } catch (error) {
      console.error("[v0] Error loading captures:", error)
    }
  }

  useEffect(() => {
    if (selectedDigitalTwinId) {
      loadCaptures(selectedDigitalTwinId)
    } else {
      setCaptures([])
    }
    setSelectedCapture(null)
  }, [selectedDigitalTwinId])

  const selectedForge = forges.find((f) => f.digital_twin_id === selectedDigitalTwinId)
  const selectedModel = selectedForge ? models.get(selectedForge.model_id) : undefined

  const validatedCount = captures.filter((c) => c.status === "validated").length
  const pendingCount = captures.filter((c) => c.status === "pending").length
  const rejectedCount = captures.filter((c) => c.status === "rejected").length

  if (isLoading) {
    return (
      <div>
        <Header title="Capture Viewer" description="Review and validate captured biometric data" />
        <div className="p-6">
          <Card className="bg-card border-border">
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading capture data...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Capture Viewer" description="Review and validate captured biometric data" />

      <div className="p-6 space-y-6">
        {/* Selector */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Select Digital Twin
            </CardTitle>
            <CardDescription>Choose a certified digital twin to view its captures</CardDescription>
          </CardHeader>
          <CardContent>
            {forges.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">No digital twins available</p>
                  <p className="text-xs text-muted-foreground">Complete the capture process to view captures here.</p>
                </div>
              </div>
            ) : (
              <Select value={selectedDigitalTwinId || undefined} onValueChange={setSelectedDigitalTwinId}>
                <SelectTrigger className="w-full max-w-md bg-input border-border">
                  <SelectValue placeholder="Select a digital twin..." />
                </SelectTrigger>
                <SelectContent>
                  {forges.map((forge) => {
                    const model = models.get(forge.model_id)
                    return (
                      <SelectItem key={forge.id} value={forge.digital_twin_id || forge.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{forge.digital_twin_id || forge.id.slice(0, 8)}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{model?.name || "Unknown"}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {forge.state}
                          </Badge>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {selectedForge && selectedModel ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Validated</p>
                      <p className="text-2xl font-bold text-emerald-400">{validatedCount}</p>
                    </div>
                    <Check className="w-8 h-8 text-emerald-400/30" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
                    </div>
                    <RefreshCw className="w-8 h-8 text-amber-400/30" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Rejected</p>
                      <p className="text-2xl font-bold text-destructive">{rejectedCount}</p>
                    </div>
                    <X className="w-8 h-8 text-destructive/30" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Capture Grid */}
              <div className="lg:col-span-2">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Captures</CardTitle>
                    <CardDescription>
                      {captures.length} captures for {selectedModel.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {captures.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-sm text-muted-foreground">No captures found</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                        {captures.map((capture) => (
                          <button
                            key={capture.id}
                            type="button"
                            onClick={() => setSelectedCapture(capture)}
                            className={cn(
                              "relative aspect-square rounded-lg overflow-hidden bg-muted transition-all",
                              "hover:ring-2 hover:ring-primary/50",
                              selectedCapture?.id === capture.id && "ring-2 ring-primary",
                            )}
                          >
                            <img
                              src={capture.file_url || "/placeholder.svg?height=100&width=100&query=portrait"}
                              alt={capture.angle || "Capture"}
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                            />
                            <div
                              className={cn(
                                "absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center",
                                capture.status === "validated" && "bg-emerald-500",
                                capture.status === "pending" && "bg-amber-500",
                                capture.status === "rejected" && "bg-destructive",
                              )}
                            >
                              {capture.status === "validated" && <Check className="w-2.5 h-2.5 text-white" />}
                              {capture.status === "pending" && <RefreshCw className="w-2.5 h-2.5 text-white" />}
                              {capture.status === "rejected" && <X className="w-2.5 h-2.5 text-white" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Selected Capture Details */}
              <div>
                <Card className="bg-card border-border sticky top-6">
                  <CardHeader>
                    <CardTitle className="text-foreground">Capture Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedCapture ? (
                      <div className="space-y-4">
                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                          <img
                            src={selectedCapture.file_url || "/placeholder.svg?height=400&width=300&query=portrait"}
                            alt={selectedCapture.angle || "Capture"}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Angle</span>
                            <Badge variant="outline">{selectedCapture.angle}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge
                              className={cn(
                                selectedCapture.status === "validated" &&
                                  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                                selectedCapture.status === "pending" &&
                                  "bg-amber-500/20 text-amber-400 border-amber-500/30",
                                selectedCapture.status === "rejected" &&
                                  "bg-destructive/20 text-destructive border-destructive/30",
                              )}
                            >
                              {selectedCapture.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Resolution</span>
                            <span className="text-sm text-foreground">
                              {selectedCapture.resolution_width}x{selectedCapture.resolution_height}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Uploaded</span>
                            <span className="text-sm text-foreground">
                              {new Date(selectedCapture.uploaded_at || "").toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {user?.role === "admin" && selectedCapture.status === "pending" && (
                          <div className="flex gap-2 pt-4 border-t border-border">
                            <Button
                              size="sm"
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                              onClick={async () => {
                                if (dataStore) {
                                  await dataStore.updateCaptureStatus(selectedCapture.id, "validated")
                                  loadCaptures(selectedDigitalTwinId)
                                }
                              }}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Validate
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={async () => {
                                if (dataStore) {
                                  await dataStore.updateCaptureStatus(selectedCapture.id, "rejected")
                                  loadCaptures(selectedDigitalTwinId)
                                }
                              }}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">Select a capture to view details</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Eye className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No Digital Twin Selected</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Select a digital twin from the dropdown above to view its captures.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
