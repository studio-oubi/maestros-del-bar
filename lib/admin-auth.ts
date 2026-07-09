import { createHmac, timingSafeEqual } from "node:crypto";

const VEINTICUATRO_HORAS_MS = 24 * 60 * 60 * 1000;

function firmar(exp: string, secreto: string): string {
  return createHmac("sha256", secreto).update(exp).digest("hex");
}

export function crearToken(secreto: string): string {
  const exp = String(Date.now() + VEINTICUATRO_HORAS_MS);
  return `${exp}.${firmar(exp, secreto)}`;
}

export function verificarToken(token: string | undefined, secreto: string): boolean {
  if (!token) return false;
  const partes = token.split(".");
  if (partes.length !== 2) return false;
  const [exp, firma] = partes;
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;

  const esperada = firmar(exp, secreto);
  const bufEsperada = Buffer.from(esperada, "hex");
  const bufFirma = Buffer.from(firma, "hex");
  if (bufFirma.length !== bufEsperada.length) return false;
  return timingSafeEqual(bufFirma, bufEsperada);
}
