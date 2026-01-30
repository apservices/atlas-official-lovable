import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// API KEY protection middleware
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.API_KEY_PUBLIC
  return apiKey === expectedKey && !!expectedKey
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const licenseId = params.id
    const { id } = context.params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get license data
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', licenseId)
      .single()

    if (licenseError || !license) {
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      )
    }

    // Get model info
    const { data: model } = await supabase
      .from('models')
      .select('full_name, email')
      .eq('id', license.model_id)
      .single()

    // Get client info
    const { data: client } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', license.client_id)
      .single()

    // Get linked contract
    const { data: contract } = await supabase
      .from('contracts')
      .select('*')
      .eq('license_id', licenseId)
      .single()

    return NextResponse.json({
      id: license.id,
      status: license.status,
      usage_type: license.usage_type,
      valid_from: license.valid_from,
      valid_until: license.valid_until,
      territory: license.territory,
      max_downloads: license.max_downloads,
      current_downloads: license.current_downloads,
      model: {
        id: license.model_id,
        name: model?.full_name,
        email: model?.email,
      },
      client: {
        id: license.client_id,
        email: client?.email,
      },
      contract: contract ? {
        id: contract.id,
        status: contract.status,
        signed: contract.signed,
      } : null,
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
