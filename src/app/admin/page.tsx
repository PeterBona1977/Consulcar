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

  const [userRole, setUserRole] = useState<string>("sales");
  const [roleError, setRoleError] = useState<string | null>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("admin");
  
  // Gestão de Admins Estendida
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [editingAdminIsActive, setEditingAdminIsActive] = useState<boolean>(true);
  
  // Transferência de Viaturas
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [inactivatingAdminId, setInactivatingAdminId] = useState<string | null>(null);
  const [transferVehicleId, setTransferVehicleId] = useState<string | null>(null);
  const [transferTargetUserId, setTransferTargetUserId] = useState("");

  // O Meu Perfil
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [profileCover, setProfileCover] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileHistory, setProfileHistory] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

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
  const [insertMode, setInsertMode] = useState<"link" | "manual">("link");
  const [uploadingImages, setUploadingImages] = useState(false);

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
      const { data: roleData, error: rErr } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
      
      if (rErr) {
        console.error("Role fetch error:", rErr);
        if (rErr.code === '42P01') {
          setRoleError("A tabela user_roles não existe. Por favor execute o script update_rbac.sql no Supabase!");
        } else {
          setRoleError("Não foi possível carregar a tua função (role) de acesso. Tens permissões apenas de Vendas.");
        }
      }
      
      const role = roleData?.role || 'sales';
      setUserRole(role);
      
      setSession(session);
      setAuthLoading(false);
      fetchDictionary();
      fetchPublishedVehicles(role, session.user.id);
      fetchProfile(session.user.id);
      if (role !== 'sales') fetchAdmins(session.access_token);
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
        body: JSON.stringify({ email: newAdminEmail, password: newAdminPassword, role: newAdminRole })
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
  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    if (data) {
      setProfileName(data.name || "");
      setProfilePhone(data.phone || "");
      setProfileImage(data.profile_image || "");
      setProfileCover(data.cover_image || "");
      setProfileBio(data.biography || "");
      setProfileHistory(data.history || "");
    }
    setProfileLoading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setStatus("A guardar perfil...");
    const { error } = await supabase.from('user_profiles').upsert({
      id: session.user.id,
      name: profileName,
      phone: profilePhone,
      profile_image: profileImage,
      cover_image: profileCover,
      biography: profileBio,
      history: profileHistory
    });
    if (error) setStatus(`Erro ao guardar perfil: ${error.message}`);
    else setStatus("Perfil guardado com sucesso!");
    setTimeout(() => setStatus(""), 4000);
  };

  const handleEditAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !editingAdminId) return;
    setStatus("A atualizar administrador...");
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          id: editingAdminId, 
          email: newAdminEmail || undefined, 
          password: newAdminPassword || undefined, 
          role: newAdminRole,
          is_active: editingAdminIsActive
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setStatus("Administrador atualizado com sucesso!");
      setTimeout(() => setStatus(""), 5000);
      setNewAdminEmail("");
      setNewAdminPassword("");
      setEditingAdminId(null);
      fetchAdmins(session.access_token);
    } catch (error: any) {
      setStatus(`Erro: ${error.message}`);
    }
  };

  const handleInactivateAdminClick = async (id: string) => {
    // Check if user has vehicles
    const { data: vehicles } = await supabase.from('vehicles').select('id').eq('user_id', id).limit(1);
    if (vehicles && vehicles.length > 0) {
      setInactivatingAdminId(id);
      setTransferTargetUserId("");
      setTransferModalOpen(true);
    } else {
      // Direct inactivation
      if (confirm("Tem a certeza que deseja inativar este administrador? Ele não terá mais acesso.")) {
        inactivateAdminRequest(id);
      }
    }
  };

  const inactivateAdminRequest = async (id: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ id, is_active: false })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchAdmins(session.access_token);
      setStatus("Administrador inativado com sucesso!");
      setTimeout(() => setStatus(""), 4000);
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const handleTransferVehiclesSubmit = async () => {
    if (!transferTargetUserId) return alert("Selecione um utilizador de destino");
    setStatus("A transferir viaturas...");
    try {
      const payload = transferVehicleId 
        ? { vehicle_id: transferVehicleId, to_user_id: transferTargetUserId }
        : { from_user_id: inactivatingAdminId, to_user_id: transferTargetUserId };

      const res = await fetch('/api/admin/transfer-vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTransferModalOpen(false);
      setTransferVehicleId(null);
      fetchPublishedVehicles();

      if (inactivatingAdminId) {
        // Proceed to inactivate now that vehicles are transferred
        await inactivateAdminRequest(inactivatingAdminId);
        setInactivatingAdminId(null);
      } else {
        setStatus("Transferência concluída.");
        setTimeout(() => setStatus(""), 4000);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
      setStatus("");
    }
  };


  const fetchDictionary = async () => {
    const { data } = await supabase.from('import_dictionary').select('*').order('created_at', { ascending: false });
    if (data) setDictionary(data);
  };

  const fetchPublishedVehicles = async (role: string = userRole, userId: string = session?.user?.id) => {
    let query = supabase.from('vehicles').select('*').order('created_at', { ascending: false });
    if (role === 'sales' && userId) {
      query = query.eq('user_id', userId);
    }
    const { data } = await query;
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
    setInsertMode(v.original_url ? "link" : "manual");
    
    // Parse specs
    const s = v.specs || {};
    const loadedSpecs = Object.keys(s)
      .filter(k => k !== 'equipment' && k !== 'costs')
      .map(k => ({ key: k, value: s[k] }));
    setSpecs(loadedSpecs.length > 0 ? loadedSpecs : [{key: '', value: ''}]);
    
    // Parse equipment
    const eq = s.equipment || [];
    setEquipment(eq.length > 0 ? eq : ['']);

    // Parse costs
    const c = s.costs || [];
    setCosts(c);
    
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingImages(true);
    setStatus("A carregar imagens...");
    
    const formData = new FormData();
    Array.from(e.target.files).forEach(file => {
      formData.append('images', file);
    });

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar imagens');
      
      setCarImages(prev => [...prev, ...data.urls]);
      if (data.urls.length > 0 && !carImage) {
        setCarImage(data.urls[0]);
      }
      setStatus("Imagens carregadas com sucesso!");
      setTimeout(() => setStatus(""), 3000);
    } catch (err: any) {
      setStatus(`Erro ao carregar imagens: ${err.message}`);
    } finally {
      setUploadingImages(false);
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
    specsObj.costs = costs;

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
        
        /* Mobile Default Styles */
        .admin-hamburger { display: flex; padding: 15px 20px; background: #111; color: white; cursor: pointer; font-weight: bold; justify-content: space-between; align-items: center; border-bottom: 1px solid #222; }
        .admin-nav { position: fixed; top: 0; right: -300px; width: 300px; height: 100vh; background: #111; flex-direction: column; display: flex; transition: right 0.3s ease-in-out; z-index: 1000; box-shadow: -5px 0 15px rgba(0,0,0,0.5); overflow-y: auto; }
        .admin-nav.open { right: 0; }
        .admin-nav-close { text-align: right; padding: 15px 20px; cursor: pointer; color: white; font-size: 1.5rem; border-bottom: 1px solid #222; }
        .admin-nav button { text-align: left; padding: 15px 20px; border-bottom: 1px solid #222; color: white; border: none; cursor: pointer; font-size: 1rem; font-weight: bold; background: transparent; }
        .admin-nav .admin-nav-actions { width: 100%; flex-direction: column; justify-content: flex-start; padding: 15px 20px; display: flex; gap: 15px; border-top: 1px solid #333; }
        .admin-nav-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 999; opacity: 0; pointer-events: none; transition: opacity 0.3s ease-in-out; }
        .admin-nav-overlay.open { opacity: 1; pointer-events: auto; }
        .admin-content-pad { padding: 20px 15px !important; }
        
        .admin-grid { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 30px; }
        .admin-flex-row { display: flex; flex-direction: column; gap: 10px; }
        .admin-flex-row button { width: 100%; }
        
        .admin-sections-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
        .admin-spec-row { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }

        /* Responsive Tables for Mobile */
        .admin-table-wrapper { overflow-x: visible; width: 100%; }
        table { width: 100%; border-collapse: collapse; text-align: left; display: block; }
        thead { display: none; }
        tbody { display: block; width: 100%; }
        tr { display: flex; flex-direction: column; margin-bottom: 20px; background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #ddd; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        td { display: flex; flex-direction: column; padding: 10px 0; border-bottom: 1px solid #eee; }
        td:last-child { border-bottom: none; }
        td::before { content: attr(data-label); font-size: 0.75rem; font-weight: bold; color: #888; text-transform: uppercase; margin-bottom: 4px; }
        
        /* Desktop Override */
        @media (min-width: 768px) {
          .admin-content-pad { padding: 40px !important; }
          
          .admin-grid { grid-template-columns: 1fr 1fr; }
          .admin-flex-row { flex-direction: row; }
          .admin-flex-row button { width: auto; }
          
          .admin-sections-grid { grid-template-columns: 1fr 1fr; gap: 40px; }

          .admin-table-wrapper { overflow-x: auto; }
          table { display: table; }
          thead { display: table-header-group; }
          tbody { display: table-row-group; }
          tr { display: table-row; margin-bottom: 0; background: transparent; padding: 0; border: none; border-bottom: 1px solid #eee; box-shadow: none; }
          td { display: table-cell; padding: 12px; border-bottom: none; }
          td::before { display: none; }
          .admin-spec-row { flex-direction: row; }
        }
      `}</style>
      <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        {roleError && (
          <div style={{ padding: '15px', background: '#ffebee', color: '#c62828', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #ffcdd2' }}>
            ⚠️ {roleError}
          </div>
        )}

        <div className="admin-nav-container">
          <div className={`admin-nav-overlay ${isAdminMenuOpen ? 'open' : ''}`} onClick={() => setIsAdminMenuOpen(false)}></div>
          <div className="admin-hamburger" onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}>
            <span>Menu de Administração ({activeTab.charAt(0).toUpperCase() + activeTab.slice(1)})</span>
            <span>☰</span>
          </div>
          <div className={`admin-nav ${isAdminMenuOpen ? 'open' : ''}`}>
            <div className="admin-nav-close" onClick={() => setIsAdminMenuOpen(false)}>✕</div>
            <button onClick={() => { setActiveTab('viaturas'); setIsAdminMenuOpen(false); }} style={{ background: activeTab === 'viaturas' ? '#222' : '#111' }}>
              🚘 Nova Viatura
            </button>
            <button onClick={() => { setActiveTab('gestao'); setIsAdminMenuOpen(false); }} style={{ background: activeTab === 'gestao' ? '#222' : '#111' }}>
              📋 Viaturas
            </button>
            {userRole !== 'sales' && (
              <button onClick={() => { setActiveTab('dicionario'); setIsAdminMenuOpen(false); }} style={{ background: activeTab === 'dicionario' ? '#222' : '#111' }}>
                🧠 Dicionário
              </button>
            )}
            <button onClick={() => { setActiveTab('leads'); setIsAdminMenuOpen(false); }} style={{ background: activeTab === 'leads' ? '#222' : '#111' }}>
              📩 Mensagens
            </button>
            {userRole !== 'sales' && (
              <button onClick={() => { setActiveTab('admins'); setIsAdminMenuOpen(false); }} style={{ background: activeTab === 'admins' ? '#222' : '#111' }}>
                👥 Admins
              </button>
            )}
            <button onClick={() => { setActiveTab('perfil'); setIsAdminMenuOpen(false); }} style={{ background: activeTab === 'perfil' ? '#222' : '#111' }}>
              👤 O Meu Perfil
            </button>
            <div className="admin-nav-actions">
              <Link href="/" target="_blank" style={{ color: '#00d2ff', textDecoration: 'none', fontSize: '1rem', fontWeight: 'bold' }}>Ver Site Principal</Link>
              <button onClick={handleLogout} style={{ background: '#c62828', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', width: '100%', textAlign: 'center' }}>Sair da Sessão</button>
            </div>
          </div>
        </div>

        <div style={{ padding: '40px' }} className="admin-content-pad">
          
          {/* TAB VIATURAS */}
          {activeTab === 'viaturas' && (
            <form onSubmit={handleSaveVehicle}>
              <h2 style={{ marginBottom: '20px' }}>{editingId ? 'Editar Viatura' : 'Publicar Nova Viatura'}</h2>
              {status && <div style={{ padding: '15px', background: '#e0f7fa', color: '#006064', marginBottom: '20px', borderRadius: '8px' }}>{status}</div>}
              
              <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <label style={{ fontWeight: 'bold' }}>Modo de Inserção:</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input type="radio" name="insertMode" checked={insertMode === 'link'} onChange={() => setInsertMode('link')} /> Por Link (Ex: Mobile.de)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input type="radio" name="insertMode" checked={insertMode === 'manual'} onChange={() => setInsertMode('manual')} /> Manual (Carregar Imagens)
                </label>
              </div>

              {insertMode === 'link' ? (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>URL do Anúncio Original</label>
                  <div className="admin-flex-row">
                    <input value={carOriginalUrl} onChange={e=>setCarOriginalUrl(e.target.value)} type="text" style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} placeholder="https://mobile.de/..." />
                    <button type="button" onClick={handleFetchDataFromUrl} disabled={isScraping} style={{ padding: '10px 15px', background: '#00d2ff', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: isScraping ? 'not-allowed' : 'pointer' }}>
                      {isScraping ? 'A extrair...' : 'Extrair Dados'}
                    </button>
                  </div>
                </div>
              ) : null}

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #ddd' }}>
                      <button type="button" onClick={() => setCosts([...costs, {description: '', value: ''}])} style={{ padding: '8px 15px', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>+ Adicionar Custo</button>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#111' }}>
                        Total:{' '}
                        {(() => {
                          const parse = (v: any) => {
                            const s = String(v || '').replace(/\s|€/g, '');
                            if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
                            return parseFloat(s) || 0;
                          };
                          const base = parse(carPrice);
                          const totalCosts = costs.reduce((acc, c) => acc + parse(c.value), 0);
                          return (base + totalCosts).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  {insertMode === 'link' ? (
                    <>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Imagem Principal URL: {carImages.length > 0 && <span style={{color:'green', fontSize:'0.8em'}}>({carImages.length} fotos extraídas da galeria)</span>}</label>
                      <input value={carImage} onChange={e=>setCarImage(e.target.value)} type="text" style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px', marginBottom: '10px' }} placeholder="https://..." />
                    </>
                  ) : (
                    <label style={{ display: 'block', marginBottom: '15px', fontWeight: 'bold' }}>Galeria de Imagens: {carImages.length > 0 && <span style={{color:'green', fontSize:'0.8em'}}>({carImages.length} fotos)</span>}</label>
                  )}
                  
                  {insertMode === 'manual' && (
                    <div style={{ padding: '30px 20px', border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center', background: '#fafafa', cursor: 'pointer' }} onClick={() => document.getElementById('manual-upload-input')?.click()}>
                      <p style={{ margin: '0 0 10px 0', color: '#666', fontWeight: 'bold', fontSize: '1.1rem' }}>Arrastar fotos ou clicar para carregar</p>
                      <p style={{ fontSize: '0.85rem', color: '#999', margin: '0 0 10px 0' }}>A primeira foto carregada será a Capa do anúncio.</p>
                      <input 
                        id="manual-upload-input"
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        disabled={uploadingImages}
                        style={{ display: 'none' }}
                      />
                      {uploadingImages && <p style={{ color: '#00d2ff', fontWeight: 'bold', marginTop: '10px' }}>A enviar imagens...</p>}
                    </div>
                  )}

                  {carImages.length > 0 && insertMode === 'manual' && (
                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '20px' }}>
                       {carImages.map((img, i) => (
                         <div key={i} style={{ position: 'relative', width: '120px', height: '90px' }}>
                           <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: carImage === img ? '3px solid #00d2ff' : '1px solid #ddd' }} />
                           <button type="button" onClick={() => setCarImage(img)} style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', fontSize: '11px', padding: '6px', cursor: 'pointer', borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px', fontWeight: carImage === img ? 'bold' : 'normal' }}>
                             {carImage === img ? 'Capa ⭐' : 'Definir Capa'}
                           </button>
                           <button type="button" onClick={() => {
                             const newImgs = [...carImages];
                             newImgs.splice(i, 1);
                             setCarImages(newImgs);
                             if (carImage === img && newImgs.length > 0) setCarImage(newImgs[0]);
                             else if (carImage === img) setCarImage('');
                           }} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
                         </div>
                       ))}
                     </div>
                  )}
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
            <div className="admin-table-wrapper">
              <h2 style={{ marginBottom: '20px' }}>Viaturas Publicadas</h2>
              <table style={{ minWidth: '100%' }}>
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
                    <tr key={v.id}>
                      <td data-label="Imagem">
                        {v.image ? (
                          <img src={v.image} alt={v.title} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        ) : (
                          <div style={{ width: '80px', height: '60px', background: '#ccc', borderRadius: '4px' }}></div>
                        )}
                      </td>
                      <td data-label="Título" style={{ fontWeight: 'bold', wordBreak: 'break-word', maxWidth: '300px' }}>{v.title}</td>
                      <td data-label="Preço" style={{ wordBreak: 'break-word', maxWidth: '200px' }}>{v.price}</td>
                      <td data-label="Ações">
                        <Link href={`/viaturas/${v.id}`} target="_blank" style={{ display: 'inline-block', padding: '6px 12px', background: '#e3f2fd', color: '#1565c0', textDecoration: 'none', borderRadius: '4px', marginRight: '10px', marginBottom: '5px' }}>Ver</Link>
                        <button onClick={() => handleEditVehicle(v)} style={{ padding: '6px 12px', background: '#fff3e0', color: '#ef6c00', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px', marginBottom: '5px' }}>Editar</button>
                        <button onClick={() => {
                          setTransferVehicleId(v.id);
                          setTransferTargetUserId("");
                          setTransferModalOpen(true);
                        }} style={{ padding: '6px 12px', background: '#e8f5e9', color: '#2e7d32', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px', marginBottom: '5px' }}>Transferir</button>
                        <button onClick={() => handleDeleteVehicle(v.id)} style={{ padding: '6px 12px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '5px' }}>Apagar</button>
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

              <div className="admin-table-wrapper">
                <table style={{ minWidth: '100%' }}>
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
                      <tr key={d.id}>
                        <td data-label="Categoria"><span style={{ padding: '4px 8px', background: d.category === 'equipment' ? '#e3f2fd' : '#f3e5f5', borderRadius: '4px', fontSize: '0.8rem' }}>{d.category}</span></td>
                        <td data-label="Termo Original" style={{ fontWeight: 'bold' }}>{d.foreign_term}</td>
                        <td data-label="Tradução (PT)">{d.pt_term}</td>
                        <td data-label="Ações">
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
            </div>
          )}

          {/* TAB MENSAGENS / LEADS */}
          {activeTab === 'leads' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Caixa de Entrada e CRM</h2>
              <p style={{ marginBottom: '30px', color: '#666' }}>Lista de pedidos de contacto e potenciais clientes angariados na Homepage.</p>
              
              <div className="admin-table-wrapper">
                <table style={{ minWidth: '100%' }}>
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
                      <tr key={lead.id} style={{ background: lead.status === 'novo' ? 'rgba(0, 210, 255, 0.05)' : 'transparent' }}>
                        <td data-label="Data" style={{ fontSize: '0.9rem', color: '#666' }}>{new Date(lead.created_at).toLocaleString('pt-PT')}</td>
                        <td data-label="Cliente">
                          <div style={{ fontWeight: 'bold' }}>{lead.contact_name}</div>
                          {lead.entity_type === 'coletiva' && <div style={{ fontSize: '0.8rem', color: '#888' }}>Empresa: {lead.company_name}</div>}
                        </td>
                        <td data-label="Contacto">
                          <div><a href={`mailto:${lead.email}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>{lead.email}</a></div>
                          <div><a href={`tel:${lead.phone}`} style={{ color: '#666', textDecoration: 'none' }}>{lead.phone}</a></div>
                        </td>
                        <td data-label="Viatura">
                          <div style={{ fontWeight: 'bold' }}>{lead.brand} {lead.model}</div>
                          {lead.extras && <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px', maxWidth: '250px' }}>Extras: {lead.extras}</div>}
                        </td>
                        <td data-label="Estado">
                          <select 
                            value={lead.status || 'novo'} 
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            style={{ 
                              padding: '8px', 
                              borderRadius: '6px', 
                              border: '1px solid #ccc',
                              background: lead.status === 'novo' ? '#e3f2fd' : lead.status === 'contactado' ? '#e8f5e9' : '#fff',
                              color: '#333',
                              fontWeight: lead.status === 'novo' ? 'bold' : 'normal',
                              width: '100%',
                              maxWidth: '200px'
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
              
              <form autoComplete="off" onSubmit={handleCreateAdmin} style={{ display: 'flex', gap: '15px', marginBottom: '40px', background: '#f9f9f9', padding: '20px', borderRadius: '8px', flexWrap: 'wrap' }}>
                <input required type="email" name="new_user_email" autoComplete="new-password" value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} placeholder="ex: utilizador@email.com" style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#111' }} />
                <input required type="password" name="new_user_password" autoComplete="new-password" value={newAdminPassword} onChange={e=>setNewAdminPassword(e.target.value)} placeholder="Introduza uma palavra-passe" style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#111' }} />
                <select value={newAdminRole} onChange={e=>setNewAdminRole(e.target.value)} style={{ flex: 1, minWidth: '150px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#111' }}>
                  <option value="admin">Administrador Geral</option>
                  <option value="sales">Comercial (Vendas)</option>
                </select>
                <button type="submit" style={{ padding: '10px 20px', background: '#000', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Criar Utilizador</button>
              </form>

              <div className="admin-table-wrapper">
                <table style={{ minWidth: '100%' }}>
                  <thead>
                    <tr style={{ background: '#eee' }}>
                      <th style={{ padding: '12px' }}>Email</th>
                      <th style={{ padding: '12px' }}>Função</th>
                      <th style={{ padding: '12px' }}>Estado</th>
                      <th style={{ padding: '12px' }}>Criado em</th>
                      <th style={{ padding: '12px', width: '200px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map(a => (
                      <tr key={a.id} style={{ background: !a.is_active ? '#f5f5f5' : 'transparent' }}>
                        <td data-label="Email" style={{ fontWeight: 'bold', color: !a.is_active ? '#999' : 'inherit', wordBreak: 'break-all' }}>{a.email} {session?.user?.email === a.email && <span style={{fontSize: '0.8rem', color: '#888', fontWeight: 'normal'}}>(Tu)</span>}</td>
                        <td data-label="Função" style={{ color: !a.is_active ? '#999' : 'inherit' }}>{a.role === 'super_admin' ? 'Super Admin' : a.role === 'sales' ? 'Comercial' : 'Admin'}</td>
                        <td data-label="Estado">
                          <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', background: a.is_active ? '#e8f5e9' : '#ffebee', color: a.is_active ? '#2e7d32' : '#c62828', display: 'inline-block' }}>
                            {a.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td data-label="Criado em" style={{ color: !a.is_active ? '#999' : 'inherit' }}>{new Date(a.created_at).toLocaleDateString('pt-PT')}</td>
                        <td data-label="Ações">
                          {session?.user?.email !== a.email && a.is_active && (
                            <>
                              <button onClick={() => {
                                setEditingAdminId(a.id);
                                setNewAdminEmail(a.email);
                                setNewAdminRole(a.role);
                                setEditingAdminIsActive(a.is_active);
                              }} style={{ padding: '6px 12px', background: '#fff3e0', color: '#ef6c00', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}>Editar</button>
                              <button onClick={() => handleInactivateAdminClick(a.id)} style={{ padding: '6px 12px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Inativar</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {admins.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Sem dados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modals e Forms Inline para Admins */}
              {editingAdminId && (
                <div style={{ marginTop: '40px', padding: '20px', background: '#fff3e0', borderRadius: '8px', border: '1px solid #ffe0b2' }}>
                  <h3 style={{ marginBottom: '15px' }}>Editar Administrador</h3>
                  <form autoComplete="off" onSubmit={handleEditAdminSubmit} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="email" value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} placeholder="Email" style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    <input type="password" value={newAdminPassword} onChange={e=>setNewAdminPassword(e.target.value)} placeholder="Nova password (deixe em branco para manter)" style={{ flex: 1, minWidth: '250px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    <select value={newAdminRole} onChange={e=>setNewAdminRole(e.target.value)} style={{ flex: 1, minWidth: '150px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                      <option value="admin">Administrador Geral</option>
                      <option value="sales">Comercial (Vendas)</option>
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input type="checkbox" checked={editingAdminIsActive} onChange={e=>setEditingAdminIsActive(e.target.checked)} />
                      Ativo
                    </label>
                    <button type="submit" style={{ padding: '10px 20px', background: '#ef6c00', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Salvar Alterações</button>
                    <button type="button" onClick={() => setEditingAdminId(null)} style={{ padding: '10px 20px', background: '#ccc', color: '#333', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB O MEU PERFIL */}
          {activeTab === 'perfil' && (
            <div>
              <h2 style={{ marginBottom: '20px' }}>O Meu Perfil</h2>
              <p style={{ marginBottom: '30px', color: '#666' }}>Estes dados serão apresentados na sua página pública de vendedor.</p>
              
              {status && <div style={{ padding: '15px', background: '#e0f7fa', color: '#006064', marginBottom: '20px', borderRadius: '8px' }}>{status}</div>}

              {profileLoading ? <p>A carregar perfil...</p> : (
                <form onSubmit={handleSaveProfile} style={{ maxWidth: '600px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nome / Empresa</label>
                    <input required type="text" value={profileName} onChange={e=>setProfileName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Contacto Telefónico</label>
                    <input type="text" value={profilePhone} onChange={e=>setProfilePhone(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Imagem de Perfil (URL ou Faça Upload de uma viatura e copie o link)</label>
                    <input type="text" value={profileImage} onChange={e=>setProfileImage(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    {profileImage && <img src={profileImage} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginTop: '10px' }} />}
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Imagem de Capa (URL)</label>
                    <input type="text" value={profileCover} onChange={e=>setProfileCover(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    {profileCover && <img src={profileCover} style={{ width: '100%', height: '120px', borderRadius: '8px', objectFit: 'cover', marginTop: '10px' }} />}
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Biografia</label>
                    <textarea value={profileBio} onChange={e=>setProfileBio(e.target.value)} rows={4} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}></textarea>
                  </div>
                  <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Histórico / Experiência</label>
                    <textarea value={profileHistory} onChange={e=>setProfileHistory(e.target.value)} rows={3} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}></textarea>
                  </div>
                  <button type="submit" style={{ padding: '15px 30px', background: '#00d2ff', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem' }}>Salvar Perfil</button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Transfer Vehicles Modal */}
      {transferModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '500px', width: '100%' }}>
            <h3 style={{ marginBottom: '15px' }}>Transferir Viaturas</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Selecione o vendedor para o qual deseja transferir as viaturas. Apenas utilizadores ativos aparecem na lista.
            </p>
            <select value={transferTargetUserId} onChange={e => setTransferTargetUserId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '20px' }}>
              <option value="">Selecione um vendedor...</option>
              {admins.filter(a => a.is_active && a.id !== inactivatingAdminId).map(a => (
                <option key={a.id} value={a.id}>{a.email} ({a.role})</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button onClick={() => {
                setTransferModalOpen(false);
                setInactivatingAdminId(null);
                setTransferVehicleId(null);
              }} style={{ padding: '10px 20px', background: '#eee', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleTransferVehiclesSubmit} style={{ padding: '10px 20px', background: '#00d2ff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Confirmar Transferência</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
