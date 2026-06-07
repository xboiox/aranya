import { defineConfig } from "vitest/config"
import path from "path"

// Integration test: menjalankan logika DB nyata (RLS, business rules) terhadap
// database dev. Butuh Docker postgres aktif + .env terisi.
// Jalankan: npm run test:integration
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.integration.test.ts"],
    setupFiles: ["./src/test/integration/setup.ts"],
    // DB ops sekuensial agar data ephemeral antar test tidak bentrok
    fileParallelism: false,
    testTimeout: 20000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
})
