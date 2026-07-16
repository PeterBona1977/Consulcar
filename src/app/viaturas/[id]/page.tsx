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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [entityType, setEntityType] = useState("individual");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const fetchCar = async () => {
      const carId = params?.id;
      if (!carId) return;

      const { data } = await supabase.from('vehicles').select('*').eq('id', carId).single();
      if (data) {
        setCar(data);
        setActiveImage(data.image || 'https://via.placeholder.com/800x600.png?text=Sem+Imagem');
      }
      
      const { data: cms } = await supabase.from('site_settings').select('data').eq('id', 1).single();
      if (cms && cms.data) setSettings(cms.data);
      
      setLoading(false);
    };
    fetchCar();
  }, [params]);

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormSuccess(false);
    
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          company_name: companyName,
          contact_name: contactName,
          email: email,
          phone: phone,
          brand: car.title,
          model: `ID: ${car.id}`,
          extras: `URL: ${window.location.href}\nPreço: ${car.price}`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar pedido');
      
      setFormSuccess(true);
      setTimeout(() => {
        setFormSuccess(false);
        setIsModalOpen(false);
      }, 4000);
    } catch (error) {
      console.error("Erro:", error);
      alert("Ocorreu um erro ao enviar o pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A carregar viatura premium...</div>;
  if (!car) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Viatura não encontrada.</div>;

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
  if (images.length === 0) images.push('https://via.placeholder.com/800x600.png?text=Sem+Imagem');
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
          <Link href="/" className="btn btn-secondary" style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.9rem', textDecoration: 'none', display: 'inline-block' }}>← Voltar</Link>
        </div>
      </header>

      <main style={{ paddingTop: '120px', paddingBottom: '100px', minHeight: '100vh' }}>
        <div className="container">
          {/* Cabelhaçalho: Título (Mobile friendly) */}
          <div style={{ marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', margin: 0, lineHeight: 1.1, letterSpacing: '-0.5px' }}>{car.title}</h1>
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
              
              {/* Preço e Custos Adicionais */}
              <div style={{ marginTop: '25px' }}>
                {(!specs.costs || !Array.isArray(specs.costs) || specs.costs.length === 0) ? (
                  <p style={{ color: 'var(--accent-primary)', fontSize: '2.2rem', fontWeight: 'bold', marginBottom: '15px' }}>{car.price}</p>
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)' }}>
                      <span>Valor da viatura</span>
                      <span style={{ fontWeight: 'bold' }}>{car.price}</span>
                    </div>
                    {specs.costs.map((c: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)' }}>
                        <span>{c.description}</span>
                        <span style={{ fontWeight: 'bold' }}>{c.value} €</span>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '15px 0' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.9)' }}>Preço Total</span>
                      <span style={{ color: 'var(--accent-primary)', fontSize: '2.2rem', fontWeight: 'bold' }}>
                        {(() => {
                          let clean = (car.price || "0").replace(/[^0-9.,]/g, '');
                          if (clean.match(/[.,]\d{2}$/)) clean = clean.slice(0, -3);
                          clean = clean.replace(/[.,]/g, '');
                          const basePrice = parseInt(clean, 10);
                          let totalCosts = 0;
                          specs.costs.forEach((c: any) => {
                            const val = parseFloat(c.value);
                            if (!isNaN(val)) totalCosts += val;
                          });
                          const finalTotal = (isNaN(basePrice) ? 0 : basePrice) + totalCosts;
                          return new Intl.NumberFormat('de-DE').format(finalTotal) + ' €';
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita: CTA Only */}
            <div className="car-details-sidebar" style={{ position: 'sticky', top: '100px' }}>
              {/* CTA Flutuante / Fixo na Coluna */}
              <div className="mobile-fixed-cta" style={{ background: 'var(--surface-light, rgba(20,20,20,0.5))', padding: '30px', borderRadius: '16px', border: '1px solid var(--accent-primary)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '15px' }}>Quer importar esta viatura?</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '25px', lineHeight: 1.5 }}>Tratamos de todo o processo de negociação, transporte, legalização e entrega chave-na-mão.</p>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ display: 'block', fontSize: '1.2rem', padding: '16px', textAlign: 'center', borderRadius: '8px', width: '100%', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                  Pedir Proposta Chave-na-Mão
                </button>
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

      {/* Modal de Proposta */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111', width: '100%', maxWidth: '500px', borderRadius: '16px', padding: '30px', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Pedir Proposta</h3>
            <p style={{ color: 'var(--accent-primary)', marginBottom: '25px', fontWeight: 'bold' }}>{car.title}</p>
            
            {formSuccess ? (
              <div style={{ padding: '20px', background: 'rgba(0, 255, 0, 0.1)', color: '#4ade80', borderRadius: '8px', textAlign: 'center' }}>
                <h3>Pedido enviado com sucesso!</h3>
                <p style={{ marginTop: '10px' }}>A nossa equipa irá contactar em breve.</p>
              </div>
            ) : (
              <form onSubmit={handleProposalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input type="radio" name="entityTypeModal" checked={entityType === 'individual'} onChange={() => setEntityType('individual')} /> Particular
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input type="radio" name="entityTypeModal" checked={entityType === 'company'} onChange={() => setEntityType('company')} /> Empresa
                  </label>
                </div>
                
                {entityType === 'company' && (
                  <input type="text" required placeholder="Nome da Empresa" value={companyName} onChange={e => setCompanyName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#222', color: '#fff' }} />
                )}
                <input type="text" required placeholder="O seu Nome" value={contactName} onChange={e => setContactName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#222', color: '#fff' }} />
                <input type="email" required placeholder="O seu Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#222', color: '#fff' }} />
                <input type="tel" required placeholder="O seu Telefone" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#222', color: '#fff' }} />
                
                <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%', padding: '15px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '10px', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'A enviar...' : 'Enviar Pedido'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
