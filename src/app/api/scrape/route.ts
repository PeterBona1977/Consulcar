import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'edge';

// Função para traduzir texto usando a API gratuita do Google Translate
async function translateText(text: string): Promise<string> {
  if (!text || text.trim() === '') return text;
  try {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=${encodeURIComponent(text)}`);
    const data = await response.json();
    if (data && data[0]) {
      return data[0].map((item: any) => item[0]).join('');
    }
  } catch (e) {
    console.error('Erro na tradução:', e);
  }
  return text;
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'O URL é obrigatório' }, { status: 400 });
    }

    // Integração com Apify para o mobile.de
    if (url.includes('mobile.de')) {
      const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
      if (!APIFY_API_TOKEN) {
        return NextResponse.json({ error: 'Para extrair dados do Mobile.de, configure a variável de ambiente APIFY_API_TOKEN no Cloudflare.' }, { status: 403 });
      }

      const apifyUrl = `https://api.apify.com/v2/acts/memo23~mobile-de-scraper/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`;
      const apifyRes = await fetch(apifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startUrls: [{ url: url }] })
      });

      if (!apifyRes.ok) {
        throw new Error(`Erro ao contactar Apify: ${apifyRes.status}`);
      }

      const apifyData = await apifyRes.json();
      if (apifyData && apifyData.length > 0) {
        const car = apifyData[0];
        
        let extractedImages: string[] = [];
        if (car.images && Array.isArray(car.images)) {
          extractedImages = car.images.map((img: any) => {
            let uri = typeof img === 'string' ? img : (img.uri || '');
            if (!uri) return '';
            uri = uri.startsWith('http') ? uri : `https://${uri}`;
            
            // O mobile.de usa o classistatic que exige o parâmetro rule para as imagens não darem Erro 400
            if (uri.includes('classistatic.de') && !uri.includes('rule=')) {
              uri = `${uri}?rule=mo-1600.jpg`; // Usa resolução alta
            }
            
            return uri;
          }).filter(Boolean);
        }
        
        let extractedSpecs: {key: string, value: string}[] = [];
        if (car.attributes && Array.isArray(car.attributes)) {
          extractedSpecs = car.attributes.map((a: any) => ({
            key: a.label || '',
            value: Array.isArray(a.value) ? a.value.join(', ') : (a.value || '')
          }));
        }

        // Substituir <br> por \n para preservar os parágrafos na descrição final
        let cleanDesc = (car.htmlDescription || '').replace(/<br\s*\/?>/gi, '\n');
        cleanDesc = cleanDesc.replace(/(<([^>]+)>)/gi, ""); // remove as restantes tags HTML
        
        let translatedDescription = cleanDesc;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        
        if (GEMINI_API_KEY && cleanDesc) {
          try {
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Atua como um vendedor de carros de luxo em Portugal. Escreve uma descrição apaixonante, única e altamente persuasiva para o seguinte carro, otimizada para web (com parágrafos curtos e alguns emojis elegantes).
            
Detalhes técnicos conhecidos:
- Título: ${car.title || car.shortTitle}
- Preço: ${car.price && car.price.grs ? car.price.grs.localized : (car.price || 'Sob Consulta')}
- Combustível: ${car.fuel || 'Desconhecido'}
- Quilometragem: ${car.mileage || 'Desconhecida'}

Descrição original do anúncio (traduz/adapta isto mas foca-te em vender o carro de forma premium em Portugal):
${cleanDesc.substring(0, 2500)}

Regras: 
- Apenas escreve a descrição final pronta a publicar (não respondas 'Aqui está a descrição').
- Não inventes dados técnicos que não constem na lista ou na descrição original.
- O teu tom deve inspirar confiança e luxo.
- Adiciona uma chamada à ação (CTA) no final a dizer que tratamos de toda a importação, legalização e entrega chave-na-mão na Consulcar.`;

            const result = await model.generateContent(prompt);
            translatedDescription = result.response.text();
          } catch (e) {
            console.error("Erro no Gemini, a usar tradutor normal:", e);
            translatedDescription = await translateText(cleanDesc);
          }
        } else {
          translatedDescription = await translateText(cleanDesc);
        }
        
        let translatedEquipment = car.features || [];
        if (translatedEquipment.length > 0) {
          const joinedText = translatedEquipment.join(' || ');
          const translatedJoined = await translateText(joinedText);
          translatedEquipment = translatedJoined.split('||').map((e: string) => e.replace(/\|/g, '').trim()).filter((e: string) => e.length > 0);
        }

        return NextResponse.json({
          title: car.title || car.shortTitle || 'Viatura Desconhecida',
          image: extractedImages.length > 0 ? extractedImages[0] : 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1000',
          images: extractedImages,
          description: translatedDescription,
          price: car.price && car.price.grs ? car.price.grs.localized : (car.price || 'Sob Consulta'),
          equipment: translatedEquipment,
          specs: extractedSpecs,
          originalUrl: url
        });
      } else {
        return NextResponse.json({ error: 'O anúncio já não se encontra disponível ou o Apify falhou a extração.' }, { status: 404 });
      }
    }

    // Caso seja inserido um URL que não seja do mobile.de
    return NextResponse.json({ 
      error: 'O sistema de importação suporta exclusivamente links do mobile.de de momento. Por favor, insira um link válido do mobile.de.' 
    }, { status: 400 });

  } catch (error) {
    console.error('Erro no Scraping:', error);
    return NextResponse.json({ error: 'Não foi possível ler os dados deste site. Tente inserir manualmente.' }, { status: 500 });
  }
}
