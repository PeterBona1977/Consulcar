import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// We need to disable static generation for this dynamic route if we don't know IDs ahead of time
export const revalidate = 60; // Revalidate every 60 seconds

export default async function VendorProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;

  // Fetch the user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (profileError || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <h2>Vendedor não encontrado</h2>
        <Link href="/" style={{ color: '#00d2ff', marginTop: '20px' }}>Voltar à página inicial</Link>
      </div>
    );
  }

  // Fetch the seller's vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', paddingBottom: '100px' }}>
      
      {/* Cover Image */}
      <div style={{ 
        height: '300px', 
        width: '100%', 
        background: profile.cover_image ? `url(${profile.cover_image}) center/cover` : '#222',
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', bottom: '-60px', left: '10%', display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
          {profile.profile_image ? (
            <img 
              src={profile.profile_image} 
              alt={profile.name || "Vendedor"} 
              style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #0a0a0a' }} 
            />
          ) : (
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: '#333', border: '4px solid #0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
              👤
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '80px auto 0', padding: '0 20px' }}>
        
        {/* Profile Info */}
        <div style={{ marginBottom: '50px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{profile.name || "Vendedor Consulcar"}</h1>
          {profile.phone && (
            <div style={{ fontSize: '1.2rem', color: '#00d2ff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📞 {profile.phone}
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', marginTop: '30px' }}>
            {profile.biography && (
              <div>
                <h3 style={{ color: '#888', marginBottom: '15px' }}>Sobre</h3>
                <p style={{ lineHeight: '1.6', color: '#ccc' }}>{profile.biography}</p>
              </div>
            )}
            
            {profile.history && (
              <div>
                <h3 style={{ color: '#888', marginBottom: '15px' }}>Experiência & Histórico</h3>
                <p style={{ lineHeight: '1.6', color: '#ccc' }}>{profile.history}</p>
              </div>
            )}
          </div>
        </div>

        {/* Seller's Vehicles */}
        <h2 style={{ fontSize: '2rem', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '15px' }}>Viaturas deste Vendedor</h2>
        
        {vehicles && vehicles.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
            {vehicles.map(v => (
              <Link href={`/viaturas/${v.id}`} key={v.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ background: '#111', borderRadius: '12px', overflow: 'hidden', border: '1px solid #222', transition: 'transform 0.2s' }}>
                  {v.image ? (
                    <img src={v.image} alt={v.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '200px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sem imagem</div>
                  )}
                  <div style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>{v.title}</h3>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#00d2ff' }}>{v.price}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ color: '#888', fontSize: '1.1rem' }}>Este vendedor não tem viaturas ativas no momento.</p>
        )}

      </div>
    </div>
  );
}
