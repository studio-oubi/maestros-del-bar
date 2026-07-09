"use server";
import { cookies } from "next/headers";
import { crearToken } from "@/lib/admin-auth";

export async function entrar(_prev: { error: string } | null, formData: FormData) {
  const pass = formData.get("password");
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SECRET) return { error: "Panel no configurado" };
  if (pass !== process.env.ADMIN_PASSWORD) return { error: "Contraseña incorrecta" };
  (await cookies()).set("mc_admin", crearToken(process.env.ADMIN_SECRET), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  });
  return null;
}
