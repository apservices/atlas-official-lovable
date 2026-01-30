'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { LoadingCard } from '@/components/loading-state'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, FileText, DollarSign, User, Building2 } from 'lucide-react'

interface ContractDetail {
  id: string
  model_id: string
  brand_id: string | null
  brand_name: string
  license_id: string
  status: string
  signed: boolean
  signed_at: string | null
  created_at: string
  contract_url: string | null
}

interface ModelInfo {
  id: string
  full_name: string
  email: string
  city: string | null
}

interface BrandInfo {
  id: string
  name: string
  website: string | null
}

interface LicenseInfo {
  id: string
  usage_type: string
  valid_from: string
  valid_until: string
  status: string
  current_downloads: number
  max_downloads: number | null
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

export default function ContractDetailPage() {
  const params = useParams()
  const contractId = params?.id as string

  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [brandInfo, setBrandInfo] = useState<BrandInfo | null>(null)
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return <Alert><AlertDescription>Supabase não configurado</AlertDescription></Alert>
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true)

        // Get contract
        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contractId)
          .single()

        if (contractError || !contractData) {
          setError('Contrato não encontrado')
          return
        }

        setContract(contractData)

        // Get model info
        const { data: modelData } = await supabase
          .from('models')
          .select('*')
          .eq('id', contractData.model_id)
          .single()

        if (modelData) setModelInfo(modelData)

        // Get brand info if available
        if (contractData.brand_id) {
          const { data: brandData } = await supabase
            .from('brands')
            .select('*')
            .eq('id', contractData.brand_id)
            .single()

          if (brandData) setBrandInfo(brandData)
        }

        // Get license info
        const { data: licenseData } = await supabase
          .from('licenses')
          .select('*')
          .eq('id', contractData.license_id)
          .single()

        if (licenseData) setLicenseInfo(licenseData)

        // Get transactions linked to this contract
        const { data: txnData } = await supabase
          .from('financeiro_transacoes')
          .select('*')
          .eq('license_id', contractData.license_id)
          .order('created_at', { ascending: false })

        setTransactions(txnData || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar contrato')
      } finally {
        setLoading(false)
      }
    }

    if (contractId) fetchContract()
  }, [contractId])

  const handleMarkAsSigned = async () => {
    if (!contract) return

    try {
      setMarking(true)

      const { error } = await supabase
        .from('contracts')
        .update({
          signed: true,
          signed_at: new Date().toISOString(),
          status: 'signed',
        })
        .eq('id', contract.id)

      if (error) {
        setError('Erro ao marcar como assinado')
        return
      }

      setContract({
        ...contract,
        signed: true,
        signed_at: new Date().toISOString(),
        status: 'signed',
      })
    } finally {
      setMarking(false)
    }
  }

  if (loading) return <LoadingCard />

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!contract) return <LoadingCard />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Contract Details</h1>
          <p className="text-gray-500 mt-1">ID: {contract.id.slice(0, 8)}...</p>
        </div>
        <Badge variant={contract.signed ? 'default' : 'secondary'}>
          {contract.signed ? 'SIGNED' : 'PENDING'}
        </Badge>
      </div>

      {/* Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model Card */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Model</h2>
          </div>
          {modelInfo ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{modelInfo.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{modelInfo.email}</p>
              </div>
              {modelInfo.city && (
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium">{modelInfo.city}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Loading...</p>
          )}
        </Card>

        {/* Brand Card */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-semibold">Brand</h2>
          </div>
          {brandInfo ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{brandInfo.name}</p>
              </div>
              {brandInfo.website && (
                <div>
                  <p className="text-sm text-gray-600">Website</p>
                  <a
                    href={brandInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {brandInfo.website}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600">Brand Name</p>
              <p className="font-medium">{contract.brand_name}</p>
            </div>
          )}
        </Card>
      </div>

      {/* License Card */}
      {licenseInfo && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">Linked License</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Usage Type</p>
              <p className="font-medium">{licenseInfo.usage_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Valid From</p>
              <p className="font-medium">{new Date(licenseInfo.valid_from).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Valid Until</p>
              <p className="font-medium">{new Date(licenseInfo.valid_until).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <Badge variant={licenseInfo.status === 'active' ? 'default' : 'secondary'}>
                {licenseInfo.status}
              </Badge>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">Downloads</p>
            <p className="font-medium">
              {licenseInfo.current_downloads}
              {licenseInfo.max_downloads ? ` / ${licenseInfo.max_downloads}` : ' / Unlimited'}
            </p>
          </div>
        </Card>
      )}

      {/* Contract Details Card */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Contract Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">Created Date</p>
            <p className="font-medium">{new Date(contract.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <Badge variant={contract.signed ? 'default' : 'secondary'}>
              {contract.status.toUpperCase()}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-600">Signed</p>
            <Badge variant={contract.signed ? 'default' : 'secondary'}>
              {contract.signed ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Yes - {new Date(contract.signed_at || '').toLocaleDateString('pt-BR')}
                </>
              ) : (
                'Pending Signature'
              )}
            </Badge>
          </div>
        </div>

        {!contract.signed && (
          <Button onClick={handleMarkAsSigned} disabled={marking} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {marking ? 'Marking...' : 'Mark as Signed'}
          </Button>
        )}
      </Card>

      {/* Financial History */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-semibold">Financial History</h2>
        </div>

        {transactions.length === 0 ? (
          <p className="text-gray-500">No transactions found</p>
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
    </div>
  )
}
