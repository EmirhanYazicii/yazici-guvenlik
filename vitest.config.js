// Vitest konfigürasyonu — vite.config.js'deki root:'client' ayarından bağımsız,
// testler proje kökündeki tests/ klasöründe aranır.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
});
