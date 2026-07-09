// Máscaras progresivas para inputs de formulario (se aplican en cada onChange).

export function mascaraCedula(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length > 10) return `${d.slice(0, 3)}-${d.slice(3, 10)}-${d.slice(10)}`;
  if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d;
}

export function mascaraTelefono(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length > 6) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length > 3) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d}`;
}
