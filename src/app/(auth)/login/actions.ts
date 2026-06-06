"use server"
import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"
import { z } from "zod"

const schema = z.object({
  email:    z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password harus diisi"),
})

export async function loginAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = schema.safeParse({
    email:    formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  try {
    await signIn("credentials", {
      email:      parsed.data.email,
      password:   parsed.data.password,
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Email atau password salah" }
        default:
          return { error: "Terjadi kesalahan. Silakan coba lagi." }
      }
    }
    throw error // NEXT_REDIRECT — biarkan Next.js handle
  }

  return {}
}
