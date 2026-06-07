// Muat .env agar DATABASE_URL / ADMIN_DATABASE_URL / AUTH_* tersedia
// sebelum modul @/lib/db (dan @/lib/env) di-load oleh test.
import { config } from "dotenv"
config()
