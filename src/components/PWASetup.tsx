"use client";

import { useEffect, useState } from "react";

export default function PWASetup() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("/sw.js").catch(err => {
          console.log("Service Worker registration failed: ", err);
        });
      });
    }

    const handler = (e: any) => {
      // Impede o prompt nativo de aparecer logo
      e.preventDefault();
      // Guarda o evento para o podermos acionar mais tarde
      setDeferredPrompt(e);
      // Mostra o nosso prompt personalizado
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Mostra o prompt nativo da web apenas após o clique do utilizador
    deferredPrompt.prompt();
    
    // Aguarda pela resposta do utilizador
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('O utilizador aceitou instalar a PWA');
    }
    
    // Limpa a variável e esconde o nosso popup
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', background: '#fff', color: '#000', padding: '20px', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        <div style={{ width: '50px', height: '50px', background: '#0a0a0a', color: '#00d2ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0 }}>
          CC
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>Instalar App Consulcar</h3>
          <p style={{ margin: '5px 0 0', fontSize: '0.9rem', color: '#555', lineHeight: 1.4 }}>Aceda à gestão de forma mais rápida e fácil a partir do seu ecrã principal.</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={handleDismiss} style={{ flex: 1, padding: '12px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', fontWeight: 'bold', color: '#555', cursor: 'pointer', fontSize: '0.95rem' }}>Agora Não</button>
        <button onClick={handleInstallClick} style={{ flex: 1, padding: '12px', background: '#00d2ff', border: 'none', borderRadius: '8px', fontWeight: 'bold', color: '#000', cursor: 'pointer', fontSize: '0.95rem' }}>Instalar App</button>
      </div>
    </div>
  );
}
