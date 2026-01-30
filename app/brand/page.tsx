'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LoadingCard } from '@/components/loading-state'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Users, Eye, FileText, DollarSign, Award } from 'lucide-react'

interface BrandData {
  id: string
  name: string
  logo_url: string | null
  website: string | null
  user_id: string
}

interface LinkedModel {
  id: string
  full_name: string
  email: string
  city: string | null
  status: string
  total_captures: number
  valid_captures: number
  previews_generated: number
  active_licenses: number
}

interface ReleasedPreview {
  id: string
  preview_type: string
  model_id: string
  preview_url: string
  approved: boolean
  created_at: string
}

interface LicensedAsset {
  id: string
  asset_type: string
  model_id: string
  usage_type: string
  territory: string[]
  valid_until: string
  status: string
}

interface Contract {
  id: string
  model_id: string
  brand_name: string
  status: string
  signed: boolean
  created_at: string
}

interface Transaction {
  id: string
  amount: string
  currency: string
  transaction_type: string
  status: string
  created_at: string
  description: string
}

export default function BrandPortal() {
  const [brandData, setBrandData] = useState<BrandData | null>(null)
  const [linkedModels, setLinkedModels] = useState<LinkedModel[]>([])
  const [releasedPreviews, setReleasedPreviews] = useState<ReleasedPreview[]>([])
  const [licensedAssets, setLicensedAssets] = useState<LicensedAsset[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return <Alert><AlertDescription>Supabase não configurado</AlertDescription></Alert>
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          setError('Usuário não autenticado')
          return
        }

        // Get brand data
        const { data: brand, error: brandError } = await supabase
          .from('brands')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (brandError || !brand) {
          setError('Brand não encontrado')
          return
        }

        setBrandData(brand)

        // Get linked models via brand_models
        const { data: brandModelsData } = await supabase
          .from('brand_models')
          .select('model_id')
          .eq('brand_id', brand.id)

        if (brandModelsData && brandModelsData.length > 0) {
          const modelIds = brandModelsData.map((bm) => bm.model_id)

          const { data: modelsData } = await supabase
            .from('models')
            .select('*')
            .in('id', modelIds)

          // Fetch stats for each model
          const modelsWithStats = await Promise.all(
            (modelsData || []).map(async (model) => {
              const { count: totalCaptures } = await supabase
                .from('captures')
                .select('*', { count: 'exact' })
                .eq('model_id', model.id)

              const { count: validCaptures } = await supabase
                .from('captures')
                .select('*', { count: 'exact' })
                .eq('model_id', model.id)
                .eq('status', 'validated')

              const { count: previewsGenerated } = await supabase
                .from('previews')
                .select('*', { count: 'exact' })
                .eq('digital_twin_id', model.id)
                .eq('status', 'active')

              const { count: activeLicenses } = await supabase
                .from('licenses')
                .select('*', { count: 'exact' })
                .eq('model_id', model.id)
                .eq('status', 'active')

              return {
                ...model,
                total_captures: totalCaptures || 0,
                valid_captures: validCaptures || 0,
                previews_generated: previewsGenerated || 0,
                active_licenses: activeLicenses || 0,
              }
            })
          )

          setLinkedModels(modelsWithStats)
        }

        // Get released previews (approved)
        const { data: previewsData } = await supabase
          .from('previews')
          .select('*')
          .eq('approved', true)
          .order('created_at', { ascending: false })

        setReleasedPreviews(previewsData || [])

        // Get licensed assets
        const { data: assetsData } = await supabase
          .from('visual_assets')
          .select('*')
          .eq('watermarked', false)
          .order('created_at', { ascending: false })

        setLicensedAssets(assetsData || [])

        // Get contracts for this brand
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('*')
          .eq('brand_id', brand.id)
          .order('created_at', { ascending: false })

        setContracts(contractsData || [])

        // Get financial transactions
        const { data: transactionsData } = await supabase
          .from('financeiro_transacoes')
          .select('*')
          .eq('brand_id', brand.id)
          .order('created_at', { ascending: false })

        setTransactions(transactionsData || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <LoadingCard />

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!brandData) return <LoadingCard />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {brandData.logo_url && (
          <img src={brandData.logo_url} alt={brandData.name} className="w-16 h-16 rounded" />
        )}
        <div>
          <h1 className="text-3xl font-bold">{brandData.name}</h1>
          {brandData.website && (
            <a href={brandData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {brandData.website}
            </a>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Modelos Vinculados"
          value={linkedModels.length}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Previews Liberados"
          value={releasedPreviews.length}
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          label="Assets Licenciados"
          value={licensedAssets.length}
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          label="Transações"
          value={transactions.length}
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="models" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="models" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Modelos</span>
            <span className="sm:hidden">{linkedModels.length}</span>
          </TabsTrigger>
          <TabsTrigger value="previews" className="gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Previews</span>
            <span className="sm:hidden">{releasedPreviews.length}</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Assets</span>
            <span className="sm:hidden">{licensedAssets.length}</span>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Contratos</span>
            <span className="sm:hidden">{contracts.length}</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Financeiro</span>
          </TabsTrigger>
        </TabsList>

        {/* Models Tab */}
        <TabsContent value="models">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Modelos Vinculados</h3>
            {linkedModels.length === 0 ? (
              <p className="text-gray-500">Nenhum modelo vinculado</p>
            ) : (
              <div className="space-y-3">
                {linkedModels.map((model) => (
                  <div key={model.id} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold">{model.full_name}</p>
                        <p className="text-sm text-gray-500">{model.email}</p>
                        <p className="text-sm text-gray-500">{model.city || 'Localização não informada'}</p>
                      </div>
                      <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>
                        {model.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-gray-600">Capturas: {model.total_captures}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-gray-600">Válidas: {model.valid_captures}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-gray-600">Previews: {model.previews_generated}</p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-gray-600">Licenças: {model.active_licenses}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Previews Tab */}
        <TabsContent value="previews">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Previews Liberados</h3>
            {releasedPreviews.length === 0 ? (
              <p className="text-gray-500">Nenhum preview liberado</p>
            ) : (
              <div className="space-y-2">
                {releasedPreviews.map((preview) => (
                  <div key={preview.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">{preview.preview_type}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(preview.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Badge>Aprovado</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Assets Licenciados</h3>
            {licensedAssets.length === 0 ? (
              <p className="text-gray-500">Nenhum asset licenciado</p>
            ) : (
              <div className="space-y-2">
                {licensedAssets.map((asset) => (
                  <div key={asset.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">{asset.asset_type}</p>
                      <p className="text-sm text-gray-500">{asset.usage_type}</p>
                    </div>
                    <span className="text-sm font-medium">{asset.status}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Contratos</h3>
            {contracts.length === 0 ? (
              <p className="text-gray-500">Nenhum contrato</p>
            ) : (
              <div className="space-y-2">
                {contracts.map((contract) => (
                  <div key={contract.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">{contract.brand_name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(contract.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Badge variant={contract.signed ? 'default' : 'secondary'}>
                      {contract.signed ? 'Assinado' : 'Pendente'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Histórico Financeiro</h3>
            {transactions.length === 0 ? (
              <p className="text-gray-500">Nenhuma transação</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">{txn.transaction_type}</p>
                      <p className="text-sm text-gray-500">{txn.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{txn.amount} {txn.currency}</p>
                      <Badge variant={txn.status === 'pending' ? 'secondary' : 'default'}>
                        {txn.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="text-gray-400">{icon}</div>
      </div>
    </Card>
  )
}
