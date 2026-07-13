import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Criamos um cliente admin que usa a SERVICE_ROLE_KEY
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Middleware manual para verificar se quem faz o pedido está logado
async function verifyAdminAuth(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !data.user) return null;
  return data.user;
}

export async function GET(request: Request) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const safeUsers = data.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at
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

    const { email, password } = await request.json();
    if (!email || !password) return NextResponse.json({ error: 'Email e Password são obrigatórios' }, { status: 400 });

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Para não obrigar a clicar no email de verificação
    });

    if (error) throw error;

    return NextResponse.json({ user: { id: data.user.id, email: data.user.email } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const url = new URL(request.url);
    const userId = url.searchParams.get('id');
    
    if (!userId) return NextResponse.json({ error: 'ID do utilizador é obrigatório' }, { status: 400 });
    
    // Evitar que o administrador se apague a si próprio por engano
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
