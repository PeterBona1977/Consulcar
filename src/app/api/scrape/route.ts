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
        const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
        
        if (GEMINI_API_KEY && cleanDesc) {
          try {
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const prompt = `Atua como um vendedor de carros de luxo em Portugal. Escreve uma descrição CURTA (máximo 3 parágrafos), cativante e altamente persuasiva para o seguinte carro. O objetivo é vender!
            
Detalhes técnicos conhecidos:
- Título: ${car.title || car.shortTitle}
- Preço: ${car.price && car.price.grs ? car.price.grs.localized : (car.price || 'Sob Consulta')}
- Combustível: ${car.fuel || 'Desconhecido'}
- Quilometragem: ${car.mileage || 'Desconhecida'}

Descrição original do anúncio (inspira-te nisto para destacar os pontos fortes):
${cleanDesc.substring(0, 2500)}

Regras ESTRITAS: 
- NUNCA incluas nomes de pessoas, stands originais (alemães), contactos telefónicos, moradas, sites ou emails que venham na descrição original. Elimina qualquer rasto do vendedor original.
- ESCREVE EXCLUSIVAMENTE EM PORTUGUÊS DE PORTUGAL (PT-PT), independentemente do idioma original!
- O texto tem de ser curto, direto ao ponto e focado na emoção e na exclusividade desta máquina.
- Usa alguns emojis elegantes, sem exagerar.
- Não inventes extras que o carro não tenha.
- Termina sempre com uma CTA curta: "A Consulcar trata de toda a importação, legalização e entrega chave-na-mão. Peça já a sua proposta!"
- Devolve APENAS a descrição pronta a publicar (sem introduções tuas).`;

            let result;
            try {
              const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
              result = await model.generateContent(prompt);
            } catch (err1: any) {
              console.log("O servidor Gemini principal está sobrecarregado. A tentar o modelo de reserva (Lite)...", err1.message);
              const fallbackModel = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
              result = await fallbackModel.generateContent(prompt);
            }
            
            translatedDescription = result.response.text();
          } catch (e: any) {
            console.error("Erro no Gemini:", e);
            translatedDescription = `[ERRO NA INTELIGÊNCIA ARTIFICIAL: A sua chave da Google (GEMINI_API_KEY) falhou. Mensagem: ${e.message}].\n\nPor favor, verifique a sua chave.`;
          }
        } else {
          translatedDescription = `[ERRO NA INTELIGÊNCIA ARTIFICIAL: Chave da Google (GEMINI_API_KEY) não configurada].\n\nPor favor, configure a chave no ficheiro .env para gerar descrições automaticamente.`;
        }
        
        let translatedEquipment = car.features || [];
        if (translatedEquipment.length > 0) {
          // Traduzir em blocos menores para não exceder o limite de URL da API do Google (GET request)
          const chunkSize = 10;
          const newEquip = [];
          for (let i = 0; i < translatedEquipment.length; i += chunkSize) {
            const chunk = translatedEquipment.slice(i, i + chunkSize);
            const joinedText = chunk.join(' ||| ');
            const translatedJoined = await translateText(joinedText);
            const splitTrans = translatedJoined.split('|||').map((e: string) => e.replace(/\|/g, '').trim()).filter((e: string) => e.length > 0);
            newEquip.push(...splitTrans);
          }
          translatedEquipment = newEquip.length > 0 ? newEquip : translatedEquipment;
        }

        // Traduzir também os valores e chaves da ficha técnica (que costumam vir em alemão/inglês)
        if (extractedSpecs.length > 0) {
          for (let i = 0; i < extractedSpecs.length; i++) {
             // Traduz a Chave (Ex: Getriebe -> Transmissão)
             if (extractedSpecs[i].key && typeof extractedSpecs[i].key === 'string') {
                extractedSpecs[i].key = await translateText(extractedSpecs[i].key);
             }
             // Traduz o Valor (Ex: Automatik -> Automático)
             if (extractedSpecs[i].value && typeof extractedSpecs[i].value === 'string' && !extractedSpecs[i].value.match(/^[0-9.,]+$/)) {
                extractedSpecs[i].value = await translateText(extractedSpecs[i].value);
             }
          }
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
