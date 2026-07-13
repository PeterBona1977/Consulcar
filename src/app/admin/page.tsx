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
  
  // Auth
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  // Gestão de Admins
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  
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
    }
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
    if (!confirm("Tem a certeza que deseja apagar esta viatura?")) return;
    await supabase.from('vehicles').delete().eq('id', id);
    fetchPublishedVehicles();
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

    let error;
    if (editingId) {
      const res = await supabase.from('vehicles').update(vehicleData).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('vehicles').insert([vehicleData]);
      error = res.error;
    }

    if (error) {
      setStatus(`Erro: ${error.message}`);
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
      `}</style>
      <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        <div style={{ display: 'flex', borderBottom: '1px solid #ddd', background: '#111', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('viaturas')} style={{ flex: 1, padding: '15px', background: activeTab === 'viaturas' ? '#222' : '#111', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
            🚘 Nova Viatura
          </button>
          <button onClick={() => setActiveTab('gestao')} style={{ flex: 1, padding: '15px', background: activeTab === 'gestao' ? '#222' : '#111', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
            📋 Viaturas
          </button>
          <button onClick={() => setActiveTab('dicionario')} style={{ flex: 1, padding: '15px', background: activeTab === 'dicionario' ? '#222' : '#111', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
            🧠 Dicionário
          </button>
          <button onClick={() => setActiveTab('admins')} style={{ flex: 1, padding: '15px', background: activeTab === 'admins' ? '#222' : '#111', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>
            👥 Admins
          </button>
          <div style={{ padding: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <Link href="/" style={{ color: '#00d2ff', textDecoration: 'none', fontSize: '0.9rem' }}>Site Principal</Link>
            <button onClick={handleLogout} style={{ background: 'transparent', color: '#ef5350', border: '1px solid #ef5350', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>Sair</button>
          </div>
        </div>

        <div style={{ padding: '40px' }}>
          
          {/* TAB VIATURAS */}
          {activeTab === 'viaturas' && (
            <form onSubmit={handleSaveVehicle}>
              <h2 style={{ marginBottom: '20px' }}>{editingId ? 'Editar Viatura' : 'Publicar Nova Viatura'}</h2>
              {status && <div style={{ padding: '15px', background: '#e0f7fa', color: '#006064', marginBottom: '20px', borderRadius: '8px' }}>{status}</div>}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Título do Anúncio</label>
                  <input required value={carTitle} onChange={e=>setCarTitle(e.target.value)} type="text" style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} placeholder="Ex: Suzuki Vitara 1.4" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Preço</label>
                  <input required value={carPrice} onChange={e=>setCarPrice(e.target.value)} type="text" style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} placeholder="Ex: 24.900 €" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Imagem URL: {carImages.length > 0 && <span style={{color:'green', fontSize:'0.8em'}}>({carImages.length} fotos extraídas da galeria)</span>}</label>
                  <input value={carImage} onChange={e=>setCarImage(e.target.value)} type="text" style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} placeholder="https://..." />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>URL do Anúncio Original</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input value={carOriginalUrl} onChange={e=>setCarOriginalUrl(e.target.value)} type="text" style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} placeholder="https://mobile.de/..." />
                    <button type="button" onClick={handleFetchDataFromUrl} disabled={isScraping} style={{ padding: '10px 15px', background: '#00d2ff', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: isScraping ? 'not-allowed' : 'pointer' }}>
                      {isScraping ? 'A extrair...' : 'Extrair Dados'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Descrição</label>
                <textarea value={carDesc} onChange={e=>setCarDesc(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px', minHeight: '100px' }}></textarea>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                {/* ESPECIFICAÇÕES */}
                <div>
                  <h3 style={{ marginBottom: '15px' }}>Dados Técnicos</h3>
                  {specs.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
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
                    <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
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
            <div>
              <h2 style={{ marginBottom: '20px' }}>Viaturas Publicadas</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{v.title}</td>
                      <td style={{ padding: '12px' }}>{v.price}</td>
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
