// Pantalla completa del kiosko. La PWA instalada ya arranca fullscreen
// (manifest display=fullscreen); esto cubre el caso NAVEGADOR, donde el
// fullscreen requiere un gesto del usuario: en cada pointerdown se pide
// (si hace falta) y así la app entra y SE MANTIENE a pantalla completa.

// El staff puede salir a propósito con el botón invisible de abajo-derecha; si
// lo hace, NO re-entramos automáticamente hasta que él lo reactive o se recargue
// la app (flag en memoria del módulo, se resetea al recargar).
let staffSalioManual = false;
let ultimoIntento = 0;

// Safari iPhone no soporta requestFullscreen: feature-detect -> no-op silencioso
// (el tótem es Android/Chrome).
function soportaFullscreen(): boolean {
  return typeof document !== "undefined" && typeof document.documentElement.requestFullscreen === "function";
}

// ¿Ya estamos a pantalla completa según la Fullscreen API? OJO: NO tratamos el
// display-mode fullscreen/standalone de la PWA instalada como "ya está": en el
// tótem real la PWA instalada seguía mostrando la barra de notificaciones y solo
// requestFullscreen (modo inmersivo) la esconde. Pedirlo cuando ya se está
// inmersivo es un no-op inofensivo.
function yaEnPantallaCompleta(): boolean {
  return Boolean(document.fullscreenElement);
}

// Se llama en CADA pointerdown global (ver App.tsx). Entra a fullscreen si toca;
// también recupera el fullscreen si el usuario/sistema salió (cualquier gesto
// posterior lo vuelve a pedir). Throttle suave para no spamear requests fallidos.
export function autoFullscreenEnGesto(): void {
  if (!soportaFullscreen()) return; // Safari iPhone, etc.
  if (staffSalioManual) return; // el staff decidió salir: respetamos su sesión
  if (yaEnPantallaCompleta()) return; // ya estamos (PWA o Fullscreen API)
  const ahora = Date.now();
  if (ahora - ultimoIntento < 1000) return; // throttle
  ultimoIntento = ahora;
  // navigationUI:"hide" esconde también la UI del sistema en Android; si el
  // navegador no soporta las opciones, cae al request simple.
  const raiz = document.documentElement;
  raiz.requestFullscreen({ navigationUI: "hide" }).catch(() => {
    raiz.requestFullscreen().catch(() => {});
  });
}

// Botón manual del staff (esquina inferior derecha): alterna y RECUERDA su
// decisión para que el auto-fullscreen la respete durante la sesión.
export async function alternarFullscreenStaff(): Promise<void> {
  if (!soportaFullscreen()) return;
  try {
    if (document.fullscreenElement) {
      staffSalioManual = true; // salió a propósito: no re-entrar automáticamente
      await document.exitFullscreen();
    } else {
      staffSalioManual = false; // reactiva el auto-fullscreen
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // sin soporte o gesto insuficiente: se ignora en silencio
  }
}
