"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (isForgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/update-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Foi enviado um email com instruções para repor a password.");
      }
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciais inválidas. Tente novamente.");
      setLoading(false);
    } else {
      router.push("/admin");
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', color: '#333' }}>
      <style>{`
        input { color: #000 !important; background-color: #fff !important; }
      `}</style>
      <div style={{ width: '100%', maxWidth: '400px', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Consulcar</h1>
          <p style={{ color: '#666' }}>Painel de Administração</p>
        </div>
        
        {error && (
          <div style={{ padding: '12px', background: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ padding: '12px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Email</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px' }} 
              placeholder="admin@consulcar.pt"
            />
          </div>
          
          {!isForgotPassword && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: 'bold' }}>Password</label>
              </div>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px' }} 
                placeholder="••••••••"
              />
            </div>
          )}

          <div style={{ textAlign: 'right', marginBottom: '30px' }}>
            <button 
              type="button" 
              onClick={() => {
                setIsForgotPassword(!isForgotPassword);
                setError("");
                setMessage("");
              }} 
              style={{ background: 'none', border: 'none', color: '#00d2ff', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              {isForgotPassword ? "Voltar ao Login" : "Esqueci-me da password"}
            </button>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: '#000', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? "Aguarde..." : (isForgotPassword ? "Recuperar Password" : "Entrar Seguro")}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link href="/" style={{ color: '#666', textDecoration: 'none', fontSize: '0.9rem' }}>&larr; Voltar ao site principal</Link>
        </div>
      </div>
    </div>
  );
}
