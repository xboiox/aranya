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

// @ducanh2912/next-pwa berbasis webpack. Next.js 16 default ke Turbopack.
// - Dev: Turbopack + config polos (PWA disabled saat dev — tidak perlu webpack)
// - Build produksi: webpack (`next build --webpack`) untuk generate service worker
// Service worker hanya dibutuhkan di production build, jadi PWA wrapper hanya
// diterapkan saat NODE_ENV=production.
if (process.env.NODE_ENV === "production") {
  const withPWA = require("@ducanh2912/next-pwa").default({
    dest: "public",
    register: true,
    skipWaiting: true,
  });
  module.exports = withPWA(nextConfig);
} else {
  module.exports = nextConfig;
}
