"use client";

export const runtime = 'edge';
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ViaturaDetails() {
  const params = useParams();
  const router = useRouter();
  const [car, setCar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [activeImage, setActiveImage] = useState<string>("");

  useEffect(() => {
    const fetchCar = async () => {
      // In Next.js App Router, params might be a Promise or direct object depending on the hook version.
      // useParams() handles it gracefully on the client.
      const carId = params?.id;
      if (!carId) return;

      const { data } = await supabase.from('vehicles').select('*').eq('id', carId).single();
      if (data) {
        setCar(data);
        setActiveImage(data.image);
      }
      
      const { data: cms } = await supabase.from('site_settings').select('data').eq('id', 1).single();
      if (cms && cms.data) setSettings(cms.data);
      
      setLoading(false);
    };
    fetchCar();
  }, [params]);

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A carregar viatura premium...</div>;
  if (!car) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Viatura não encontrada.</div>;

  // Garantir que as imagens são um array e que a imagem principal está presente
  let imagesArray: string[] = [];
  if (Array.isArray(car.images)) {
    imagesArray = car.images;
  } else if (typeof car.images === 'string') {
    if (car.images.startsWith('[') || car.images.startsWith('{')) {
      try { 
        // Lida com JSON array ou Postgres array (convertendo {url} para [url])
        const parsed = JSON.parse(car.images.replace(/^\{/, '[').replace(/\}$/, ']')); 
        if (Array.isArray(parsed)) imagesArray = parsed;
      } catch(e) {}
    } else {
      // String separada por vírgulas
      imagesArray = car.images.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }
  
  // Se a array ficou vazia mas a car.image principal existe, usa só essa
  const images = imagesArray.length > 0 ? Array.from(new Set([car.image, ...imagesArray])).filter(Boolean) : [car.image].filter(Boolean);
  const specs = car.specs || {};

  return (
    <>
      {settings?.theme && (
        <style dangerouslySetInnerHTML={{__html: `
          :root {
            --accent-primary: ${settings.theme.primaryColor};
            --background-dark: ${settings.theme.backgroundColor};
            --text-primary: ${settings.theme.textColor};
          }
          body { background-color: var(--background-dark); color: var(--text-primary); }
        `}} />
      )}
      
      <header className="navbar" style={{ background: "rgba(5, 5, 5, 0.95)", borderBottom: "1px solid rgba(255,255,255,0.1)", position: "fixed", width: "100%", zIndex: 100 }}>
        <div className="container nav-content" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 0" }}>
          <Link href="/" className="logo" style={{ textDecoration: 'none', color: 'white', fontSize: "1.5rem", fontWeight: "bold" }}>
            {settings?.header?.logoText.replace('car', '') || 'Consul'}<span style={{ color: "var(--accent-primary)" }}>car</span>
          </Link>
          <button onClick={() => router.back()} className="btn btn-secondary" style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.9rem' }}>← Voltar</button>
        </div>
      </header>

      <main style={{ paddingTop: '120px', paddingBottom: '100px', minHeight: '100vh' }}>
        <div className="container">
          {/* Cabelhaçalho: Título e Preço (Mobile friendly) */}
          <div style={{ marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '10px', lineHeight: 1.1, letterSpacing: '-0.5px' }}>{car.title}</h1>
            <p style={{ color: 'var(--accent-primary)', fontSize: '2.5rem', fontWeight: 'bold' }}>{car.price}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '80px', alignItems: 'start', marginBottom: '60px' }}>
            
            {/* Coluna Esquerda: Galeria */}
            <div>
              <div style={{ width: '100%', aspectRatio: '4/3', maxHeight: '500px', borderRadius: '16px', overflow: 'hidden', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--surface-light, #111)' }}>
                <img src={activeImage} alt={car.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none' }}>
                {images.map((img: string, idx: number) => (
                  <div key={idx} onClick={() => setActiveImage(img)} style={{ width: '100px', height: '70px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: activeImage === img ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.2)', transition: 'all 0.2s' }}>
                    <img src={img} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna Direita: CTA Only */}
            <div className="car-details-sidebar" style={{ position: 'sticky', top: '100px' }}>
              {/* CTA Flutuante / Fixo na Coluna */}
              <div className="mobile-fixed-cta" style={{ background: 'var(--surface-light, rgba(20,20,20,0.5))', padding: '30px', borderRadius: '16px', border: '1px solid var(--accent-primary)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '15px' }}>Quer importar esta viatura?</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '25px', lineHeight: 1.5 }}>Tratamos de todo o processo de negociação, transporte, legalização e entrega chave-na-mão.</p>
                <Link href={`/?car=${car.id}#pedido`} className="btn btn-primary" style={{ display: 'block', fontSize: '1.2rem', padding: '16px', textAlign: 'center', borderRadius: '8px', width: '100%', fontWeight: 'bold' }}>
                  Pedir Proposta Chave-na-Mão
                </Link>
                {car.original_url && (
                  <a href={car.original_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: '20px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
                    Ver anúncio original no estrangeiro ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Secção a 100% da largura (Abaixo da grelha de Galeria / CTA) */}
          <div style={{ maxWidth: '100%', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '60px' }}>
            
            {/* Descrição Longa */}
            <div style={{ marginBottom: '60px' }}>
              <h3 style={{ marginBottom: '25px', color: 'rgba(255,255,255,1)', fontSize: '1.6rem', fontWeight: 'bold' }}>Sobre esta Viatura</h3>
              <div style={{ lineHeight: 1.9, color: 'rgba(255,255,255,0.75)', fontSize: '1.1rem', whiteSpace: 'pre-wrap', maxWidth: '1000px' }}>{car.description}</div>
            </div>

            {/* Dados Técnicos Detalhados */}
            <div style={{ marginBottom: '60px' }}>
              <h3 style={{ marginBottom: '25px', color: 'rgba(255,255,255,1)', fontSize: '1.3rem', fontWeight: 'bold' }}>Ficha Técnica</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'x 40px', columnGap: '60px', rowGap: '16px' }}>
                {Object.entries(specs).map(([key, value]) => {
                  if (key === 'equipment' || !value) return null;
                  
                  const labels: Record<string, string> = {
                    mileage: 'Quilometragem', year: 'Ano / Registo', fuel: 'Combustível', 
                    transmission: 'Caixa', power: 'Potência', condition: 'Estado',
                    color: 'Cor Exterior', interior: 'Interior', body: 'Carroçaria',
                    doors: 'Portas', seats: 'Lugares', origin: 'Origem',
                    consumption: 'Consumo', emissions: 'Emissões CO2'
                  };
                  
                  const label = labels[key] || key;
                  
                  return (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                      <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                      <span style={{ fontWeight: '600', fontSize: '1.05rem', color: 'rgba(255,255,255,0.95)', textAlign: 'right', maxWidth: '60%' }}>{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Equipamento de Destaque */}
            {specs.equipment && Array.isArray(specs.equipment) && specs.equipment.length > 0 && (
              <div>
                <h3 style={{ marginBottom: '25px', color: 'rgba(255,255,255,1)', fontSize: '1.3rem', fontWeight: 'bold' }}>Equipamento de Destaque</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                  {specs.equipment.map((item: string, idx: number) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', color: 'rgba(255,255,255,0.75)', fontSize: '1rem', lineHeight: '1.4' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', marginTop: '8px', flexShrink: 0 }}></div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </>
  );
}
