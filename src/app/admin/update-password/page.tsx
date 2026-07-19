"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if the user is authenticated (they should be if they clicked the reset link)
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Sessão inválida ou expirada. Por favor, tente recuperar a password novamente.");
      }
    };
    checkUser();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMessage("Password atualizada com sucesso!");
      setTimeout(() => {
        router.push("/admin/login");
      }, 3000);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', color: '#333' }}>
      <style>{`
        input { color: #000 !important; background-color: #fff !important; }
      `}</style>
      <div style={{ width: '100%', maxWidth: '400px', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Definir Nova Password</h1>
          <p style={{ color: '#666' }}>Painel de Administração</p>
        </div>
        
        {error && (
          <div style={{ padding: '12px', background: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        {message ? (
          <div style={{ padding: '12px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
            {message}
            <div style={{ marginTop: '10px' }}>A redirecionar para o login...</div>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword}>
            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Nova Password</label>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px' }} 
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              style={{ width: '100%', padding: '14px', background: '#000', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? "A atualizar..." : "Atualizar Password"}
            </button>
          </form>
        )}
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link href="/admin/login" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>Voltar ao Login</Link>
        </div>
      </div>
    </div>
  );
}
