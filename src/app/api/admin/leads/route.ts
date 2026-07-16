import { NextResponse } from 'next/server';
import { supabaseAdmin, verifyAdminAuth } from '@/lib/authAdmin';

export const runtime = 'edge';

export async function GET(request: Request) {
  const user = await verifyAdminAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    let query = supabaseAdmin.from('leads').select('*').order('created_at', { ascending: false });

    if (user.role === 'sales') {
      // Find vehicles owned by the sales user
      const { data: vehicles } = await supabaseAdmin.from('vehicles').select('id').eq('user_id', user.id);
      const vehicleIds = vehicles?.map(v => v.id) || [];
      
      if (vehicleIds.length > 0) {
        query = query.in('vehicle_id', vehicleIds);
      } else {
        // If they have no vehicles, they have no leads
        return NextResponse.json({ leads: [] });
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return NextResponse.json({ leads: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await verifyAdminAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, status } = await request.json();
    if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });

    if (user.role === 'sales') {
      // Check if lead belongs to their vehicle
      const { data: lead } = await supabaseAdmin.from('leads').select('vehicle_id').eq('id', id).single();
      if (!lead?.vehicle_id) return NextResponse.json({ error: 'Proibido' }, { status: 403 });
      
      const { data: vData } = await supabaseAdmin.from('vehicles').select('user_id').eq('id', lead.vehicle_id).single();
      if (!vData || vData.user_id !== user.id) {
        return NextResponse.json({ error: 'Proibido: Não podes alterar este lead' }, { status: 403 });
      }
    }

    const { error } = await supabaseAdmin.from('leads').update({ status }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
