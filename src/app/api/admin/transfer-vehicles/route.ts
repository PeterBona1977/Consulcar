import { NextResponse } from 'next/server';
import { supabaseAdmin, verifyAdminAuth } from '@/lib/authAdmin';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'super_admin' && user.role !== 'admin') return NextResponse.json({ error: 'Apenas administradores podem transferir viaturas' }, { status: 403 });

    const { vehicle_id, from_user_id, to_user_id } = await request.json();
    
    if (!to_user_id) {
      return NextResponse.json({ error: 'O ID do novo utilizador (to_user_id) é obrigatório' }, { status: 400 });
    }

    if (vehicle_id) {
      // Transfer single vehicle
      const { error } = await supabaseAdmin.from('vehicles').update({ user_id: to_user_id }).eq('id', vehicle_id);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Viatura transferida com sucesso' });
    } else if (from_user_id) {
      // Transfer all vehicles from one user to another
      const { error } = await supabaseAdmin.from('vehicles').update({ user_id: to_user_id }).eq('user_id', from_user_id);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Viaturas transferidas com sucesso' });
    } else {
      return NextResponse.json({ error: 'Deve fornecer vehicle_id ou from_user_id' }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
