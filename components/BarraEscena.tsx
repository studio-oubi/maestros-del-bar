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
      {/* Mostrador. Su borde frontal superior cae sobre --linea-barra. El borde
          superior de la foto se difumina (mask-image) para fundirse con el fondo
          texturizado sin costura; el degradado acaba por encima de la línea de la
          barra para que el filo frontal quede nítido. */}
      <div className="absolute inset-x-0 bottom-0 top-[52cqh] overflow-hidden">
        <Image
          src={IMG.barra}
          alt=""
          fill
          priority
          sizes="(min-width: 600px) 940px, 100vw"
          className="pointer-events-none select-none object-cover [object-position:50%_18%]"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 16%)",
            maskImage: "linear-gradient(to bottom, transparent 0%, #000 16%)",
          }}
        />
      </div>

      {/* Capa de escena: aquí vive el coverflow, apoyado en --linea-barra. */}
      <div className="absolute inset-0">{children}</div>

      {/* Firma inferior: lockup ESCÁPATE / A LO EXTRAORDINARIO (una sola imagen). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[6cqh] flex justify-center">
        <div className="relative aspect-[1031/300] w-[62cqw]">
          <Image
            src={IMG.escapate}
            alt="Escápate a lo extraordinario"
            fill
            sizes="(min-width: 600px) 620px, 64vw"
            className="select-none object-contain"
          />
        </div>
      </div>
    </div>
  );
}
