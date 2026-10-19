// Talep formunun doğrulama kuralları.
// Bu dosya hem tarayıcıda (form) hem sunucuda (API) kullanılır:
// kurallar tek yerde tanımlı, iki taraf asla birbirinden farklılaşmaz.
// Sunucu yine de istemciye güvenmez; aynı şemayla kendisi tekrar doğrular.
import { z } from 'zod';

export const SERVICES = [
  { value: 'kamera', label: 'Kamera sistemi bakımı' },
  { value: 'yangin', label: 'Yangın algılama testi' },
  { value: 'gecis', label: 'Geçiş kontrol arızası' },
  { value: 'periyodik', label: 'Periyodik bakım sözleşmesi' },
];

const serviceValues = SERVICES.map((s) => s.value);

export const LIMITS = {
  nameMin: 2,
  nameMax: 80,
  emailMax: 254,
  descriptionMin: 20,
  descriptionMax: 1000,
};

export const requestSchema = z.object({
  name: z
    .string({ required_error: 'Adınızı yazın.', invalid_type_error: 'Adınızı yazın.' })
    .trim()
    .min(LIMITS.nameMin, `Ad en az ${LIMITS.nameMin} karakter olmalı.`)
    .max(LIMITS.nameMax, `Ad en fazla ${LIMITS.nameMax} karakter olabilir.`),
  email: z
    .string({ required_error: 'E-posta adresinizi yazın.', invalid_type_error: 'E-posta adresinizi yazın.' })
    .trim()
    .toLowerCase()
    .max(LIMITS.emailMax, 'E-posta adresi çok uzun.')
    .email('Geçerli bir e-posta adresi yazın (ör. ad@firma.com).'),
  service: z.enum(serviceValues, {
    errorMap: () => ({ message: 'Listeden bir hizmet seçin.' }),
  }),
  description: z
    .string({ required_error: 'Talebinizi kısaca anlatın.', invalid_type_error: 'Talebinizi kısaca anlatın.' })
    .trim()
    .min(LIMITS.descriptionMin, `Açıklama en az ${LIMITS.descriptionMin} karakter olmalı.`)
    .max(LIMITS.descriptionMax, `Açıklama en fazla ${LIMITS.descriptionMax} karakter olabilir.`),
  // Honeypot: gerçek kullanıcı bu alanı görmez, botlar doldurur.
  website: z.string().max(0, 'Geçersiz gönderim.').optional(),
});

// zod hatalarını { alan: 'ilk hata mesajı' } biçimine çevirir.
export function toFieldErrors(zodError) {
  const flat = zodError.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(flat).map(([field, messages]) => [field, messages[0]])
  );
}
