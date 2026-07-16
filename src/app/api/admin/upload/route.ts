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
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      const authHeader = request.headers.get('Authorization');
      const token = authHeader ? authHeader.replace('Bearer ', '') : '';
      
      const supabaseUserClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );

      const { data, error } = await supabaseUserClient.storage
        .from('vehicle-images')
        .upload(filePath, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', error);
        // Try fallback with admin client if service role key exists
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const { error: adminError } = await supabaseAdmin.storage
            .from('vehicle-images')
            .upload(filePath, buffer, {
              contentType: file.type || 'image/jpeg',
              upsert: false
            });
            
          if (adminError) {
             return NextResponse.json({ error: adminError.message }, { status: 500 });
          }
        } else {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('vehicle-images')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrlData.publicUrl);
    }

    return NextResponse.json({ success: true, urls: uploadedUrls });
  } catch (e: any) {
    console.error('Upload Error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
