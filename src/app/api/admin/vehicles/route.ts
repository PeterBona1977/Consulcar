import { NextResponse } from 'next/server';
import { supabaseAdmin, verifyAdminAuth } from '@/lib/authAdmin';

export const runtime = 'edge';

export async function POST(request: Request) {
  const user = await verifyAdminAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const vehicleData = await request.json();
    
    // Assign the vehicle to the user creating it
    const { data, error } = await supabaseAdmin.from('vehicles').insert([{
      ...vehicleData,
      user_id: user.id
    }]).select();
    
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

    // Check ownership if sales
    if (user.role === 'sales') {
      const { data: vData } = await supabaseAdmin.from('vehicles').select('user_id').eq('id', id).single();
      if (!vData || vData.user_id !== user.id) {
        return NextResponse.json({ error: 'Proibido: Não és o dono desta viatura' }, { status: 403 });
      }
    }

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

    // Check ownership if sales
    if (user.role === 'sales') {
      const { data: vData } = await supabaseAdmin.from('vehicles').select('user_id').eq('id', id).single();
      if (!vData || vData.user_id !== user.id) {
        return NextResponse.json({ error: 'Proibido: Não és o dono desta viatura' }, { status: 403 });
      }
    }

    const { error } = await supabaseAdmin.from('vehicles').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
