"use client";

import { useState } from "react";
import Link from "next/link";

export default function InstalarPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const linkToCopy = window.location.href;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(linkToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        prompt("Copie o link manualmente:", linkToCopy);
      });
    } else {
      prompt("Copie o link manualmente:", linkToCopy);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: 'white', padding: '20px', textAlign: 'center' }}>
      <div style={{ width: '80px', height: '80px', background: '#050505', border: '2px solid #00d2ff', color: '#00d2ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '2rem', marginBottom: '30px' }}>
        CC
      </div>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '15px' }}>App Consulcar Admin</h1>
      <p style={{ color: '#aaa', fontSize: '1.2rem', maxWidth: '500px', marginBottom: '40px', lineHeight: 1.6 }}>
        Instale a nossa aplicação de gestão diretamente no seu telemóvel para gerir as suas viaturas e contactos com facilidade.
      </p>

      <div style={{ background: '#111', padding: '25px', borderRadius: '12px', border: '1px solid #333', maxWidth: '400px', width: '100%', marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px', color: '#fff' }}>Como instalar?</h3>
        <p style={{ color: '#aaa', marginBottom: '10px', fontSize: '0.95rem' }}>1. Aguarde pela notificação no fundo do ecrã.</p>
        <p style={{ color: '#aaa', marginBottom: '10px', fontSize: '0.95rem' }}>2. Clique em <strong>Instalar App</strong>.</p>
        <p style={{ color: '#aaa', fontSize: '0.95rem' }}>3. Aceda à App pelo ecrã principal do seu telemóvel!</p>
      </div>

      <div style={{ display: 'flex', gap: '15px', flexDirection: 'column', width: '100%', maxWidth: '400px' }}>
        <button onClick={handleCopy} style={{ padding: '15px', background: '#222', color: 'white', border: '1px solid #444', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>
          {copied ? "✅ Link Copiado!" : "Copiar link desta página"}
        </button>
        <Link href="/admin" style={{ padding: '15px', background: '#00d2ff', color: '#0a0a0a', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', fontSize: '1.1rem' }}>
          Ir para a Administração
        </Link>
      </div>
    </div>
  );
}
