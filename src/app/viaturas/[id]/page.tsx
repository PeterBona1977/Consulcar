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
    try { imagesArray = JSON.parse(car.images); } catch(e) {}
  }
  const images = imagesArray.length > 0 ? [car.image, ...imagesArray] : [car.image];
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '50px', alignItems: 'start' }}>
            
            {/* Coluna Esquerda: Galeria e Descrição */}
            <div>
              <div style={{ width: '100%', height: '450px', borderRadius: '16px', overflow: 'hidden', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.1)', background: '#000' }}>
                <img src={activeImage} alt={car.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none' }}>
                {images.map((img: string, idx: number) => (
                  <div key={idx} onClick={() => setActiveImage(img)} style={{ width: '100px', height: '70px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: activeImage === img ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.2)', transition: 'all 0.2s' }}>
                    <img src={img} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>

              {/* Descrição Longa */}
              <div style={{ marginTop: '50px', background: 'var(--surface-light, rgba(20,20,20,0.3))', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ marginBottom: '20px', color: 'rgba(255,255,255,0.9)', fontSize: '1.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>Descrição da Viatura</h3>
                <p style={{ lineHeight: 1.8, color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap' }}>{car.description}</p>
              </div>
            </div>

            {/* Coluna Direita: Dados Técnicos, Equipamento e CTA */}
            <div>
              {/* CTA Flutuante / Fixo na Coluna */}
              <div style={{ background: 'var(--surface-light, rgba(20,20,20,0.5))', padding: '30px', borderRadius: '16px', border: '1px solid var(--accent-primary)', backdropFilter: 'blur(10px)', marginBottom: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
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

              {/* Dados Técnicos Detalhados */}
              <div style={{ marginBottom: '40px' }}>
                <h3 style={{ marginBottom: '20px', color: 'rgba(255,255,255,0.9)', fontSize: '1.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>Detalhes Técnicos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                  {Object.entries(specs).map(([key, value]) => {
                    // Ignorar o array de equipamentos para mostrar noutra secção
                    if (key === 'equipment' || !value) return null;
                    
                    // Tradução básica de chaves conhecidas
                    const labels: Record<string, string> = {
                      mileage: 'Quilometragem', year: 'Ano / Registo', fuel: 'Combustível', 
                      transmission: 'Caixa', power: 'Potência', condition: 'Estado',
                      color: 'Cor Exterior', interior: 'Interior', body: 'Carroçaria',
                      doors: 'Portas', seats: 'Lugares', origin: 'Origem',
                      consumption: 'Consumo', emissions: 'Emissões CO2'
                    };
                    
                    const label = labels[key] || key;
                    
                    return (
                      <div key={key} style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>{label}</div>
                        <div style={{ fontWeight: '600', fontSize: '1.05rem', color: 'rgba(255,255,255,0.95)' }}>{String(value)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Equipamento de Destaque */}
              {specs.equipment && Array.isArray(specs.equipment) && specs.equipment.length > 0 && (
                <div>
                  <h3 style={{ marginBottom: '20px', color: 'rgba(255,255,255,0.9)', fontSize: '1.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>Equipamento de Destaque</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {specs.equipment.map((item: string, idx: number) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }}></div>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </>
  );
}
