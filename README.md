# Yazıcı Güvenlik Sistemleri — Bakım Talebi Formu

Kamera, yangın algılama ve geçiş kontrol sistemleri için çevrimiçi bakım talebi uygulaması.

- **Frontend:** React 19 + Vite 8 — tek sayfa form uygulaması
- **Backend:** Node.js 20 + Express 4 — REST API, rate limiting, Helmet güvenlik başlıkları
- **Veritabanı:** PostgreSQL (Supabase) — parameterize sorgular, Row Level Security
- **Doğrulama:** Zod — hem istemcide hem sunucuda aynı şema

---

## Kurulum

### Gereksinimler

- Node.js ≥ 20
- Bir PostgreSQL veritabanı (Supabase ücretsiz tier yeterli)

### Adımlar

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını aç ve DATABASE_URL değerini gir
```

**.env** içeriği:

```
# Supabase > Project Settings > Database > Connection string > Session pooler
DATABASE_URL=postgresql://postgres.PROJE_ID:SIFRE@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
PORT=3000
# Yalnızca yerel PostgreSQL ile: DATABASE_SSL=false
```

### Veritabanı şemasını kur

Supabase SQL Editor'da bir kez çalıştır:

```sql
-- db/schema.sql
CREATE TABLE IF NOT EXISTS service_requests (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  email       text NOT NULL CHECK (char_length(email) <= 254),
  service     text NOT NULL CHECK (service IN ('kamera', 'yangin', 'gecis', 'periyodik')),
  description text NOT NULL CHECK (char_length(description) BETWEEN 20 AND 1000),
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
```

> RLS açık, politika yok → Supabase anon REST API üzerinden tabloya erişim tamamen kapalıdır.
> Sunucu doğrudan Postgres bağlantısıyla yazar ve bundan etkilenmez.

---

## Geliştirme Ortamı

İki terminal açarak çalıştır:

```bash
# Terminal 1 — Express API (port 3000)
npm run dev:server

# Terminal 2 — Vite dev sunucusu (port 5173)
npm run dev
```

Tarayıcıda `http://localhost:5173` adresini aç. `/api/*` istekleri Vite proxy ile
`localhost:3000`'e yönlendirilir.

---

## Test

```bash
npm test
```

`tests/api.test.js` içinde 13 entegrasyon testi bulunur (Vitest + Supertest). Gerçek
veritabanı gerektirmez; testler sahte repo ile dependency injection üzerinden çalışır.

Kapsam:

| Senaryo | Beklenen |
|---|---|
| Geçerli gönderim | 201 + `{ id, createdAt }` |
| Boşluk kırpma + e-posta küçük harf | Normalleştirilmiş veri kaydedilir |
| Geçersiz e-posta | 400, `fieldErrors.email` |
| Tüm alanlar eksik | 400, dört alanda hata |
| Bilinmeyen hizmet değeri | 400, `fieldErrors.service` |
| Kısa açıklama | 400, `fieldErrors.description` |
| Honeypot dolu | 400, kayıt yazılmaz |
| Veritabanı hatası | 500, iç mesaj sızdırılmaz |
| Bozuk JSON gövdesi | 400 |
| Rate limit aşımı | 429 |
| Sağlık kontrolü (DB erişilebilir) | GET /api/health → 200 |
| Sağlık kontrolü (DB erişilemez) | GET /api/health → 503 |

---

## Production Build

```bash
# Frontend'i derle
npm run build
# → dist/ klasörüne çıkartır (Express bu klasörü sunuyor)

# Sunucuyu başlat
npm start
# → http://localhost:3000
```

`dist/` `.gitignore`'a eklenmiştir; her deploy öncesi yeniden build alınmalıdır.

---

## Deploy Talimatları

### Render (önerilen — ücretsiz tier)

1. GitHub reposuna push'la (`dist/` hariç).
2. Render'da **New > Web Service** → repoyu bağla.
3. **Build command:** `npm install && npm run build`
4. **Start command:** `npm start`
5. **Environment variables** bölümüne `.env`'deki değerleri gir:
   - `DATABASE_URL` — Supabase session pooler bağlantı dizisi
   - `NODE_ENV=production`
6. **Deploy** — Render otomatik HTTPS sağlar.

> Render ücretsiz servisleri ~15 dakika hareketsizlik sonrası uyku moduna girer.
> İlk istek ~30 saniye geç yanıt verebilir.

### Genel (herhangi bir Node.js sunucusu)

```bash
npm ci --omit=dev   # sadece production bağımlılıkları
npm run build       # dist/ oluştur
npm start           # PORT ortam değişkeniyle
```

Reverse proxy (nginx/Caddy) kullanıyorsan `server/app.js`'deki
`app.set('trust proxy', 1)` satırı rate limiting'in gerçek IP'yi
görmesini sağlar.

---

## API Referansı

### `POST /api/requests`

Yeni bakım talebi oluşturur.

**Gövde:**

```json
{
  "name": "Ad Soyad",
  "email": "ad@firma.com",
  "service": "kamera",
  "description": "Kamera 2 görüntü vermiyor, kontrol edilmesi gerekiyor."
}
```

`service` değerleri: `kamera` · `yangin` · `gecis` · `periyodik`

**Yanıtlar:**

| Durum | Açıklama |
|---|---|
| 201 | `{ "id": 42, "createdAt": "2026-10-19T..." }` |
| 400 | `{ "error": "...", "fieldErrors": { "name": "..." } }` |
| 429 | Rate limit aşıldı (15 dk'da 10 istek) |
| 500 | Veritabanı hatası |

### `GET /api/health`

```json
{ "status": "ok", "database": "ok" }
```

Veritabanına ulaşılamazsa `503` ve `"database": "unreachable"` döner.

---

## Demo / Test

Formu denemek için aşağıdaki bilgileri kullanabilirsiniz:

| Alan | Değer |
|---|---|
| Ad Soyad | Test Kullanıcı |
| E-posta | test@example.com |
| Hizmet türü | *(istediğinizi seçebilirsiniz)* |
| Açıklama | Bu bir test talebidir, sistem kontrolü amaçlıdır. |

Başarılı bir gönderiMin ardından ekranda **başvuru numarası** görünür ve kayıt
veritabanına yazılır. `GET /api/health` endpointi de veritabanı bağlantısını
doğrulamak için kullanılabilir.

---

## Bilinen Eksikler

Bu proje 3–4 saatlik bir değerlendirme kapsamında yapılmıştır. Üretime taşımadan
önce ele alınması gereken başlıca eksikler:

- **Yönetici paneli yok** — Gelen talepleri görüntülemek için ayrı bir admin arayüzü
  veya korumalı endpoint gerekir (şu an yalnızca Supabase Dashboard'dan görülebilir).
- **E-posta bildirimi yok** — Talep alındığında firmaya veya kullanıcıya e-posta
  gönderilmiyor. Resend / SendGrid entegrasyonu eklenebilir.
- **Kimlik doğrulama yok** — Tüm endpoint'ler herkese açık; admin işlemleri için
  oturum yönetimi eklenmeli.
- **Pagination yok** — Talep listesi büyüdüğünde sayfalama gerekir.
- **Dosya/fotoğraf yükleme yok** — Arıza fotoğrafı eklenemiyor.
- **Karanlık mod** — Logo varlıkları (`logo-dark.svg`) hazır; CSS `prefers-color-scheme`
  desteği eklenmedi.
- **i18n yok** — Uygulama yalnızca Türkçe; çoklu dil desteği eklenmedi.
- **Erişilebilirlik denetimi** — ARIA etiketleri temel düzeyde mevcut; tam WCAG 2.1
  AA uyum denetimi yapılmadı.

---

## Yapay Zekâ Kullanımı

Bu proje geliştirme sürecinde yapay zekâ araçları kullanılmıştır. Ayrıntılar ve
her adımın nasıl doğrulandığı → **[AI_LOG.md](AI_LOG.md)**

Özetle:

- Konsept seçimi, marka adı ve logo: Claude (claude.ai) ile beyin fırtınası yapıldı;
  nihai kararlar geliştirici tarafından verildi.
- Backend mimarisi, doğrulama şeması, testler: Claude taslak üretti;
  kod incelendi, çalıştırıldı ve hata senaryolarıyla doğrulandı.
- Frontend iskeleti: Claude ile birlikte planlandı ve oluşturuldu;
  build + test çıktıları kontrol edildi.
- Tüm kod geliştirici tarafından okundu ve onaylandı; kopyala-yapıştır
  yapılmadı.
