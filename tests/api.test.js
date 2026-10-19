// API testleri. Gerçek veritabanı yerine sahte bir repo kullanılır;
// böylece "kayıt başarılı" ve "veritabanı hatası" durumları ayrı ayrı sınanır.
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app.js';

const valid = {
  name: 'Test Kullanıcı',
  email: 'Test@Ornek.com',
  service: 'kamera',
  description: 'Depo girişindeki iki kamera görüntü vermiyor, kontrol rica ederiz.',
};

const silentLogger = { error: () => {} };

function makeApp(repoOverrides = {}, options = {}) {
  const repo = {
    insertRequest: vi.fn(async () => ({ id: 42, createdAt: '2026-10-05T10:00:00Z' })),
    ping: vi.fn(async () => {}),
    ...repoOverrides,
  };
  const app = createApp({ repo, logger: silentLogger, ...options });
  return { app, repo };
}

describe('POST /api/requests', () => {
  it('geçerli talebi kaydeder ve 201 döner', async () => {
    const { app, repo } = makeApp();
    const res = await request(app).post('/api/requests').send(valid);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 42, createdAt: '2026-10-05T10:00:00Z' });
    expect(repo.insertRequest).toHaveBeenCalledTimes(1);
  });

  it('veriyi kaydetmeden önce normalleştirir (trim, küçük harf e-posta)', async () => {
    const { app, repo } = makeApp();
    await request(app)
      .post('/api/requests')
      .send({ ...valid, name: '  Test Kullanıcı  ', email: '  Test@Ornek.com ' });

    expect(repo.insertRequest).toHaveBeenCalledWith({
      name: 'Test Kullanıcı',
      email: 'test@ornek.com',
      service: 'kamera',
      description: valid.description,
    });
  });

  it('geçersiz e-postayı 400 ile reddeder ve kayıt yapmaz', async () => {
    const { app, repo } = makeApp();
    const res = await request(app).post('/api/requests').send({ ...valid, email: 'gecersiz' });

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors.email).toBeDefined();
    expect(repo.insertRequest).not.toHaveBeenCalled();
  });

  it('eksik alanların hepsini alan bazında bildirir', async () => {
    const { app, repo } = makeApp();
    const res = await request(app).post('/api/requests').send({});

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fieldErrors).sort()).toEqual(
      ['description', 'email', 'name', 'service']
    );
    expect(repo.insertRequest).not.toHaveBeenCalled();
  });

  it('listede olmayan hizmeti reddeder', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/requests').send({ ...valid, service: 'hack' });

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors.service).toBe('Listeden bir hizmet seçin.');
  });

  it('çok kısa açıklamayı reddeder', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/requests').send({ ...valid, description: 'kısa' });

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors.description).toMatch(/en az 20/);
  });

  it('yalnızca boşluktan oluşan adı geçersiz sayar', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/requests').send({ ...valid, name: '     ' });

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors.name).toBeDefined();
  });

  it('honeypot alanı doluysa kayıt yapmaz', async () => {
    const { app, repo } = makeApp();
    const res = await request(app).post('/api/requests').send({ ...valid, website: 'spam.com' });

    expect(res.status).toBe(400);
    expect(repo.insertRequest).not.toHaveBeenCalled();
  });

  it('veritabanı hatasında 500 döner, kayıt kimliği döndürmez ve iç hatayı sızdırmaz', async () => {
    const { app } = makeApp({
      insertRequest: vi.fn(async () => {
        throw new Error('connection terminated: secret-host');
      }),
    });
    const res = await request(app).post('/api/requests').send(valid);

    expect(res.status).toBe(500);
    expect(res.body.id).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('secret-host');
  });

  it('bozuk JSON gövdesini 400 ile reddeder', async () => {
    const { app, repo } = makeApp();
    const res = await request(app)
      .post('/api/requests')
      .set('Content-Type', 'application/json')
      .send('{"name": ');

    expect(res.status).toBe(400);
    expect(repo.insertRequest).not.toHaveBeenCalled();
  });

  it('kısa sürede çok fazla gönderimi 429 ile sınırlar', async () => {
    const { app } = makeApp({}, { rateLimitMax: 2 });
    await request(app).post('/api/requests').send(valid);
    await request(app).post('/api/requests').send(valid);
    const res = await request(app).post('/api/requests').send(valid);

    expect(res.status).toBe(429);
  });
});

describe('GET /api/health', () => {
  it('veritabanı erişilebilirse ok döner', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('veritabanına ulaşılamazsa 503 döner', async () => {
    const { app } = makeApp({ ping: vi.fn(async () => { throw new Error('down'); }) });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
  });
});
