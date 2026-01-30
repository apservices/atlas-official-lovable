'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LoadingCard } from '@/components/loading-state'
import { CertificateHashGenerator } from '@/components/certificate-hash-generator'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Edit2, Save, X } from 'lucide-react'

interface ModelProfile {
  id: string
  full_name: string
  email: string
  city: string | null
  phone: string | null
  status: string
  user_id: string
}

interface ModelStats {
  total_captures: number
  valid_captures: number
  missing_captures: number
  previews_generated: number
  active_licenses: number
  linked_contracts: number
}

export default function ModelProfilePage() {
  const [profile, setProfile] = useState<ModelProfile | null>(null)
  const [stats, setStats] = useState<ModelStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ city: '', phone: '' })
  const [saving, setSaving] = useState(false)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return <Alert><AlertDescription>Supabase não configurado</AlertDescription></Alert>
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          setError('Usuário não autenticado')
          return
        }

        // Get model profile
        const { data: modelData, error: modelError } = await supabase
          .from('models')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (modelError) {
          setError('Perfil de modelo não encontrado')
          return
        }

        setProfile(modelData)
        setEditData({ city: modelData.city || '', phone: modelData.phone || '' })

        // Get model stats
        const { count: totalCaptures } = await supabase
          .from('captures')
          .select('*', { count: 'exact' })
          .eq('model_id', modelData.id)

        const { count: validCaptures } = await supabase
          .from('captures')
          .select('*', { count: 'exact' })
          .eq('model_id', modelData.id)
          .eq('status', 'validated')

        const { count: previewsGenerated } = await supabase
          .from('previews')
          .select('*', { count: 'exact' })
          .eq('digital_twin_id', modelData.id)
          .eq('status', 'active')

        const { count: activeLicenses } = await supabase
          .from('licenses')
          .select('*', { count: 'exact' })
          .eq('model_id', modelData.id)
          .eq('status', 'active')

        const { count: linkedContracts } = await supabase
          .from('contracts')
          .select('*', { count: 'exact' })
          .eq('model_id', modelData.id)

        setStats({
          total_captures: totalCaptures || 0,
          valid_captures: validCaptures || 0,
          missing_captures: Math.max(0, (totalCaptures || 0) - (validCaptures || 0)),
          previews_generated: previewsGenerated || 0,
          active_licenses: activeLicenses || 0,
          linked_contracts: linkedContracts || 0,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar perfil')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleSave = async () => {
    if (!profile) return
    
    try {
      setSaving(true)
      const { error } = await supabase
        .from('models')
        .update({
          city: editData.city || null,
          phone: editData.phone || null,
        })
        .eq('id', profile.id)

      if (error) {
        setError('Erro ao salvar perfil')
        return
      }

      setProfile({ ...profile, ...editData })
      setIsEditing(false)
    } finally {
      setSaving(false)
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

  if (!profile || !stats) return <LoadingCard />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{profile.full_name}</h1>
          <p className="text-gray-500 mt-1">{profile.email}</p>
        </div>
        <Badge variant={profile.status === 'active' ? 'default' : 'secondary'}>
          {profile.status.toUpperCase()}
        </Badge>
      </div>

      {/* Contact Information Card */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Informações de Contato</h2>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Editar
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label>Cidade</Label>
              <Input
                value={editData.city}
                onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                placeholder="Sua cidade"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                placeholder="Seu telefone"
                type="tel"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setEditData({ city: profile.city || '', phone: profile.phone || '' })
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Cidade</p>
              <p className="font-medium">{profile.city || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Telefone</p>
              <p className="font-medium">{profile.phone || 'Não informado'}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Total de Capturas"
          value={stats.total_captures}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          label="Capturas Válidas"
          value={stats.valid_captures}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
        />
        <StatCard
          label="Capturas Faltantes"
          value={stats.missing_captures}
          icon={<AlertCircle className="h-5 w-5 text-yellow-500" />}
        />
        <StatCard
          label="Previews Gerados"
          value={stats.previews_generated}
          icon={<CheckCircle2 className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          label="Licenças Ativas"
          value={stats.active_licenses}
          icon={<CheckCircle2 className="h-5 w-5 text-purple-500" />}
        />
        <StatCard
          label="Contratos Vinculados"
          value={stats.linked_contracts}
          icon={<CheckCircle2 className="h-5 w-5 text-orange-500" />}
        />
      </div>

      {/* Certificate Hash Generator */}
      {profile && <CertificateHashGenerator modelId={profile.id} />}
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
