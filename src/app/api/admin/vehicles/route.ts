import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verifyAdminAuth(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !data.user) return null;
  return data.user;
}

export async function POST(request: Request) {
  const user = await verifyAdminAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const vehicleData = await request.json();
    const { data, error } = await supabaseAdmin.from('vehicles').insert([vehicleData]).select();
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, vehicle: data ? data[0] : null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await verifyAdminAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, ...vehicleData } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing vehicle ID' }, { status: 400 });

    const { error } = await supabaseAdmin.from('vehicles').update(vehicleData).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await verifyAdminAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing vehicle ID' }, { status: 400 });

    const { error } = await supabaseAdmin.from('vehicles').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
