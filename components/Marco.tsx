import Image from "next/image";
import type { ReactNode } from "react";
import { IMG } from "@/lib/asset-manifest";

// Marco visual compartido por toda la experiencia: fondo a pantalla completa,
// borde dorado fino y, SOLO en pantallas horizontales (desktop/landscape),
// un marco de teléfono centrado (patrón de legacy/index.html #marco).
// En cualquier pantalla vertical (móvil, tablet o tótem, sin importar el
// ancho) la app llena la pantalla.
const fondoEscritorio = "radial-gradient(130% 100% at 50% -10%, #10203a 0%, #070c16 55%, #04060c 100%)";
const sombraEscritorio =
  "0 60px 140px rgba(0,0,0,.75), 0 0 0 10px #0a0e18, 0 0 0 11px rgba(201,164,92,.3), inset 0 2px 30px rgba(255,255,255,.05)";

export function Marco({ children }: { children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-navy-deep landscape:[background:var(--marco-fondo-escritorio)]"
      style={{ "--marco-fondo-escritorio": fondoEscritorio } as React.CSSProperties}
    >
      <div
        className="relative h-dvh w-full overflow-hidden bg-navy-deep [aspect-ratio:1080/1920] [container-type:size] landscape:h-[min(94dvh,940px)] landscape:w-auto landscape:max-w-[96vw] landscape:rounded-[48px] landscape:[box-shadow:var(--marco-sombra-escritorio)]"
        style={{ "--marco-sombra-escritorio": sombraEscritorio } as React.CSSProperties}
      >
        <Image
          src={IMG.background}
          alt=""
          fill
          priority
          sizes="(orientation: landscape) 940px, 100vw"
          className="pointer-events-none select-none object-cover"
        />
        <div className="relative z-10 h-full w-full">{children}</div>
        {/* El borde va ENCIMA del contenido (z-30) para que la barra u otras
            imágenes a sangre completa nunca lo tapen; NavBotones usa z-40. */}
        <div className="pointer-events-none absolute inset-[8px] z-30 rounded-[18px] border-[16px] border-oro/70" />
      </div>
    </div>
  );
}
