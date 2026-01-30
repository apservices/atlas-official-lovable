'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Copy, RefreshCw, Lock } from 'lucide-react'

interface CertificateHashGeneratorProps {
  modelId: string
  onHashGenerated?: (hash: string) => void
}

export function CertificateHashGenerator({ modelId, onHashGenerated }: CertificateHashGeneratorProps) {
  const [certificateHash, setCertificateHash] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) return null

  const supabase = createClient(supabaseUrl, supabaseKey)

  const handleGenerateHash = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      // Call the function to generate hash
      const { data: result, error: fnError } = await supabase
        .rpc('generate_certificate_hash', { model_id: modelId })

      if (fnError) {
        setError('Erro ao gerar hash de certificado')
        return
      }

      const hash = result as string

      // Store hash in database
      const { error: updateError } = await supabase
        .from('models')
        .update({ certificate_hash: hash })
        .eq('id', modelId)

      if (updateError) {
        setError('Erro ao armazenar hash')
        return
      }

      setCertificateHash(hash)
      setSuccess(true)

      if (onHashGenerated) {
        onHashGenerated(hash)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar hash')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyHash = () => {
    if (certificateHash) {
      navigator.clipboard.writeText(certificateHash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="h-5 w-5 text-purple-600" />
        <h3 className="text-lg font-semibold">Certification Hash (Blockchain Ready)</h3>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">Hash gerado com sucesso!</AlertDescription>
        </Alert>
      )}

      {certificateHash ? (
        <div className="space-y-3">
          <div className="bg-gray-50 p-4 rounded-lg break-all font-mono text-sm">
            {certificateHash}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCopyHash}
              variant="outline"
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copiado!' : 'Copiar Hash'}
            </Button>
            <Button
              onClick={handleGenerateHash}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Regenerar Hash
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Este hash pode ser usado para verificação em blockchain no futuro.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-gray-600">
            Gere um hash SHA256 único baseado no status atual do seu modelo (capturas, previews, licenças).
          </p>
          <Button
            onClick={handleGenerateHash}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Gerando...' : 'Generate Certification Hash'}
          </Button>
        </div>
      )}
    </Card>
  )
}
