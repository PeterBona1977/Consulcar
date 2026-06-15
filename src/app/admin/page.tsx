"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface DictionaryEntry {
  id: string;
  category: string;
  foreign_term: string;
  pt_term: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("viaturas");
  
  // Dicionário
  const [dictionary, setDictionary] = useState<DictionaryEntry[]>([]);
  const [newDict, setNewDict] = useState({ category: 'equipment', foreign_term: '', pt_term: '' });
  
  // Viaturas (Nova)
  const [carTitle, setCarTitle] = useState("");
  const [carPrice, setCarPrice] = useState("");
  const [carImage, setCarImage] = useState("");
  const [carDesc, setCarDesc] = useState("");
  const [carOriginalUrl, setCarOriginalUrl] = useState("");
  
  // Dinâmicos
  const [specs, setSpecs] = useState<{key: string, value: string}[]>([{key: '', value: ''}]);
  const [equipment, setEquipment] = useState<string[]>(['']);
  
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchDictionary();
  }, []);

  const fetchDictionary = async () => {
    const { data } = await supabase.from('import_dictionary').select('*').order('created_at', { ascending: false });
    if (data) setDictionary(data);
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

    const { error } = await supabase.from('vehicles').insert([{
      title: carTitle,
      price: carPrice,
      image: carImage,
      description: carDesc,
      original_url: carOriginalUrl,
      images: [], // O utilizador depois pode editar
      specs: specsObj
    }]);

    if (error) {
      setStatus(`Erro: ${error.message}`);
    } else {
      setStatus("Viatura publicada com sucesso! Os equipamentos conhecidos foram traduzidos automaticamente.");
      setCarTitle(""); setCarPrice(""); setCarImage(""); setCarDesc(""); setCarOriginalUrl("");
      setSpecs([{key: '', value: ''}]); setEquipment(['']);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', color: '#333', padding: '50px 20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        <div style={{ display: 'flex', borderBottom: '1px solid #ddd', background: '#111' }}>
          <button onClick={() => setActiveTab('viaturas')} style={{ flex: 1, padding: '20px', background: activeTab === 'viaturas' ? '#222' : '#111', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>
            🚘 Nova Viatura
          </button>
          <button onClick={() => setActiveTab('dicionario')} style={{ flex: 1, padding: '20px', background: activeTab === 'dicionario' ? '#222' : '#111', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>
            🧠 Dicionário Inteligente
          </button>
          <Link href="/" style={{ padding: '20px', color: '#00d2ff', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Voltar ao Site</Link>
        </div>

        <div style={{ padding: '40px' }}>
          
          {/* TAB VIATURAS */}
          {activeTab === 'viaturas' && (
            <form onSubmit={handleSaveVehicle}>
              <h2 style={{ marginBottom: '20px' }}>Publicar Nova Viatura</h2>
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
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>URL Imagem Principal</label>
                  <input value={carImage} onChange={e=>setCarImage(e.target.value)} type="text" style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} placeholder="https://..." />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>URL do Anúncio Original</label>
                  <input value={carOriginalUrl} onChange={e=>setCarOriginalUrl(e.target.value)} type="text" style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }} placeholder="https://mobile.de/..." />
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

              <div style={{ marginTop: '40px', borderTop: '1px solid #ddd', paddingTop: '20px' }}>
                <button type="submit" style={{ padding: '15px 30px', background: '#000', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer' }}>Gravar Viatura e Traduzir</button>
              </div>
            </form>
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

        </div>
      </div>
    </div>
  );
}
