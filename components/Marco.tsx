import Image from "next/image";
import type { ReactNode } from "react";
import { IMG } from "@/lib/asset-manifest";

// Marco visual compartido por toda la experiencia: fondo a pantalla completa,
// borde dorado fino y, en pantallas ≥600px, un marco de teléfono centrado
// (mismo patrón que legacy/index.html #marco).
const fondoEscritorio = "radial-gradient(130% 100% at 50% -10%, #10203a 0%, #070c16 55%, #04060c 100%)";
const sombraEscritorio =
  "0 60px 140px rgba(0,0,0,.75), 0 0 0 10px #0a0e18, 0 0 0 11px rgba(201,164,92,.3), inset 0 2px 30px rgba(255,255,255,.05)";

export function Marco({ children }: { children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-navy-deep sm:[background:var(--marco-fondo-escritorio)]"
      style={{ "--marco-fondo-escritorio": fondoEscritorio } as React.CSSProperties}
    >
      <div
        className="relative h-dvh w-full overflow-hidden bg-navy-deep [aspect-ratio:1080/1920] [container-type:size] sm:h-[min(94dvh,940px)] sm:w-auto sm:max-w-[96vw] sm:rounded-[48px] sm:[box-shadow:var(--marco-sombra-escritorio)]"
        style={{ "--marco-sombra-escritorio": sombraEscritorio } as React.CSSProperties}
      >
        <Image
          src={IMG.background}
          alt=""
          fill
          priority
          sizes="(min-width: 600px) 940px, 100vw"
          className="pointer-events-none select-none object-cover"
        />
        <div className="pointer-events-none absolute inset-[8px] rounded-[18px] border-2 border-oro/70" />
        <div className="relative z-10 h-full w-full">{children}</div>
      </div>
    </div>
  );
}
