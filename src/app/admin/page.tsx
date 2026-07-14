"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DictionaryEntry {
  id: string;
  category: string;
  foreign_term: string;
  pt_term: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("viaturas");
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  
  // Auth
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  // Gestão de Admins
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  
  // Leads / CRM
  const [leads, setLeads] = useState<any[]>([]);
  
  // Dicionário
  const [dictionary, setDictionary] = useState<DictionaryEntry[]>([]);
  const [newDict, setNewDict] = useState({ category: 'equipment', foreign_term: '', pt_term: '' });
  
  // Viaturas (Nova / Edição)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [carTitle, setCarTitle] = useState("");
  const [carPrice, setCarPrice] = useState("");
  const [carImage, setCarImage] = useState("");
  const [carImages, setCarImages] = useState<string[]>([]);
  const [carDesc, setCarDesc] = useState("");
  const [carOriginalUrl, setCarOriginalUrl] = useState("");
  const [costs, setCosts] = useState<{description: string, value: string, isCustom?: boolean}[]>([]);
  const [costOptions, setCostOptions] = useState<string[]>(['Transporte', 'Legalização']);

  useEffect(() => {
    const saved = localStorage.getItem('costOptions');
    if (saved) {
      try {
        setCostOptions(JSON.parse(saved));
      } catch(e){}
    }
  }, []);

  const handleAddCustomCost = (index: number, newDesc: string) => {
    const trimmed = newDesc.trim();
    if (trimmed && !costOptions.includes(trimmed)) {
      const newOptions = [...costOptions, trimmed];
      setCostOptions(newOptions);
      localStorage.setItem('costOptions', JSON.stringify(newOptions));
    }
    const newCosts = [...costs];
    newCosts[index].description = trimmed || '';
    newCosts[index].isCustom = false;
    setCosts(newCosts);
  };

  const applyCosts = () => {
    let totalCosts = 0;
    costs.forEach(c => {
      const val = parseFloat(c.value);
      if (!isNaN(val)) totalCosts += val;
    });
    
    if (totalCosts === 0 || !carPrice) return;
    
    // Limpar tudo o que não seja número, ponto ou vírgula
    let clean = carPrice.replace(/[^0-9.,]/g, '');
    // Se terminar em cêntimos (ex: ,50 ou .00), removemos os cêntimos
    if (clean.match(/[.,]\d{2}$/)) {
        clean = clean.slice(0, -3);
    }
    // Agora removemos todos os pontos e vírgulas que restam (que são separadores de milhares)
    clean = clean.replace(/[.,]/g, '');
    
    const basePrice = parseInt(clean, 10);
    if (!isNaN(basePrice)) {
      const newPrice = basePrice + totalCosts;
      // Formata de volta para ficar estilo 28.890 €
      setCarPrice(new Intl.NumberFormat('de-DE').format(newPrice) + ' €');
      // Limpar custos após somar para evitar dupla soma
      setCosts([]);
    }
  };
  
  // Dinâmicos
  const [specs, setSpecs] = useState<{key: string, value: string}[]>([{key: '', value: ''}]);
  const [equipment, setEquipment] = useState<string[]>(['']);
  
  const [status, setStatus] = useState("");
  const [isScraping, setIsScraping] = useState(false);

  // Gestão de Viaturas
  const [publishedVehicles, setPublishedVehicles] = useState<any[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/admin/login');
    } else {
      setSession(session);
      setAuthLoading(false);
      fetchDictionary();
      fetchPublishedVehicles();
      fetchAdmins(session.access_token);
      fetchLeads(session.access_token);
    }
  };
  
  const fetchLeads = async (token?: string) => {
    const currentToken = token || session?.access_token;
    if (!currentToken) return;
    try {
      const res = await fetch('/api/admin/leads', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      const data = await res.json();
      if (res.ok && data.leads) setLeads(data.leads);
    } catch(e) { console.error(e) }
  };
  
  const updateLeadStatus = async (id: string, status: string) => {
    if (!session?.access_token) return;
    try {
      await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ id, status })
      });
      fetchLeads();
    } catch(e) { console.error(e) }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const fetchAdmins = async (token: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setAdmins(data.users || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setStatus("A criar administrador...");
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email: newAdminEmail, password: newAdminPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setStatus("Administrador criado com sucesso!");
      setTimeout(() => setStatus(""), 5000);
      setNewAdminEmail("");
      setNewAdminPassword("");
      fetchAdmins(session.access_token);
    } catch (error: any) {
      setStatus(`Erro: ${error.message}`);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!session || !confirm("Tem a certeza que deseja eliminar este administrador?")) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      fetchAdmins(session.access_token);
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const fetchDictionary = async () => {
    const { data } = await supabase.from('import_dictionary').select('*').order('created_at', { ascending: false });
    if (data) setDictionary(data);
  };

  const fetchPublishedVehicles = async () => {
    const { data } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
    if (data) setPublishedVehicles(data);
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!session?.access_token || !confirm("Tem a certeza que deseja apagar esta viatura?")) return;
    try {
      await fetch(`/api/admin/vehicles?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      fetchPublishedVehicles();
    } catch (e) { console.error(e) }
  };

  const handleEditVehicle = (v: any) => {
    setEditingId(v.id);
    setCarTitle(v.title || "");
    setCarPrice(v.price || "");
    setCarImage(v.image || "");
    setCarDesc(v.description || "");
    setCarOriginalUrl(v.original_url || "");
    
    // Parse specs
    const s = v.specs || {};
    const loadedSpecs = Object.keys(s)
      .filter(k => k !== 'equipment')
      .map(k => ({ key: k, value: s[k] }));
    setSpecs(loadedSpecs.length > 0 ? loadedSpecs : [{key: '', value: ''}]);
    
    // Parse equipment
    const eq = s.equipment || [];
    setEquipment(eq.length > 0 ? eq : ['']);
    
    // Images
    let imgs: string[] = [];
    if (Array.isArray(v.images)) imgs = v.images;
    else if (typeof v.images === 'string') {
       if (v.images.startsWith('[') || v.images.startsWith('{')) {
         try {
           const parsed = JSON.parse(v.images.replace(/^\{/, '[').replace(/\}$/, ']'));
           if (Array.isArray(parsed)) imgs = parsed;
         } catch(e) {}
       } else {
         imgs = v.images.split(',').map((s: string) => s.trim()).filter(Boolean);
       }
    }
    setCarImages(imgs);
    
    setActiveTab('viaturas');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCarTitle(""); setCarPrice(""); setCarImage(""); setCarImages([]); setCarDesc(""); setCarOriginalUrl("");
    setSpecs([{key: '', value: ''}]); setEquipment(['']);
    setStatus("");
  };

  const handleAddDict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDict.foreign_term || !newDict.pt_term) return;
    
    const { error } = await supabase.from('import_dictionary').insert([newDict]);
    if (!error) {
      setNewDict({ category: 'equipment', foreign_term: '', pt_term: '' });
      fetchDictionary();
    }
  };

  const handleDeleteDict = async (id: string) => {
    await supabase.from('import_dictionary').delete().eq('id', id);
    fetchDictionary();
  };

  // Lógica de Inteligência: Auto-Traduzir
  const translateTerm = (term: string, category: string) => {
    const entry = dictionary.find(d => d.foreign_term.toLowerCase() === term.toLowerCase() && d.category === category);
    return entry ? entry.pt_term : term; // Se não encontrar, devolve o original
  };

  const handleEquipmentChange = (index: number, val: string) => {
    const newEq = [...equipment];
    newEq[index] = val;
    setEquipment(newEq);
  };

  const handleSpecChange = (index: number, field: 'key'|'value', val: string) => {
    const newS = [...specs];
    newS[index][field] = val;
    setSpecs(newS);
  };

  // Função para aprender novas palavras automaticamente
  const learnNewWords = async (currentSpecs: {key: string, value: string}[], currentEq: string[]) => {
    const newEntries: any[] = [];
    
    // Verificar equipamentos
    currentEq.forEach(eq => {
      if (eq.trim() !== '') {
        // Se a palavra que o utilizador escreveu não existe em pt_term no dicionário (pois ele pode ter deixado em alemão ou traduzido manualmente)
        // Para simplificar, se não existe, vamos assumir que o que ele escreveu é PT e o foreign_term é o mesmo, ou ele corrige no dicionário.
        // Numa versão final, teríamos dois campos: "Termo Original" e "Termo Traduzido".
      }
    });
    // Omitido para não complicar excessivamente o protótipo.
  };

  const handleFetchDataFromUrl = async () => {
    if (!carOriginalUrl) {
      alert("Por favor, insira o URL primeiro.");
      return;
    }
    setIsScraping(true);
    setStatus("A importar dados da viatura...");
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: carOriginalUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao extrair dados');
      
      if (data.title) setCarTitle(data.title);
      if (data.price) setCarPrice(data.price);
      if (data.image) setCarImage(data.image);
      if (data.description) setCarDesc(data.description);
      
      if (data.equipment && Array.isArray(data.equipment) && data.equipment.length > 0) {
        setEquipment(data.equipment);
      }
      
      if (data.specs && Array.isArray(data.specs) && data.specs.length > 0) {
        setSpecs(data.specs);
      }
      
      if (data.images && Array.isArray(data.images)) {
        setCarImages(data.images);
      }
      
      setStatus("Dados importados e traduzidos com sucesso! Verifique e ajuste os campos antes de guardar.");
    } catch (error: any) {
      setStatus(`Erro: ${error.message}`);
    } finally {
      setIsScraping(false);
    }
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("A guardar viatura...");
    
    // Converter specs array para object JSON
    const specsObj: any = {};
    specs.forEach(s => {
      if (s.key && s.value) specsObj[s.key] = s.value;
    });
    
    // Auto-tradução de equipamentos antes de guardar
    const translatedEq = equipment
      .filter(eq => eq.trim() !== '')
      .map(eq => translateTerm(eq, 'equipment'));
      
    specsObj.equipment = translatedEq;

    const vehicleData = {
      title: carTitle,
      price: carPrice,
      image: carImage,
      description: carDesc,
      original_url: carOriginalUrl,
      images: carImages,
      specs: specsObj
    };

    let errorMessage = null;
    try {
      const url = '/api/admin/vehicles';
      const method = editingId ? 'PATCH' : 'POST';
      const payload = editingId ? { id: editingId, ...vehicleData } : vehicleData;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) errorMessage = data.error;
    } catch (e: any) {
      errorMessage = e.message;
    }

    if (errorMessage) {
      setStatus(`Erro: ${errorMessage}`);
    } else {
      setStatus(editingId ? "Viatura atualizada com sucesso!" : "Viatura publicada com sucesso! Os equipamentos conhecidos foram traduzidos automaticamente.");
      setTimeout(() => setStatus(""), 5000); // Remove a mensagem após 5 segundos
      cancelEdit();
      fetchPublishedVehicles();
    }
  };

  if (authLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A verificar autenticação...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', color: '#333', padding: '50px 20px' }}>
      <style>{`
        input[type="text"], input[type="number"], input[type="url"], textarea, select {
          color: #000 !important;
          background-color: #fff !important;
        }
        
        .admin-nav-container { border-bottom: 1px solid #ddd; background: #111; }
        .admin-hamburger { display: none; padding: 15px 20px; background: #111; color: white; cursor: pointer; font-weight: bold; justify-content: space-between; align-items: center; }
        .admin-nav { display: flex; flex-wrap: wrap; }
        .admin-nav button { flex: 1; padding: 15px; color: white; border: none; cursor: pointer; font-size: 1rem; font-weight: bold; }
        
        .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .admin-flex-row { display: flex; gap: 10px; }
        
        .admin-sections-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .admin-spec-row { display: flex; gap: 10px; margin-bottom: 10px; }
        
        @media (max-width: 768px) {
          .admin-hamburger { display: flex; }
          .admin-nav { display: none; flex-direction: column; width: 100%; }
          .admin-nav.open { display: flex; }
          .admin-nav button { text-align: left; padding: 15px 20px; border-bottom: 1px solid #222; }
          .admin-nav .admin-nav-actions { width: 100%; justify-content: space-between; padding: 15px 20px; }
          .admin-content-pad { padding: 20px 15px !important; }
          
          .admin-grid { grid-template-columns: 1fr; }
          .admin-sections-grid { grid-template-columns: 1fr; gap: 20px; }
          .admin-spec-row { flex-direction: column; }
          .admin-flex-row { flex-direction: column; }
          .admin-flex-row button { width: 100%; }
        }
      `}</style>
      <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        <div className="admin-nav-container">
          <div className="admin-hamburger" onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}>
            <span>Menu de Administração ({activeTab.charAt(0).toUpperCase() + activeTab.slice(1)})</span>
            <span>☰</span>
          </div>
          <div className={`admin-nav ${isAdminMenuOpen ? 'open' : ''}`}>
            <button onClick={() => { setActiveTab('viaturas'); setIsAdminMenuOpen(false); }} style={{ background: activeTab === 'viaturas' ? '#222' : '#111' }}>
              🚘 Nova Viatura
            </button>
            <button onClick={() => { setActiveTab('gestao'); setIsAdminMenuOpen(false); }} style={{ background: activeTab === 'gestao' ? '#222' : '#111' }}>
              📋 Viaturas
            </button>
            <button onClick={() => { setActiveTab('dicionario'); setIsAdminMenuOpen(false); }} style={{ background: activeTab === 'dicionario' ? '#222' : '#111' }}>
              🧠 Dicionário
            </button>
            <button onClick={() => { setActiveTab('leads'); setIsAdminMenuOpen(false); }} style={{ background: activeTab === 'leads' ? '#222' : '#111' }}>
              📩 Mensagens
            </button>
            <button onClick={() => { setActiveTab('admins'); setIsAdminMenuOpen(false); }} style={{ background: activeTab === 'admins' ? '#222' : '#111' }}>
              👥 Admins
            </button>
            <div className="admin-nav-actions" style={{ padding: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
              <Link href="/" style={{ color: '#00d2ff', textDecoration: 'none', fontSize: '0.9rem' }}>Site Principal</Link>
              <button onClick={handleLogout} style={{ background: 'transparent', color: '#ef5350', border: '1px solid #ef5350', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', flex: 'none' }}>Sair</button>
            </div>
          </div>
        </div>

        <div style={{ padding: '40px' }} className="admin-content-pad">
          
          {/* TAB VIATURAS */}
          {activeTab === 'viaturas' && (
            <form onSubmit={handleSaveVehicle}>
              <h2 style={{ marginBottom: '20px' }}>{editingId ? 'Editar Viatura' : 'Publicar Nova Viatura'}</h2>
              {status && <div style={{ padding: '15px', background: '#e0f7fa', color: '#006064', marginBottom: '20px', borderRadius: '8px' }}>{status}</div>}
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>URL do Anúncio Original</label>
                <div className="admin-flex-row">
                  <input value={carOriginalUrl} onChange={e=>setCarOriginalUrl(e.target.value)} type="text" style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} placeholder="https://mobile.de/..." />
                  <button type="button" onClick={handleFetchDataFromUrl} disabled={isScraping} style={{ padding: '10px 15px', background: '#00d2ff', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: isScraping ? 'not-allowed' : 'pointer' }}>
                    {isScraping ? 'A extrair...' : 'Extrair Dados'}
                  </button>
                </div>
              </div>

              <div className="admin-grid">
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Título do Anúncio</label>
                  <input required value={carTitle} onChange={e=>setCarTitle(e.target.value)} type="text" style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} placeholder="Ex: Suzuki Vitara 1.4" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Preço de Venda</label>
                  <input required value={carPrice} onChange={e=>setCarPrice(e.target.value)} type="text" style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} placeholder="Ex: 24.900 €" />
                  
                  <div style={{ marginTop: '15px', padding: '15px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '0.9rem' }}>Custos Adicionais (Somam ao Preço)</label>
                    {costs.map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        {c.isCustom ? (
                          <input 
                            autoFocus
                            placeholder="Nova descrição..." 
                            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                            onBlur={(e) => handleAddCustomCost(idx, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomCost(idx, e.currentTarget.value); } }}
                          />
                        ) : (
                          <select 
                            value={c.description} 
                            onChange={e => {
                              if (e.target.value === 'novo') {
                                const newCosts = [...costs];
                                newCosts[idx].isCustom = true;
                                setCosts(newCosts);
                              } else {
                                const newCosts = [...costs];
                                newCosts[idx].description = e.target.value;
                                setCosts(newCosts);
                              }
                            }}
                            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                          >
                            <option value="">Selecione...</option>
                            {costOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            <option value="novo">+ Inserir novo custo</option>
                          </select>
                        )}
                        <input 
                          type="number" 
                          placeholder="Valor (€)" 
                          value={c.value} 
                          onChange={e => {
                            const newCosts = [...costs];
                            newCosts[idx].value = e.target.value;
                            setCosts(newCosts);
                          }}
                          style={{ width: '100px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                        <button type="button" onClick={() => {
                          const newCosts = [...costs];
                          newCosts.splice(idx, 1);
                          setCosts(newCosts);
                        }} style={{ padding: '8px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>X</button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button type="button" onClick={() => setCosts([...costs, {description: '', value: ''}])} style={{ padding: '8px 15px', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>+ Adicionar Custo</button>
                      {costs.length > 0 && (
                        <button type="button" onClick={applyCosts} style={{ padding: '8px 15px', background: '#00d2ff', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Somar ao Preço</button>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Imagem URL: {carImages.length > 0 && <span style={{color:'green', fontSize:'0.8em'}}>({carImages.length} fotos extraídas da galeria)</span>}</label>
                  <input value={carImage} onChange={e=>setCarImage(e.target.value)} type="text" style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} placeholder="https://..." />
                </div>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Descrição</label>
                <textarea value={carDesc} onChange={e=>setCarDesc(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px', minHeight: '100px' }}></textarea>
              </div>

              <div className="admin-sections-grid">
                {/* ESPECIFICAÇÕES */}
                <div>
                  <h3 style={{ marginBottom: '15px' }}>Dados Técnicos</h3>
                  {specs.map((s, idx) => (
                    <div key={idx} className="admin-spec-row">
                      <input value={s.key} onChange={e=>handleSpecChange(idx, 'key', e.target.value)} placeholder="Chave (Ex: mileage)" style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                      <input value={s.value} onChange={e=>handleSpecChange(idx, 'value', e.target.value)} placeholder="Valor (Ex: 32000 km)" style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                    </div>
                  ))}
                  <button type="button" onClick={() => setSpecs([...specs, {key: '', value: ''}])} style={{ padding: '8px 15px', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Adicionar Dado</button>
                </div>

                {/* EQUIPAMENTOS */}
                <div>
                  <h3 style={{ marginBottom: '15px' }}>Equipamentos (Alemão ou PT)</h3>
                  <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>Escreva o termo original. O sistema vai traduzir se souber!</p>
                  {equipment.map((eq, idx) => (
                    <div key={idx} className="admin-spec-row">
                      <input value={eq} onChange={e=>handleEquipmentChange(idx, e.target.value)} placeholder="Ex: Sitzheizung" style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                      <span style={{ padding: '8px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: '4px', fontSize: '0.9rem', color: '#888', minWidth: '150px' }}>
                        Tradução: {translateTerm(eq, 'equipment')}
                      </span>
                    </div>
                  ))}
                  <button type="button" onClick={() => setEquipment([...equipment, ''])} style={{ padding: '8px 15px', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Adicionar Extra</button>
                </div>
              </div>

              <div style={{ marginTop: '40px', borderTop: '1px solid #ddd', paddingTop: '20px', display: 'flex', gap: '15px' }}>
                <button type="submit" style={{ padding: '15px 30px', background: '#000', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer' }}>
                  {editingId ? 'Atualizar Viatura' : 'Gravar Viatura e Traduzir'}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} style={{ padding: '15px 30px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer' }}>
                    Cancelar Edição
                  </button>
                )}
              </div>
            </form>
          )}

          {/* TAB GESTÃO DE VIATURAS */}
          {activeTab === 'gestao' && (
            <div style={{ overflowX: 'auto' }}>
              <h2 style={{ marginBottom: '20px' }}>Viaturas Publicadas</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#eee' }}>
                    <th style={{ padding: '12px' }}>Imagem</th>
                    <th style={{ padding: '12px' }}>Título</th>
                    <th style={{ padding: '12px' }}>Preço</th>
                    <th style={{ padding: '12px', width: '150px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {publishedVehicles.map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>
                        {v.image ? (
                          <img src={v.image} alt={v.title} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <div style={{ width: '80px', height: '60px', background: '#ccc', borderRadius: '4px' }}></div>
                        )}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 'bold', wordBreak: 'break-word', maxWidth: '300px' }}>{v.title}</td>
                      <td style={{ padding: '12px', wordBreak: 'break-word', maxWidth: '200px' }}>{v.price}</td>
                      <td style={{ padding: '12px' }}>
                        <Link href={`/viaturas/${v.id}`} target="_blank" style={{ display: 'inline-block', padding: '6px 12px', background: '#e3f2fd', color: '#1565c0', textDecoration: 'none', borderRadius: '4px', marginRight: '10px' }}>Ver</Link>
                        <button onClick={() => handleEditVehicle(v)} style={{ padding: '6px 12px', background: '#fff3e0', color: '#ef6c00', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}>Editar</button>
                        <button onClick={() => handleDeleteVehicle(v.id)} style={{ padding: '6px 12px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Apagar</button>
                      </td>
                    </tr>
                  ))}
                  {publishedVehicles.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Nenhuma viatura publicada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB DICIONÁRIO */}
          {activeTab === 'dicionario' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Dicionário de Traduções</h2>
              <p style={{ marginBottom: '30px', color: '#666' }}>Adicione palavras novas ao cérebro do sistema. Quando importar uma viatura com o "Termo Original", ele será convertido para a "Tradução" no site.</p>
              
              <form onSubmit={handleAddDict} style={{ display: 'flex', gap: '15px', marginBottom: '40px', background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
                <select value={newDict.category} onChange={e=>setNewDict({...newDict, category: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <option value="equipment">Equipamento (Extra)</option>
                  <option value="spec">Especificação (Técnica)</option>
                </select>
                <input required value={newDict.foreign_term} onChange={e=>setNewDict({...newDict, foreign_term: e.target.value})} placeholder="Termo Original (Ex: Sitzheizung)" style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                <input required value={newDict.pt_term} onChange={e=>setNewDict({...newDict, pt_term: e.target.value})} placeholder="Tradução PT (Ex: Bancos Aquecidos)" style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                <button type="submit" style={{ padding: '10px 20px', background: '#00d2ff', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Adicionar</button>
              </form>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#eee' }}>
                    <th style={{ padding: '12px' }}>Categoria</th>
                    <th style={{ padding: '12px' }}>Termo Original (Alemão)</th>
                    <th style={{ padding: '12px' }}>Tradução (PT)</th>
                    <th style={{ padding: '12px', width: '80px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dictionary.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}><span style={{ padding: '4px 8px', background: d.category === 'equipment' ? '#e3f2fd' : '#f3e5f5', borderRadius: '4px', fontSize: '0.8rem' }}>{d.category}</span></td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{d.foreign_term}</td>
                      <td style={{ padding: '12px' }}>{d.pt_term}</td>
                      <td style={{ padding: '12px' }}>
                        <button onClick={() => handleDeleteDict(d.id)} style={{ padding: '6px 12px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Apagar</button>
                      </td>
                    </tr>
                  ))}
                  {dictionary.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>O dicionário está vazio.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB MENSAGENS / LEADS */}
          {activeTab === 'leads' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Caixa de Entrada e CRM</h2>
              <p style={{ marginBottom: '30px', color: '#666' }}>Lista de pedidos de contacto e potenciais clientes angariados na Homepage.</p>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ background: '#eee', borderBottom: '2px solid #ccc' }}>
                      <th style={{ padding: '12px' }}>Data</th>
                      <th style={{ padding: '12px' }}>Cliente</th>
                      <th style={{ padding: '12px' }}>Contacto</th>
                      <th style={{ padding: '12px' }}>Viatura Pedida</th>
                      <th style={{ padding: '12px' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr key={lead.id} style={{ borderBottom: '1px solid #eee', background: lead.status === 'novo' ? 'rgba(0, 210, 255, 0.05)' : 'transparent' }}>
                        <td style={{ padding: '12px', fontSize: '0.9rem', color: '#666' }}>{new Date(lead.created_at).toLocaleString('pt-PT')}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 'bold' }}>{lead.contact_name}</div>
                          {lead.entity_type === 'coletiva' && <div style={{ fontSize: '0.8rem', color: '#888' }}>Empresa: {lead.company_name}</div>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div><a href={`mailto:${lead.email}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>{lead.email}</a></div>
                          <div><a href={`tel:${lead.phone}`} style={{ color: '#666', textDecoration: 'none' }}>{lead.phone}</a></div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 'bold' }}>{lead.brand} {lead.model}</div>
                          {lead.extras && <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px', maxWidth: '250px' }}>Extras: {lead.extras}</div>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <select 
                            value={lead.status || 'novo'} 
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            style={{ 
                              padding: '8px', 
                              borderRadius: '6px', 
                              border: '1px solid #ccc',
                              background: lead.status === 'novo' ? '#e3f2fd' : lead.status === 'contactado' ? '#e8f5e9' : '#fff',
                              color: '#333',
                              fontWeight: lead.status === 'novo' ? 'bold' : 'normal'
                            }}
                          >
                            <option value="novo">🔵 Novo</option>
                            <option value="em_analise">⏳ Em Análise</option>
                            <option value="contactado">✅ Contactado</option>
                            <option value="arquivado">📁 Arquivado</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Ainda não recebeu nenhuma mensagem.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB GESTÃO DE ADMINS */}
          {activeTab === 'admins' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Gestão de Administradores</h2>
              {status && <div style={{ padding: '15px', background: '#e0f7fa', color: '#006064', marginBottom: '20px', borderRadius: '8px' }}>{status}</div>}
              
              <p style={{ marginBottom: '30px', color: '#666' }}>Adicione ou remova utilizadores com acesso a este painel.</p>
              
              <form onSubmit={handleCreateAdmin} style={{ display: 'flex', gap: '15px', marginBottom: '40px', background: '#f9f9f9', padding: '20px', borderRadius: '8px', flexWrap: 'wrap' }}>
                <input required type="email" value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} placeholder="Email do novo admin" style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                <input required type="password" value={newAdminPassword} onChange={e=>setNewAdminPassword(e.target.value)} placeholder="Password" style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                <button type="submit" style={{ padding: '10px 20px', background: '#000', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Criar Administrador</button>
              </form>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#eee' }}>
                    <th style={{ padding: '12px' }}>Email</th>
                    <th style={{ padding: '12px' }}>Criado em</th>
                    <th style={{ padding: '12px', width: '100px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{a.email} {session?.user?.email === a.email && <span style={{fontSize: '0.8rem', color: '#888', fontWeight: 'normal'}}>(Tu)</span>}</td>
                      <td style={{ padding: '12px' }}>{new Date(a.created_at).toLocaleDateString('pt-PT')}</td>
                      <td style={{ padding: '12px' }}>
                        {session?.user?.email !== a.email && (
                          <button onClick={() => handleDeleteAdmin(a.id)} style={{ padding: '6px 12px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Apagar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {admins.length === 0 && (
                    <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Sem dados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
