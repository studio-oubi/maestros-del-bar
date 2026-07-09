export interface PartidaInput {
  registroId: number | null;
  trago: string;
  resultado: "gano" | "fallo" | "tiempo";
  tiempoRestante: number;
  detalles: unknown;
}

// Envía el resultado de la partida al servidor. Fire-and-forget: la pantalla
// de resultado nunca debe bloquearse ni fallar visiblemente si la red cae.
export async function enviarPartida(p: PartidaInput): Promise<void> {
  try {
    await fetch("/api/partida", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
  } catch {
    // sin conexión o error de red: se ignora, no bloquea el juego
  }
}
