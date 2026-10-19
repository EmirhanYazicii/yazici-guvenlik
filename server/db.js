// Veritabanı katmanı: sadece bu dosya SQL bilir.
// Uygulama (app.js) bu "repo" nesnesini parametre olarak alır;
// testlerde gerçek veritabanı yerine sahte bir repo verilebilir.
import pg from 'pg';

export function createRepo(connectionString, { ssl = true } = {}) {
  if (!connectionString) {
    throw new Error('DATABASE_URL tanımlı değil. .env.example dosyasına bakın.');
  }

  const pool = new pg.Pool({
    connectionString,
    max: 5,
    // Veritabanına ulaşılamazsa istek sonsuza kadar beklemesin.
    connectionTimeoutMillis: 5000,
    // Supabase bağlantısı TLS ile şifreli. Sertifika zinciri doğrulaması
    // kapalı; bilinen eksik olarak README'de açıklandı.
    // Yerel PostgreSQL ile denerken DATABASE_SSL=false verilebilir.
    ssl: ssl ? { rejectUnauthorized: false } : false,
  });

  // Boşta bekleyen bir bağlantı koparsa (ör. veritabanı yeniden başlarsa)
  // pg havuzu 'error' olayı yayar. Dinleyici yoksa Node tüm süreci çökertir.
  // Burada sadece loglanır; sonraki sorgu yeni bir bağlantı açar.
  pool.on('error', (err) => {
    console.error('Veritabanı bağlantısı koptu (boşta bekleyen istemci):', err.message);
  });

  return {
    async insertRequest({ name, email, service, description }) {
      // Parametreli sorgu: kullanıcı verisi asla SQL metnine eklenmez.
      const result = await pool.query(
        `insert into service_requests (name, email, service, description)
         values ($1, $2, $3, $4)
         returning id, created_at`,
        [name, email, service, description]
      );
      return { id: result.rows[0].id, createdAt: result.rows[0].created_at };
    },

    async ping() {
      await pool.query('select 1');
    },

    async close() {
      await pool.end();
    },
  };
}
