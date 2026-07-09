import Image from "next/image";
import type { ReactNode } from "react";
import { IMG } from "@/lib/asset-manifest";

// Escena de la barra: la foto del mostrador se ancla al tercio inferior de forma
// que la superficie superior de la barra quede a ~62% de alto del marco
// (variable CSS --linea-barra). Los children (el coverflow) se "apoyan" en esa
// línea. Debajo, la firma ESCÁPATE / A LO EXTRAORDINARIO (mock 7).
export function BarraEscena({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 [--linea-barra:62cqh]">
      {/* Mostrador. Su borde frontal superior cae sobre --linea-barra. */}
      <div className="absolute inset-x-0 bottom-0 top-[52cqh] overflow-hidden">
        <Image
          src={IMG.barra}
          alt=""
          fill
          priority
          sizes="(min-width: 600px) 940px, 100vw"
          className="pointer-events-none select-none object-cover [object-position:50%_18%]"
        />
        {/* Fundido superior para integrar la barra con el fondo navy. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[16cqh] bg-gradient-to-b from-navy-deep to-transparent" />
      </div>

      {/* Capa de escena: aquí vive el coverflow, apoyado en --linea-barra. */}
      <div className="absolute inset-0">{children}</div>

      {/* Firma inferior */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[7cqh] flex flex-col items-center gap-[1.2cqh]">
        <span className="font-titulo text-[5.2cqh] font-600 leading-none tracking-[0.16em] text-crema">
          ESCÁPATE
        </span>
        <div className="relative h-[2.6cqh] w-[42cqw]">
          <Image
            src={IMG.escapate}
            alt="A lo extraordinario"
            fill
            sizes="(min-width: 600px) 480px, 60vw"
            className="select-none object-contain"
          />
        </div>
      </div>
    </div>
  );
}
