// Giriş noktası: gerçek veritabanını bağlar ve sunucuyu başlatır.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createRepo } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = createRepo(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_SSL !== 'false',
});
const app = createApp({ repo, staticDir: path.join(__dirname, '..', 'dist') });

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
});
