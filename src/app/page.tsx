"use client";

import { useState, useRef, FormEvent, DragEvent, ChangeEvent, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Vehicle {
  id: string;
  title: string;
  price: string;
  image: string;
  description: string;
  original_url: string;
}

const defaultSettings = {
  theme: {
    primaryColor: "#00d2ff",
    secondaryColor: "#3a7bd5",
    backgroundColor: "#050505",
    textColor: "#ffffff",
  },
  header: { logoText: "Consulcar" },
  footer: { footerText: "© 2026 Consulcar. Todos os direitos reservados." },
  sections: [
    { 
      id: "hero-1", 
      type: "hero",
      menuLabel: "Início",
      title1: "O teu próximo carro,", 
      title2: "sem fronteiras.", 
      description: "Especialistas em consultoria e importação automóvel. Tratamos de toda a pesquisa, negociação, transporte e legalização para que só tenhas de te preocupar em conduzir.", 
      btnPrimary: "Iniciar Pedido", 
      btnSecondary: "Saber Mais",
      bgImage: "",
      bgColor: "transparent",
      bgStyle: "cover",
      visible: true 
    },
    { 
      id: "viaturas-1", 
      type: "viaturas",
      menuLabel: "Viaturas",
      title1: "Viaturas", 
      title2: "Em Destaque", 
      subtitle: "Oportunidades exclusivas selecionadas pela nossa equipa.", 
      bgImage: "",
      bgColor: "transparent",
      bgStyle: "cover",
      visible: true 
    },
    { 
      id: "about-1", 
      type: "about",
      menuLabel: "Serviços",
      title1: "Como", 
      title2: "Funciona", 
      subtitle: "Um serviço premium, transparente e focado nas tuas necessidades.", 
      bgImage: "",
      bgColor: "transparent",
      bgStyle: "cover",
      visible: true 
    },
    { 
      id: "contact-1", 
      type: "contact",
      menuLabel: "Contacto",
      title1: "Encontra o teu", 
      title2: "Automóvel", 
      subtitle: "Preenche o formulário abaixo com os detalhes da viatura que pretendes.", 
      bgImage: "",
      bgColor: "transparent",
      bgStyle: "cover",
      visible: true 
    }
  ]
};

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [visibleCount, setVisibleCount] = useState(8);
  const [settings, setSettings] = useState<any>(defaultSettings);
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Form State
  const [entityType, setEntityType] = useState("individual");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [extras, setExtras] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);

    const fetchData = async () => {
      const { data: cars } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
      if (cars) setVehicles(cars);

      const { data: cms } = await supabase.from('site_settings').select('data').eq('id', 1).single();
      if (cms && cms.data) {
        const mergedSettings = { ...defaultSettings, ...cms.data };
        if(!mergedSettings.theme) mergedSettings.theme = defaultSettings.theme;
        // Merge sections per-item so defaultSettings fields (like menuLabel) are preserved
        // as fallback when not set in the CMS
        if (cms.data.sections && Array.isArray(cms.data.sections)) {
          mergedSettings.sections = cms.data.sections.map((cmsSection: any) => {
            const defaultSection = defaultSettings.sections.find((d) => d.id === cmsSection.id);
            return defaultSection ? { ...defaultSection, ...cmsSection } : cmsSection;
          });
        } else {
          mergedSettings.sections = defaultSettings.sections;
        }
        setSettings(mergedSettings);
      }
    };
    fetchData();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormSuccess(false);
    
    try {
      const { error } = await supabase.from('leads').insert([{
        entity_type: entityType,
        company_name: companyName,
        contact_name: contactName,
        email: email,
        phone: phone,
        brand: brand,
        model: model,
        extras: extras
      }]);

      if (error) throw error;
      
      setFormSuccess(true);
      // Reset form
      setCompanyName(""); setContactName(""); setEmail(""); setPhone(""); setBrand(""); setModel(""); setExtras("");
      setTimeout(() => setFormSuccess(false), 8000);
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      alert("Ocorreu um erro ao enviar o pedido. Por favor, tente novamente mais tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSectionStyle = (section: any) => {
    let style: React.CSSProperties = { 
      paddingBottom: section.type === 'hero' ? '0' : '140px', 
      paddingTop: section.type === 'hero' ? '0' : '140px', 
      position: "relative" 
    };
    if (section.bgColor && section.bgColor !== 'transparent') style.backgroundColor = section.bgColor;
    if (section.bgImage) {
      style.backgroundImage = `url(${section.bgImage})`;
      style.backgroundSize = section.bgStyle || 'cover';
      style.backgroundPosition = "center";
      style.backgroundRepeat = section.bgStyle === 'repeat' ? 'repeat' : 'no-repeat';
    }
    return style;
  };

  if (!mounted) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --accent-primary: ${settings.theme.primaryColor};
          --accent-secondary: ${settings.theme.secondaryColor};
          --background-dark: ${settings.theme.backgroundColor};
          --text-primary: ${settings.theme.textColor};
        }
        body { background-color: var(--background-dark); color: var(--text-primary); }
      `}} />

      <header className="navbar" style={{ background: isScrolled ? "rgba(5, 5, 5, 0.95)" : "rgba(5, 5, 5, 0.8)", boxShadow: isScrolled ? "0 4px 30px rgba(0, 0, 0, 0.1)" : "none" }}>
        <div className="container nav-content">
          <div className="logo">{settings.header.logoText.replace('car', '')}<span>car</span></div>
          <nav className="desktop-nav">
            <ul>
              {settings.sections.filter((s: any) => s.visible && s.menuLabel).map((section: any) => (
                <li key={section.id}>
                  <Link href={`#${section.id}`}>{section.menuLabel}</Link>
                </li>
              ))}
            </ul>
          </nav>
          
          <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <div className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></div>
            <div className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></div>
            <div className={`hamburger-line ${isMobileMenuOpen ? 'open' : ''}`}></div>
          </button>
        </div>
      </header>

      {/* MOBILE SLIDE-IN MENU */}
      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>
      <nav className={`mobile-slide-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
           <div className="logo">{settings.header.logoText.replace('car', '')}<span>car</span></div>
           <button className="close-menu-btn" onClick={() => setIsMobileMenuOpen(false)}>✕</button>
        </div>
        <ul className="mobile-menu-links">
          {settings.sections.filter((s: any) => s.visible && s.menuLabel).map((section: any) => (
            <li key={`mob-${section.id}`}>
              <Link href={`#${section.id}`} onClick={() => setIsMobileMenuOpen(false)}>{section.menuLabel}</Link>
            </li>
          ))}
        </ul>
      </nav>

      <main>
        {settings.sections.filter((s: any) => s.visible).map((section: any) => {
          
          if (section.type === 'hero') {
            return (
              <section key={section.id} id={section.id} className="hero" style={getSectionStyle(section)}>
                <div className="container hero-content" style={{ position: "relative", zIndex: 10 }}>
                  <h1>{section.title1} <br /><span className="gradient-text">{section.title2}</span></h1>
                  <p>{section.description}</p>
                  <div className="hero-actions">
                    <Link href="#pedido" className="btn btn-primary">{section.btnPrimary}</Link>
                    <Link href="#sobre" className="btn btn-secondary">{section.btnSecondary}</Link>
                  </div>
                </div>
                {!section.bgImage && section.bgColor === 'transparent' && (
                  <div className="hero-bg">
                    <div className="glow glow-1" style={{background: `radial-gradient(circle, ${settings.theme.secondaryColor} 0%, rgba(58,123,213,0) 70%)`}}></div>
                    <div className="glow glow-2" style={{background: `radial-gradient(circle, ${settings.theme.primaryColor} 0%, rgba(0,210,255,0) 70%)`}}></div>
                  </div>
                )}
              </section>
            );
          }

          if (section.type === 'viaturas' && vehicles.length > 0) {
            return (
              <section key={section.id} id={section.id} className="about" style={{...getSectionStyle(section), paddingBottom: "0"}}>
                {section.bgImage && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 0 }}></div>}
                <div className="container" style={{ position: "relative", zIndex: 1 }}>
                  <div className="section-header">
                    <h2>{section.title1} <span className="gradient-text">{section.title2}</span></h2>
                    <p>{section.subtitle}</p>
                  </div>
                  <div className="features-grid carousel">
                    {vehicles.slice(0, visibleCount).map((car) => (
                      <div key={car.id} className="feature-card" style={{ padding: "0", overflow: "hidden", background: section.bgImage ? "rgba(0,0,0,0.8)" : "var(--surface-light)" }}>
                        <img src={car.image} alt={car.title} style={{ width: "100%", height: "220px", objectFit: "cover", borderBottom: "1px solid var(--border-color)" }} />
                        <div style={{ padding: "20px" }}>
                          <h3 style={{ fontSize: "1.2rem", marginBottom: "8px", lineHeight: "1.3" }}>{car.title}</h3>
                          <p style={{ color: "var(--accent-primary)", fontWeight: "bold", fontSize: "1.3rem", marginBottom: "16px" }}>{car.price}</p>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <Link href={`/viaturas/${car.id}`} className="btn btn-primary" style={{ flex: 1, padding: "10px", fontSize: "0.95rem", textAlign: "center" }}>Ver Detalhes</Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {vehicles.length > visibleCount && (
                    <div style={{ textAlign: "center", marginTop: "40px" }}>
                      <button 
                        onClick={() => setVisibleCount(prev => prev + 8)} 
                        className="btn btn-primary" 
                        style={{ padding: "12px 30px", fontSize: "1.1rem", borderRadius: "8px" }}
                      >
                        Carregar Mais Viaturas
                      </button>
                    </div>
                  )}
                </div>
              </section>
            );
          }

          if (section.type === 'about') {
            return (
              <section key={section.id} id={section.id} className="about" style={getSectionStyle(section)}>
                {section.bgImage && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 0 }}></div>}
                <div className="container" style={{ position: "relative", zIndex: 1 }}>
                  <div className="section-header">
                    <h2>{section.title1} <span className="gradient-text">{section.title2}</span></h2>
                    <p>{section.subtitle}</p>
                  </div>
                  <div className="features-grid">
                    <div className="feature-card" style={{ background: section.bgImage ? "rgba(0,0,0,0.8)" : "var(--surface-light)" }}>
                      <div className="feature-icon">🔍</div>
                      <h3>Pesquisa Personalizada</h3>
                      <p>Diz-nos o que procuras. Procuramos no mercado nacional e internacional as melhores oportunidades que se enquadram no teu perfil e orçamento.</p>
                    </div>
                    <div className="feature-card" style={{ background: section.bgImage ? "rgba(0,0,0,0.8)" : "var(--surface-light)" }}>
                      <div className="feature-icon">🛡️</div>
                      <h3>Análise e Segurança</h3>
                      <p>Avaliamos o histórico, quilometragem e estado geral das viaturas antes de qualquer compromisso. Garantimos que fazes um negócio seguro.</p>
                    </div>
                    <div className="feature-card" style={{ background: section.bgImage ? "rgba(0,0,0,0.8)" : "var(--surface-light)" }}>
                      <div className="feature-icon">📄</div>
                      <h3>Burocracia Zero</h3>
                      <p>Desde o transporte internacional até à legalização, ISV e emissão de matrícula. Tratamos de todo o processo burocrático de forma célere.</p>
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          if (section.type === 'contact') {
            return (
              <section key={section.id} id={section.id} className="request-form-section" style={getSectionStyle(section)}>
                {section.bgImage && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 0 }}></div>}
                <div className="container" style={{ position: "relative", zIndex: 1 }}>
                  <div className="form-wrapper glassmorphism" style={{ background: section.bgImage ? "rgba(20,20,20,0.9)" : "var(--surface-light)" }}>
                    <div className="form-header">
                      <h2>{section.title1} <span className="gradient-text">{section.title2}</span></h2>
                      <p>{section.subtitle}</p>
                    </div>
                    <form onSubmit={handleSubmit}>
                      <div className="form-section-title">Dados de Contacto</div>
                      <div className="form-group-row">
                        <div className="form-group">
                          <label>Tipo de Entidade *</label>
                          <div className="radio-group">
                            <label className="radio-label"><input type="radio" name="entity_type" value="individual" checked={entityType === "individual"} onChange={(e) => setEntityType(e.target.value)} /><span>Individual</span></label>
                            <label className="radio-label"><input type="radio" name="entity_type" value="coletiva" checked={entityType === "coletiva"} onChange={(e) => setEntityType(e.target.value)} /><span>Coletiva (Empresa)</span></label>
                          </div>
                        </div>
                        {entityType === "coletiva" && (
                          <div className="form-group"><label>Designação Social *</label><input type="text" placeholder="Ex: Consulcar Lda" required value={companyName} onChange={e => setCompanyName(e.target.value)} /></div>
                        )}
                      </div>
                      <div className="form-group-row">
                        <div className="form-group" style={{ width: "100%" }}><label>Nome de Contacto *</label><input type="text" placeholder="O seu nome" required value={contactName} onChange={e => setContactName(e.target.value)} /></div>
                      </div>
                      <div className="form-group-row">
                        <div className="form-group"><label>Email *</label><input type="email" placeholder="email@exemplo.com" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                        <div className="form-group"><label>Contacto Telefónico *</label><input type="tel" placeholder="+351 912 345 678" required value={phone} onChange={e => setPhone(e.target.value)} /></div>
                      </div>
                      <div className="form-section-title">Detalhes da Viatura</div>
                      <div className="form-group-row">
                        <div className="form-group"><label>Marca *</label><input type="text" placeholder="Ex: BMW, Mercedes-Benz" required value={brand} onChange={e => setBrand(e.target.value)} /></div>
                        <div className="form-group"><label>Modelo *</label><input type="text" placeholder="Ex: Série 3" required value={model} onChange={e => setModel(e.target.value)} /></div>
                      </div>
                      <div className="form-group"><label>Extras e Especificações Desejadas</label><textarea rows={3} placeholder="Ex: Pacote Desportivo, Teto Panorâmico..." value={extras} onChange={e => setExtras(e.target.value)}></textarea></div>
                      
                      {formSuccess && (
                        <div style={{ padding: '15px', background: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4CAF50', color: '#4CAF50', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontWeight: 'bold' }}>
                          Pedido enviado com sucesso! A equipa Consulcar entrará em contacto brevemente.
                        </div>
                      )}
                      
                      <div className="form-actions"><button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting} style={{ padding: '20px', fontSize: '1.2rem', borderRadius: '12px' }}>{isSubmitting ? "A enviar..." : "Enviar Pedido de Cotação"}</button></div>
                    </form>
                  </div>
                </div>
              </section>
            );
          }

          if (section.type === 'text') {
            return (
              <section key={section.id} id={section.id} style={getSectionStyle(section)}>
                {section.bgImage && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 0 }}></div>}
                <div className="container" style={{ position: "relative", zIndex: 1 }} dangerouslySetInnerHTML={{ __html: section.content || "" }} />
              </section>
            );
          }

          if (section.type === 'testimonials') {
            return (
              <section key={section.id} id={section.id} className="about" style={getSectionStyle(section)}>
                {section.bgImage && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 0 }}></div>}
                <div className="container" style={{ position: "relative", zIndex: 1 }}>
                  <div className="section-header">
                    <h2>{section.title1} <span className="gradient-text">{section.title2}</span></h2>
                    <p>{section.subtitle}</p>
                  </div>
                  <div className="features-grid carousel">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="feature-card" style={{ background: section.bgImage ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
                        <div style={{ color: "var(--accent-primary)", fontSize: "1.5rem", marginBottom: "15px", letterSpacing: "2px" }}>★★★★★</div>
                        <p style={{ fontStyle: "italic", marginBottom: "20px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                          "{section[`review${i}`] || 'Serviço excelente e muito profissional.'}"
                        </p>
                        <div style={{ fontWeight: "bold", color: "var(--text-primary)" }}>{section[`client${i}`] || `Cliente ${i}`}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          return null;
        })}
      </main>

      <footer style={{ background: "rgba(0,0,0,0.5)", borderTop: "1px solid var(--border-color)", padding: "40px 0" }}>
        <div className="container footer-content" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="logo" style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{settings.header.logoText.replace('car', '')}<span style={{ color: "var(--accent-primary)" }}>car</span></div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{settings.footer.footerText}</p>
        </div>
      </footer>
    </>
  );
}
