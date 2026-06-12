const createNextIntlPlugin = require("next-intl/plugin");

// Mendaftarkan src/i18n/request.ts sebagai sumber konfigurasi next-intl.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // GPS geolocation: hanya izinkan dari origin yang sama
          {
            key: "Permissions-Policy",
            value: "geolocation=(self), camera=(), microphone=()",
          },
        ],
      },
    ];
  },

  // GCS image domain jika ada gambar publik
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/aranya-storage/**",
      },
    ],
  },
};

// ── PWA (DITUNDA ke Fase 1) ───────────────────────────────────────────────
// Service worker (src/app/sw.ts) sudah disiapkan sebagai fondasi, TAPI plugin
// `@serwist/next` (default mode) berbasis webpack dan TIDAK kompatibel dengan
// Turbopack — sama seperti next-pwa. Build produksi kita pakai Turbopack
// (lebih cepat, default Next.js 16), jadi wiring SW generation ditunda hingga
// Fase 1 (offline absensi) saat:
//   - Serwist "configurator mode" / @serwist/turbopack sudah lebih matang, ATAU
//   - kita evaluasi ulang dengan kebutuhan offline yang konkret.
// Lihat docs/TECH_STACK.md bagian PWA untuk detail keputusan ini.
module.exports = withNextIntl(nextConfig);
