import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'O URL é obrigatório' }, { status: 400 });
    }

    // Attempt to fetch the website HTML
    // We use a common User-Agent to prevent basic bot-blocking
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
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

    // Cleanup text
    title = title.replace(' - Standvirtual', '').replace(' no Standvirtual', '').trim();
    if (price !== 'Sob Consulta') {
      price = price.replace(/[^0-9,€ ]/g, '').trim() + ' €';
    }

    return NextResponse.json({
      title: title || 'Viatura Desconhecida',
      image: image || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1000', // Premium fallback image
      description: description,
      price: price,
      originalUrl: url
    });

  } catch (error) {
    console.error('Erro no Scraping:', error);
    return NextResponse.json({ error: 'Não foi possível ler os dados deste site. Tente inserir manualmente.' }, { status: 500 });
  }
}
