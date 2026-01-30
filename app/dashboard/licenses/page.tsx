"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Header } from "@/components/dashboard/header"
import { LicenseList } from "@/components/licenses/license-list"
import { LicenseCreator } from "@/components/licenses/license-creator"
import { LicenseStats } from "@/components/licenses/license-stats"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dataStore } from "@/lib/data-store"
import { phase2Store } from "@/lib/phase2-store"
import { useAuth } from "@/lib/auth-context"
import type { Forge, Model, License } from "@/lib/types"
import { Shield, CheckCircle2, AlertCircle, Calendar, Download, FileText, Eye } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadingCard } from "@/components/loading-state"
import { LoadingState } from "@/components/loading-state"


interface SupabaseLicense {
  id: string
  model_id: string
  client_id: string
  status: string
  valid_from: string
  valid_until: string
  usage_type: string
  current_downloads: number
  max_downloads: number | null
}

export default function LicensesPage() {
  const { user } = useAuth()
  const [certifiedForges, setCertifiedForges] = useState<Forge[]>([])
  const [models, setModels] = useState<Map<string, Model>>(new Map())
  const [licenses, setLicenses] = useState<License[]>([])
  const [supabaseLicenses, setSupabaseLicenses] = useState<SupabaseLicense[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [loadingSupa, setLoadingSupa] = useState(true)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Fetch from Supabase
  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) return

    const supabase = createClient(supabaseUrl, supabaseKey)

    const fetchSupabaseLicenses = async () => {
      try {
        const { data, error } = await supabase
          .from("licenses")
          .select("*")
          .order("created_at", { ascending: false })

        if (!error) {
          setSupabaseLicenses(data || [])
        }
      } finally {
        setLoadingSupa(false)
      }
    }

    fetchSupabaseLicenses()
  }, [refreshKey])

  // Fetch from local stores
  useEffect(() => {
    if (dataStore && phase2Store) {
      const forges = dataStore.getForges().filter((f) => f.state === "CERTIFIED" && f.digitalTwinId)
      setCertifiedForges(forges)

      const modelMap = new Map<string, Model>()
      dataStore.getModels().forEach((m) => modelMap.set(m.id, m))
      setModels(modelMap)

      if (user?.role === "CLIENT" && user.linkedClientId) {
        setLicenses(phase2Store.getLicensesByClient(user.linkedClientId))
      } else {
        const allLicenses: License[] = []
        forges.forEach((f) => {
          if (f.digitalTwinId) {
            allLicenses.push(...phase2Store.getLicensesByDigitalTwin(f.digitalTwinId))
          }
        })
        setLicenses(allLicenses)
      }
    }
  }, [user, refreshKey])

  const handleLicenseCreated = () => {
    setRefreshKey((k) => k + 1)
  }

  const handleLicenseRevoked = () => {
    setRefreshKey((k) => k + 1)
  }

  const isClient = user?.role === "CLIENT"
  const canCreate = user?.role === "ADMIN" || user?.role === "OPERATOR"

  const isExpired = (date: string) => new Date(date) < new Date()
  const isExpiringSoon = (date: string) => {
    const daysUntilExpiry = Math.floor((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30
  }

  return (
    <div>
      <Header title="License Engine" description="Manage commercial usage licenses" />

      <div className="p-6 space-y-6">
        {/* Access notice */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">License Management</p>
            <p className="text-xs text-muted-foreground">
              {isClient
                ? "View your active licenses and usage rights."
                : "Control usage rights, territory, and validity periods for commercial licenses."}
            </p>
          </div>
        </div>

        {/* Stats */}
        <LicenseStats licenses={licenses} />

        {canCreate ? (
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList className="bg-muted">
              <TabsTrigger value="list">All Licenses</TabsTrigger>
              <TabsTrigger value="supabase">Professional Licenses</TabsTrigger>
              <TabsTrigger value="create">Create License</TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              <LicenseList
                licenses={licenses}
                models={models}
                certifiedForges={certifiedForges}
                canRevoke={!isClient}
                onRevoked={handleLicenseRevoked}
              />
            </TabsContent>

            <TabsContent value="supabase">
              <div className="space-y-4">
                {loadingSupa ? (
                  <LoadingCard />
                ) : supabaseLicenses.length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-gray-500">No licenses found</p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {supabaseLicenses.map((license) => (
                      <Card key={license.id} className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{license.usage_type}</h3>
                            <p className="text-sm text-gray-500">License ID: {license.id.slice(0, 8)}...</p>
                          </div>
                          <div className="flex gap-2">
                            {isExpired(license.valid_until) ? (
                              <Badge variant="destructive">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Expired
                              </Badge>
                            ) : isExpiringSoon(license.valid_until) ? (
                              <Badge variant="secondary">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Expiring Soon
                              </Badge>
                            ) : (
                              <Badge variant="default">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Valid From</p>
                            <p className="font-medium flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(license.valid_from).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Valid Until</p>
                            <p className="font-medium flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(license.valid_until).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Downloads</p>
                            <p className="font-medium">
                              {license.current_downloads}{license.max_downloads ? ` / ${license.max_downloads}` : ' / ∞'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <p className="font-medium">{license.status}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-2">
                            <FileText className="w-4 h-4" />
                            View Contract
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Eye className="w-4 h-4" />
                            Released Assets
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Download History
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="create">
              <LicenseCreator certifiedForges={certifiedForges} models={models} onCreated={handleLicenseCreated} />
            </TabsContent>
          </Tabs>
        ) : (
          <LicenseList
            licenses={licenses}
            models={models}
            certifiedForges={certifiedForges}
            canRevoke={false}
            onRevoked={handleLicenseRevoked}
          />
        )}
      </div>
    </div>
  )
}
