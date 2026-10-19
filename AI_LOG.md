# AI_LOG

Bu dosya, projede yapay zekâyı nasıl kullandığımı ve çıktıları nasıl doğruladığımı anlatır.
Kayıtlar çalışma sırasında tutuldu.

## Araçlar ve görev dağılımı

| Araç | Ne için kullandım |
|---|---|
| Claude (claude.ai, sohbet) | Konsept seçenekleri, logo, backend iskeleti, testler, hata ayıklama |

Kararları ben verdim; Claude seçenek sundu ve kod taslağı üretti. Her adımı kendi
bilgisayarımda çalıştırıp denedim.

## Adım 1 — Konsept ve marka

- **İstek:** Görev metnini verip kurgusal hizmet önerileri istedim.
- **AI önerisi:** 3 seçenek (görev otomasyonu, güvenlik sistemleri bakım talebi, AI ile talep sınıflandırma) ve artı/eksileri.
- **Kararım:** "Güvenlik sistemleri bakım talebi". AI sınıflandırma fikrini, 3–4 saatlik kapsamı taşıracağı ve sayfada vaat edilip çalışmayan bir özellik olacağı için reddettim; README'de "sonraki adım" fikri olarak bıraktım.
- **Marka adı:** "Yazıcı" adını ben seçtim. Claude, kelimenin "printer" anlamı nedeniyle "Güvenlik Sistemleri" alt başlığını önerdi; kabul ettim.
- **Logo:** Kontrol etiketi şekli + onay işareti gibi okunan Y konsepti Claude'un önerisi. 16 px favicon boyutunda okunabilirliğini önizlemeyle kontrol ettim.

## Adım 2 — Backend, veritabanı, testler

- **Mimari kararlar (önerildi, kabul ettim):**
  - Doğrulama şeması (`shared/requestSchema.js`) tek dosyada; hem form hem API aynı kuralları kullanıyor, sunucu yine de kendisi doğruluyor.
  - Express, veritabanını parametre olarak alıyor (dependency injection). Böylece testlerde sahte veritabanıyla "kayıt başarılı" ve "veritabanı hatası" ayrı ayrı sınanabiliyor.
  - Supabase yalnızca Postgres olarak kullanılıyor; bağlantı sadece sunucuda, tarayıcıya anahtar gitmiyor.
  - Tabloda RLS açık ve hiç politika yok: Supabase'in anon REST API'si üzerinden tabloya erişim kapalı.
- **Doğrulama:**
  - 13 API testi (vitest + supertest) yazıldı, hepsi geçti.
  - Testlerin gerçekten hata yakaladığını görmek için kod bilerek bozuldu: hata durumunda 201 döndürünce 1 test, sunucu doğrulaması kaldırılınca 7 test kırmızıya döndü. Kod geri alındı.
  - Gerçek PostgreSQL 16 ile curl üzerinden uçtan uca denendi: geçerli kayıt (201, satır tabloda), geçersiz istek (400, alan bazlı hatalar), SQL injection denemesi (metin düz veri olarak kaydedildi, tablo zarar görmedi).
- **Bulunan hata:** Veritabanı çalışırken durdurulduğunda sunucu **tamamen çöktü**. Sebep: `pg` havuzunda boşta bekleyen bağlantı kopunca yayılan `error` olayının dinleyicisi yoktu. Sahte veritabanlı testler bunu yakalayamazdı.
  - **Düzeltme:** `pool.on('error')` dinleyicisi ve 5 sn bağlantı zaman aşımı eklendi.
  - **Tekrar test:** Veritabanı kapalıyken istek 500 ve anlaşılır mesaj döndü, `/api/health` 503 döndü, sunucu ayakta kaldı; veritabanı geri gelince sonraki istek 201 ile kaydedildi.
