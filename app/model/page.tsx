'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LoadingCard } from '@/components/loading-state'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Camera, Eye, FileText, BarChart3, FileCheck } from 'lucide-react'

interface ModelData {
  id: string
  full_name: string
  email: string
  city: string | null
  phone: string | null
  status: string
}

interface Capture {
  id: string
  file_name: string
  status: string
  uploaded_at: string
  asset_type: string
}

interface Preview {
  id: string
  preview_type: string
  created_at: string
  approved: boolean
}

interface License {
  id: string
  status: string
  valid_from: string
  valid_until: string
  usage_type: string
}

interface Contract {
  id: string
  brand_name: string
  status: string
  signed: boolean
  created_at: string
}

interface AuditLog {
  id: string
  action: string
  created_at: string
  metadata: any
}

export default function ModelPortal() {
  const [modelData, setModelData] = useState<ModelData | null>(null)
  const [captures, setCaptures] = useState<Capture[]>([])
  const [previews, setPreviews] = useState<Preview[]>([])
  const [licenses, setLicenses] = useState<License[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
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

        // Get model data
        const { data: model, error: modelError } = await supabase
          .from('models')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (modelError || !model) {
          setError('Modelo não encontrado')
          return
        }

        setModelData(model)

        // Get captures
        const { data: capturesData } = await supabase
          .from('captures')
          .select('*')
          .eq('model_id', model.id)
          .order('uploaded_at', { ascending: false })

        setCaptures(capturesData || [])

        // Get previews
        const { data: previewsData } = await supabase
          .from('previews')
          .select('*')
          .eq('digital_twin_id', model.id)
          .order('created_at', { ascending: false })

        setPreviews(previewsData || [])

        // Get licenses
        const { data: licensesData } = await supabase
          .from('licenses')
          .select('*')
          .eq('model_id', model.id)
          .order('created_at', { ascending: false })

        setLicenses(licensesData || [])

        // Get contracts
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('*')
          .eq('model_id', model.id)
          .order('created_at', { ascending: false })

        setContracts(contractsData || [])

        // Get audit logs for this model
        const { data: logsData } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('model_id', model.id)
          .order('created_at', { ascending: false })
          .limit(50)

        setAuditLogs(logsData || [])
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

  if (!modelData) return <LoadingCard />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Meu Perfil de Modelo</h1>
        <p className="text-gray-500 mt-1">{modelData.email}</p>
      </div>

      {/* Profile Summary */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-xl font-semibold mb-4">Informações Pessoais</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Nome</p>
            <p className="font-medium">{modelData.full_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium">{modelData.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Cidade</p>
            <p className="font-medium">{modelData.city || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Telefone</p>
            <p className="font-medium">{modelData.phone || '-'}</p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="captures" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="captures" className="gap-2">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Capturas</span>
            <span className="sm:hidden">{captures.length}</span>
          </TabsTrigger>
          <TabsTrigger value="previews" className="gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Previews</span>
            <span className="sm:hidden">{previews.length}</span>
          </TabsTrigger>
          <TabsTrigger value="licenses" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Licenças</span>
            <span className="sm:hidden">{licenses.length}</span>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Contratos</span>
            <span className="sm:hidden">{contracts.length}</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Auditoria</span>
          </TabsTrigger>
        </TabsList>

        {/* Captures Tab */}
        <TabsContent value="captures">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Minhas Capturas ({captures.length})</h3>
            {captures.length === 0 ? (
              <p className="text-gray-500">Nenhuma captura realizada</p>
            ) : (
              <div className="space-y-2">
                {captures.map((capture) => (
                  <div key={capture.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">{capture.file_name}</p>
                      <p className="text-sm text-gray-500">{capture.asset_type}</p>
                    </div>
                    <span className={`text-sm font-medium ${
                      capture.status === 'validated' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {capture.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Previews Tab */}
        <TabsContent value="previews">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Meus Previews ({previews.length})</h3>
            {previews.length === 0 ? (
              <p className="text-gray-500">Nenhum preview gerado</p>
            ) : (
              <div className="space-y-2">
                {previews.map((preview) => (
                  <div key={preview.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">{preview.preview_type}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(preview.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className={`text-sm font-medium ${
                      preview.approved ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {preview.approved ? 'Aprovado' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Licenses Tab */}
        <TabsContent value="licenses">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Minhas Licenças ({licenses.length})</h3>
            {licenses.length === 0 ? (
              <p className="text-gray-500">Nenhuma licença ativa</p>
            ) : (
              <div className="space-y-2">
                {licenses.map((license) => (
                  <div key={license.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">{license.usage_type}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(license.valid_from).toLocaleDateString('pt-BR')} até{' '}
                        {new Date(license.valid_until).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className={`text-sm font-medium ${
                      license.status === 'active' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {license.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Meus Contratos ({contracts.length})</h3>
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
                    <span className={`text-sm font-medium ${
                      contract.signed ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {contract.signed ? 'Assinado' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Histórico de Auditoria</h3>
            {auditLogs.length === 0 ? (
              <p className="text-gray-500">Nenhum log disponível</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-start p-3 border rounded">
                    <div>
                      <p className="font-medium">{log.action}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleDateString('pt-BR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
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
