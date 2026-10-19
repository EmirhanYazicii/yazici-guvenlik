// Express uygulaması. Veritabanı dışarıdan verilir (dependency injection),
// böylece testlerde başarılı kayıt ve veritabanı hatası senaryoları
// gerçek bir veritabanına ihtiyaç duymadan sınanabilir.
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { requestSchema, toFieldErrors } from '../shared/requestSchema.js';

export function createApp({ repo, staticDir, rateLimitMax = 10, logger = console }) {
  const app = express();

  // Render bir proxy arkasında çalışır; gerçek istemci IP'si için gerekli
  // (rate limit IP'ye göre sayar).
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));

  const submitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: rateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Çok fazla deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyin.' },
  });

  app.get('/api/health', async (_req, res) => {
    try {
      await repo.ping();
      res.json({ status: 'ok', database: 'ok' });
    } catch (err) {
      logger.error('Sağlık kontrolü: veritabanına ulaşılamadı', err.message);
      res.status(503).json({ status: 'degraded', database: 'unreachable' });
    }
  });

  app.post('/api/requests', submitLimiter, async (req, res) => {
    const parsed = requestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Formda düzeltilmesi gereken alanlar var.',
        fieldErrors: toFieldErrors(parsed.error),
      });
    }

    const { name, email, service, description } = parsed.data;
    try {
      const saved = await repo.insertRequest({ name, email, service, description });
      // 201 yalnızca kayıt veritabanına yazıldıktan SONRA döner.
      return res.status(201).json({ id: saved.id, createdAt: saved.createdAt });
    } catch (err) {
      // Ayrıntı sadece sunucu loguna gider; istemciye iç hata sızdırılmaz.
      logger.error('Talep kaydedilemedi', err.message);
      return res.status(500).json({
        error: 'Talebiniz şu anda kaydedilemedi. Lütfen birkaç dakika sonra tekrar deneyin.',
      });
    }
  });

  // Bilinmeyen API yolları HTML değil JSON 404 döner.
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Bulunamadı.' }));

  // Derlenmiş ön yüz (npm run build sonrası).
  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir, { index: 'index.html', maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  // Bozuk JSON gövdesi gibi hatalar için son savunma hattı.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'İstek gövdesi geçerli JSON değil.' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'İstek gövdesi çok büyük.' });
    }
    logger.error('Beklenmeyen hata', err);
    return res.status(500).json({ error: 'Beklenmeyen bir hata oluştu.' });
  });

  return app;
}
