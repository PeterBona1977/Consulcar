import fs from 'fs';
import path from 'path';
import https from 'https';

const cars = [
  { name: 'porsche', url: 'https://images.unsplash.com/photo-1503376710356-7386c7d23fcd?q=80&w=800' },
  { name: 'audi', url: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=800' },
  { name: 'mercedes', url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=800' },
  { name: 'bmw', url: 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?q=80&w=800' },
  { name: 'rover', url: 'https://images.unsplash.com/photo-1606016159991-ec12aee409f0?q=80&w=800' },
  { name: 'ferrari', url: 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?q=80&w=800' }
];

const dir = path.join(process.cwd(), 'public', 'cars');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function download() {
  for (const car of cars) {
    const dest = path.join(dir, `${car.name}.jpg`);
    console.log(`Downloading ${car.name}...`);
    try {
      const res = await fetch(car.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
      });
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(dest, Buffer.from(buffer));
      console.log(`Saved ${car.name}.jpg`);
    } catch (e) {
      console.error(`Failed ${car.name}:`, e.message);
    }
  }
}

download();
