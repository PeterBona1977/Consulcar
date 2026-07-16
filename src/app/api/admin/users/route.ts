import { NextResponse } from 'next/server';
import { supabaseAdmin, verifyAdminAuth } from '@/lib/authAdmin';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role === 'sales') return NextResponse.json({ error: 'Proibido' }, { status: 403 });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    // Fetch roles
    const { data: rolesData, error: rolesError } = await supabaseAdmin.from('user_roles').select('*');
    if (rolesError) throw rolesError;
    
    const roleMap = new Map(rolesData.map(r => [r.user_id, r.role]));

    const safeUsers = authData.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      role: roleMap.get(u.id) || 'desconhecido'
    }));

    return NextResponse.json({ users: safeUsers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Apenas o super_admin pode criar utilizadores' }, { status: 403 });

    const { email, password, role } = await request.json();
    if (!email || !password || !role) return NextResponse.json({ error: 'Email, Password e Role são obrigatórios' }, { status: 400 });

    if (!['admin', 'sales'].includes(role)) {
      return NextResponse.json({ error: 'Role inválido' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) throw error;

    // Set role
    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
      user_id: data.user.id,
      role: role
    });

    if (roleError) {
      // Rollback user creation if role setting fails
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      throw roleError;
    }

    return NextResponse.json({ user: { id: data.user.id, email: data.user.email, role } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Apenas o super_admin pode apagar utilizadores' }, { status: 403 });

    const url = new URL(request.url);
    const userId = url.searchParams.get('id');
    
    if (!userId) return NextResponse.json({ error: 'ID do utilizador é obrigatório' }, { status: 400 });
    
    if (userId === user.id) {
      return NextResponse.json({ error: 'Não pode apagar a sua própria conta' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
