const url = 'https://www.standvirtual.com/carros/anuncio/mercedes-benz-a-180-d-amg-line-ID8PGNdb.html'; // Exemplo
const apiKey = 'e5092038ee5044fc3ad892e9f180f52b';
const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;

async function testScraperAPI() {
    console.log('Fetching:', url);
    console.log('Using ScraperAPI...');
    try {
        const response = await fetch(scraperUrl);
        if (!response.ok) {
            console.error('Error fetching:', response.status, response.statusText);
            const text = await response.text();
            console.error(text);
            return;
        }
        const html = await response.text();
        console.log('Success! HTML length:', html.length);
        
        // Check if blocked by DataDome or similar
        if (html.includes('datadome') || html.includes('captcha') || html.includes('Access Denied')) {
            console.log('Warning: HTML contains signs of being blocked (captcha/datadome/access denied).');
        } else if (html.includes('__NEXT_DATA__') || html.includes('offer-price__number')) {
            console.log('Success: Found expected content indicators for Standvirtual!');
        } else {
            console.log('Note: Did not find clear indicators, but request succeeded.');
        }
    } catch (e) {
        console.error('Exception during fetch:', e);
    }
}

testScraperAPI();
