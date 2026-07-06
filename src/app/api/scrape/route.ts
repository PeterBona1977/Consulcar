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

    // Integração com serviço de Proxy Anti-Bot para Produção (ZenRows)
    // O Cloudflare Edge não suporta Puppeteer, portanto o scraping direto do Mobile.de é bloqueado.
    // É necessária uma chave API configurada nas variáveis de ambiente do Cloudflare.
    const ZENROWS_API_KEY = process.env.ZENROWS_API_KEY;
    
    let fetchUrl = url;
    let fetchOptions: RequestInit = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    };

    if (url.includes('mobile.de') || url.includes('standvirtual.com')) {
      if (!ZENROWS_API_KEY) {
        return NextResponse.json({ 
          error: 'Para extrair dados do Mobile.de em produção no Cloudflare, configure a variável de ambiente ZENROWS_API_KEY com a sua chave do ZenRows.' 
        }, { status: 403 });
      }
      
      if (url.includes('mobile.de')) {
        // O Mobile.de requer bypass avançado do Datadome (pode demorar 30-40s e dar timeout no Cloudflare)
        fetchUrl = `https://api.zenrows.com/v1/?apikey=${ZENROWS_API_KEY}&url=${encodeURIComponent(url)}&premium_proxy=true&antibot=true`;
      } else {
        // O Standvirtual não requer bypass avançado e é muito mais rápido, evitando o timeout de 10s do Cloudflare
        fetchUrl = `https://api.zenrows.com/v1/?apikey=${ZENROWS_API_KEY}&url=${encodeURIComponent(url)}`;
      }
      
      fetchOptions = {}; // O serviço de proxy trata dos headers e fingerprinting
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

    // Generic fallback scraping (works for most modern sites including Standvirtual/Mobile.de)
    let title = $('meta[property="og:title"]').attr('content') || $('title').text();
    const image = $('meta[property="og:image"]').attr('content') || '';
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    
    // Attempt specific price extractors
    let price = $('.offer-price__number').text().trim() || // Standvirtual
                $('.h3.u-text-bold').first().text().trim() || // Mobile.de
                'Sob Consulta';

    // Extrair equipamentos / extras (Genérico para Mobile.de / Standvirtual)
    const equipment: string[] = [];
    $('.bullet-list li, #features-bullet-list li, .g-col-12 ul li, .listing-features li, .vehicle-features li, .c-box--content li').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 50 && text.length > 2 && !equipment.includes(text)) {
        equipment.push(text);
      }
    });

    // Cleanup text
    title = title.replace(' - Standvirtual', '').replace(' no Standvirtual', '').trim();
    if (price !== 'Sob Consulta') {
      price = price.replace(/[^0-9,€ ]/g, '').trim() + ' €';
    }

    // --- Tradução Automática ---
    const translatedDescription = await translateText(description);
    
    let translatedEquipment = equipment;
    if (equipment.length > 0) {
      // Juntar com separador para traduzir tudo numa só chamada à API
      const joinedText = equipment.join(' || ');
      const translatedJoined = await translateText(joinedText);
      translatedEquipment = translatedJoined.split(' || ').map(e => e.trim()).filter(e => e.length > 0);
    }

    return NextResponse.json({
      title: title || 'Viatura Desconhecida',
      image: image || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1000', // Premium fallback image
      description: translatedDescription,
      price: price,
      equipment: translatedEquipment,
      originalUrl: url
    });

  } catch (error) {
    console.error('Erro no Scraping:', error);
    return NextResponse.json({ error: 'Não foi possível ler os dados deste site. Tente inserir manualmente.' }, { status: 500 });
  }
}
