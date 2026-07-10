const INICIO_PELIGROSO = /^[=+\-@\t\r]/;

/** Escapa un valor para CSV: neutraliza inyección de fórmulas (Excel/Sheets
 * ejecutan celdas que empiezan con =, +, -, @, tab o CR) prefijando con
 * apóstrofe, y entrecomilla si el valor contiene coma, comilla o salto de línea. */
export function escaparCsv(valor: string): string {
  const protegido = INICIO_PELIGROSO.test(valor) ? `'${valor}` : valor;
  if (/[",\n]/.test(protegido)) return `"${protegido.replace(/"/g, '""')}"`;
  return protegido;
}
