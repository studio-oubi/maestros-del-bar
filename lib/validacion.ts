export interface RegistroInput {
  nombre: string;
  cedula: string;
  telefono: string;
  correo: string;
  // Ciudad/establecimiento vienen del popup de configuración del kiosko (mc_config),
  // no del formulario: opcionales para no romper registros hechos antes de configurar el local.
  ciudad?: string;
  establecimiento?: string;
}

type ResultadoValidacion =
  | { ok: true; datos: RegistroInput }
  | { ok: false; error: string };

const CEDULA_RE = /^\d{3}-?\d{7}-?\d{1}$/;
const CORREO_RE = /^\S+@\S+\.\S+$/;

function normalizarCedula(cedula: string): string {
  const digitos = cedula.replace(/\D/g, "");
  return `${digitos.slice(0, 3)}-${digitos.slice(3, 10)}-${digitos.slice(10, 11)}`;
}

function normalizarTelefono(telefono: string): string {
  const digitos = telefono.replace(/\D/g, "").slice(-10);
  return `(${digitos.slice(0, 3)}) ${digitos.slice(3, 6)}-${digitos.slice(6, 10)}`;
}

export function validarRegistro(d: unknown): ResultadoValidacion {
  if (typeof d !== "object" || d === null) {
    return { ok: false, error: "Payload inválido" };
  }

  const { nombre, cedula, telefono, correo, ciudad, establecimiento } = d as Record<string, unknown>;

  if (typeof nombre !== "string" || nombre.trim().length < 3) {
    return { ok: false, error: "Nombre inválido" };
  }
  if (typeof cedula !== "string" || !CEDULA_RE.test(cedula)) {
    return { ok: false, error: "Cédula inválida" };
  }
  if (typeof telefono !== "string" || telefono.replace(/\D/g, "").length < 10) {
    return { ok: false, error: "Teléfono inválido" };
  }
  // Correo es opcional: ausente o vacío se normaliza a "", pero si viene con
  // contenido debe ser un correo válido.
  const correoTrim = typeof correo === "string" ? correo.trim() : "";
  if (correoTrim !== "" && !CORREO_RE.test(correoTrim)) {
    return { ok: false, error: "Correo inválido" };
  }

  return {
    ok: true,
    datos: {
      nombre,
      cedula: normalizarCedula(cedula),
      telefono: normalizarTelefono(telefono),
      correo: correoTrim,
      ciudad: typeof ciudad === "string" ? ciudad.trim() : "",
      establecimiento: typeof establecimiento === "string" ? establecimiento.trim() : "",
    },
  };
}
