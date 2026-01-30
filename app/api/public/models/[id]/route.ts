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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: modelId } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get model data
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('*')
      .eq('id', modelId)
      .single()

    if (modelError || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }

    // Get capture counts
    const { count: totalCaptures } = await supabase
      .from('captures')
      .select('*', { count: 'exact' })
      .eq('model_id', modelId)

    const { count: validCaptures } = await supabase
      .from('captures')
      .select('*', { count: 'exact' })
      .eq('model_id', modelId)
      .eq('status', 'validated')

    // Get preview counts
    const { count: previewsGenerated } = await supabase
      .from('previews')
      .select('*', { count: 'exact' })
      .eq('digital_twin_id', modelId)
      .eq('status', 'active')

    // Get license counts
    const { count: activeLicenses } = await supabase
      .from('licenses')
      .select('*', { count: 'exact' })
      .eq('model_id', modelId)
      .eq('status', 'active')

    return NextResponse.json({
      id: model.id,
      full_name: model.full_name,
      email: model.email,
      city: model.city,
      phone: model.phone,
      status: model.status,
      plan_type: model.plan_type,
      created_at: model.created_at,
      stats: {
        total_captures: totalCaptures || 0,
        valid_captures: validCaptures || 0,
        previews_generated: previewsGenerated || 0,
        active_licenses: activeLicenses || 0,
      },
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
