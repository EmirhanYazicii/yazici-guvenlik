import { useState } from 'react';
import { SERVICES, LIMITS, requestSchema } from '@shared/requestSchema.js';

const INITIAL = {
  name: '',
  email: '',
  service: '',
  description: '',
  website: '', // honeypot — boş kalmalı
};

export default function RequestForm() {
  const [fields, setFields] = useState(INITIAL);
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [generalError, setGeneralError] = useState('');
  const [successData, setSuccessData] = useState(null); // { id, createdAt }

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    // Kullanıcı yazdıkça alan hatasını temizle
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGeneralError('');

    // İstemci taraflı doğrulama — sunucuyla aynı Zod şeması; UX içindir,
    // sunucu her zaman kendi doğrulamasını yapar.
    const parsed = requestSchema.safeParse(fields);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors(
        Object.fromEntries(Object.entries(flat).map(([k, msgs]) => [k, msgs[0]]))
      );
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });

      // Sunucu JSON dışı yanıt verirse (.catch) boş obje kullan
      const data = await res.json().catch(() => ({}));

      if (res.status === 201) {
        setSuccessData(data);
        setStatus('success');
      } else if (res.status === 400 && data.fieldErrors) {
        // Sunucu istemcinin kaçırdığı doğrulama hatalarını döndürdü
        setFieldErrors(data.fieldErrors);
        setStatus('idle');
      } else {
        setGeneralError(data.error || 'Bir hata oluştu. Lütfen tekrar deneyin.');
        setStatus('error');
      }
    } catch {
      setGeneralError('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
      setStatus('error');
    }
  }

  function handleReset() {
    setFields(INITIAL);
    setFieldErrors({});
    setGeneralError('');
    setSuccessData(null);
    setStatus('idle');
  }

  if (status === 'success') {
    return (
      <div className="success-message" role="alert">
        <h3>Talebiniz alındı!</h3>
        <p>
          Başvuru numaranız: <strong>#{successData.id}</strong>
        </p>
        <p>En kısa sürede sizinle iletişime geçeceğiz.</p>
        <button type="button" onClick={handleReset}>
          Yeni talep oluştur
        </button>
      </div>
    );
  }

  const isLoading = status === 'loading';

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Honeypot — gerçek kullanıcılar bu alanı görmez veya dolduramaz */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="hp-website">Web sitesi (boş bırakın)</label>
        <input
          id="hp-website"
          name="website"
          type="text"
          value={fields.website}
          onChange={handleChange}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {generalError && (
        <div className="error-banner" role="alert">
          {generalError}
        </div>
      )}

      <div className="form-field">
        <label htmlFor="name">Ad Soyad *</label>
        <input
          id="name"
          name="name"
          type="text"
          value={fields.name}
          onChange={handleChange}
          maxLength={LIMITS.nameMax}
          autoComplete="name"
          disabled={isLoading}
          aria-invalid={fieldErrors.name ? 'true' : undefined}
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
        />
        {fieldErrors.name && (
          <span id="name-error" className="field-error" role="alert">
            {fieldErrors.name}
          </span>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="email">E-posta *</label>
        <input
          id="email"
          name="email"
          type="email"
          value={fields.email}
          onChange={handleChange}
          maxLength={LIMITS.emailMax}
          autoComplete="email"
          disabled={isLoading}
          aria-invalid={fieldErrors.email ? 'true' : undefined}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
        />
        {fieldErrors.email && (
          <span id="email-error" className="field-error" role="alert">
            {fieldErrors.email}
          </span>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="service">Hizmet türü *</label>
        <select
          id="service"
          name="service"
          value={fields.service}
          onChange={handleChange}
          disabled={isLoading}
          aria-invalid={fieldErrors.service ? 'true' : undefined}
          aria-describedby={fieldErrors.service ? 'service-error' : undefined}
        >
          <option value="">— Seçin —</option>
          {SERVICES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {fieldErrors.service && (
          <span id="service-error" className="field-error" role="alert">
            {fieldErrors.service}
          </span>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="description">
          Açıklama *
          <span className="char-count">
            {fields.description.length}/{LIMITS.descriptionMax}
          </span>
        </label>
        <textarea
          id="description"
          name="description"
          value={fields.description}
          onChange={handleChange}
          rows={5}
          maxLength={LIMITS.descriptionMax}
          disabled={isLoading}
          placeholder={`En az ${LIMITS.descriptionMin} karakter yazın.`}
          aria-invalid={fieldErrors.description ? 'true' : undefined}
          aria-describedby={fieldErrors.description ? 'description-error' : undefined}
        />
        {fieldErrors.description && (
          <span id="description-error" className="field-error" role="alert">
            {fieldErrors.description}
          </span>
        )}
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Gönderiliyor…' : 'Talep Gönder'}
      </button>
    </form>
  );
}
