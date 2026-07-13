import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

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
            const uri = typeof img === 'string' ? img : (img.uri || '');
            if (!uri) return '';
            return uri.startsWith('http') ? uri : `https://${uri}`;
          }).filter(Boolean);
        }
        
        let extractedSpecs: {key: string, value: string}[] = [];
        if (car.attributes && Array.isArray(car.attributes)) {
          extractedSpecs = car.attributes.map((a: any) => ({
            key: a.label || '',
            value: Array.isArray(a.value) ? a.value.join(', ') : (a.value || '')
          }));
        }

        const translatedDescription = await translateText(car.htmlDescription || '');
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

    // Integração com serviço de Proxy (ScraperAPI) para outros sites como o Standvirtual
    const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || 'e5092038ee5044fc3ad892e9f180f52b';
    
    let fetchUrl = url;
    let fetchOptions: RequestInit = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    };

    if (url.includes('standvirtual.com') || url.includes('autoscout24')) {
      if (!SCRAPER_API_KEY) {
        return NextResponse.json({ 
          error: 'A chave da API ScraperAPI não está configurada.' 
        }, { status: 403 });
      }
      
      if (url.includes('autoscout24')) {
        fetchUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=true&premium=true`;
      } else {
        fetchUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
      }
      
      fetchOptions = {}; // O serviço de proxy trata dos headers
    }

    const response = await fetch(fetchUrl, fetchOptions);

    if (response.status === 404) {
      return NextResponse.json({ error: 'O anúncio já não se encontra disponível (foi vendido ou removido).' }, { status: 404 });
    }

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} ao contactar ${fetchUrl}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Generic fallback scraping
    let title = $('meta[property="og:title"]').attr('content') || $('title').text();
    let image = $('meta[property="og:image"]').attr('content') || '';
    let description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    let price = $('.offer-price__number').text().trim() || $('.h3.u-text-bold').first().text().trim() || 'Sob Consulta';

    let equipment: string[] = [];
    let specs: {key: string, value: string}[] = [];
    let images: string[] = [];

    // --- Tentativa de extração via __NEXT_DATA__ (Standvirtual / Next.js) ---
    try {
      const nextDataText = $('#__NEXT_DATA__').html();
      if (nextDataText) {
        const nextData = JSON.parse(nextDataText);
        
        let adObj: any = null;
        // Função para procurar o objeto do anúncio recursivamente
        const findAd = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          if (obj.title && obj.price && (obj.parameters || obj.attributes || obj.features || obj.description)) {
            adObj = obj;
            return;
          }
          Object.values(obj).forEach(val => {
            if (!adObj) findAd(val);
          });
        };
        findAd(nextData);

        if (adObj) {
          if (adObj.title) title = adObj.title;
          if (adObj.description) description = adObj.description.replace(/(<([^>]+)>)/gi, ""); // remover HTML
          if (adObj.price && adObj.price.value) price = adObj.price.value.toString() + ' €';
          
          // Extrair Fotos
          if (adObj.photos && Array.isArray(adObj.photos)) {
             images = adObj.photos.map((p: any) => typeof p === 'string' ? p : (p.url || p.link)).filter(Boolean);
          } else if (adObj.images && Array.isArray(adObj.images)) {
             images = adObj.images.map((p: any) => typeof p === 'string' ? p : (p.url || p.link)).filter(Boolean);
          }

          // Extrair Specs (Dados Técnicos)
          const params = adObj.parameters || adObj.attributes || [];
          if (Array.isArray(params)) {
             params.forEach((p: any) => {
               if (p.key === 'equipment' || p.key === 'features') {
                 if (Array.isArray(p.value)) equipment = [...equipment, ...p.value];
               } else if (p.label && p.value && typeof p.value === 'string') {
                 specs.push({ key: p.label, value: p.value });
               }
             });
          }

          // Extrair Equipamentos (Features)
          if (adObj.features && Array.isArray(adObj.features)) {
             equipment = [...equipment, ...adObj.features];
          }
        }
      }
    } catch (e) {
      console.log('Aviso: Falha ao fazer parse do __NEXT_DATA__', e);
    }

    // --- Fallbacks baseados no HTML (se o JSON não tiver as informações) ---
    
    // Descrição Real (Fallbacks DOM)
    if (!description || description.length < 200) {
      const domDesc = $('div[data-testid="ad-description"]').text().trim() || $('.offer-description__content').text().trim();
      if (domDesc) description = domDesc;
    }

    // Imagens (Galeria Fallback)
    if (images.length === 0) {
      $('img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && (src.includes('apollo.olxcdn.com') || src.includes('mobile.de/')) && src.includes('image')) {
           // Corrigir resoluções baixas se possível
           const hqSrc = src.replace(/;s=\d+x\d+/, ';s=1000x0');
           if (!images.includes(hqSrc)) images.push(hqSrc);
        }
      });
      if (image && !images.includes(image)) images.unshift(image);
    }

    // Equipamentos (Fallback DOM)
    if (equipment.length === 0) {
      $('.bullet-list li, #features-bullet-list li, .offer-features__item, .equipment-list li, li').each((i, el) => {
        const text = $(el).text().trim();
        // Filtrar strings que parecem ser equipamento
        if (text && text.length < 50 && text.length > 3 && !text.includes('\\n')) {
          if (!equipment.includes(text)) equipment.push(text);
        }
      });
      // Limitar a 50 equipamentos para não apanhar lixo do menu
      equipment = equipment.slice(0, 50);
    }

    // Limpezas
    title = title.replace(' - Standvirtual', '').replace(' no Standvirtual', '').trim();
    if (price !== 'Sob Consulta' && !price.includes('€')) {
      price = price.replace(/[^0-9, ]/g, '').trim() + ' €';
    }

    // --- Tradução Automática ---
    const translatedDescription = await translateText(description);
    
    let translatedEquipment = equipment;
    if (equipment.length > 0) {
      const joinedText = equipment.join(' || ');
      const translatedJoined = await translateText(joinedText);
      translatedEquipment = translatedJoined.split('||').map(e => e.replace(/\|/g, '').trim()).filter(e => e.length > 0);
    }

    return NextResponse.json({
      title: title || 'Viatura Desconhecida',
      image: images.length > 0 ? images[0] : (image || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1000'),
      images: images,
      description: translatedDescription,
      price: price,
      equipment: translatedEquipment,
      specs: specs,
      originalUrl: url
    });

  } catch (error) {
    console.error('Erro no Scraping:', error);
    return NextResponse.json({ error: 'Não foi possível ler os dados deste site. Tente inserir manualmente.' }, { status: 500 });
  }
}
