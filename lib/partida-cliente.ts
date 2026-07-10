export interface PartidaInput {
  registroId: number | null;
  trago: string;
  resultado: "gano" | "fallo" | "tiempo";
  tiempoRestante: number;
  // jsonb libre (la API no valida su forma): { elecciones, evaluacion }. Con el
  // rediseño de mezclas multi, elecciones.mezclas es un string[] (MezclaId[]) y
  // la evaluación añade mezclasFaltaron/mezclasSobraron; van dentro de detalles
  // sin tocar la API ni el schema.
  detalles: unknown;
}

// enviarPartida vive junto a la cola offline (registro-cliente) porque comparte
// el estado de la sesión encolada: si el registro de este juego quedó pendiente,
// la partida se le adjunta en vez de perderse. Se re-exporta aquí para no cambiar
// los sitios de llamada existentes (components/pantallas/Resultado.tsx).
export { enviarPartida } from "@/lib/registro-cliente";
