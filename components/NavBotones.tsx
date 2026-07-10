"use client";

import { ChevronLeft, House } from "lucide-react";
import { useJuego, type Pantalla } from "@/lib/juego";

// A qué pantalla vuelve el botón atrás desde cada pantalla del flujo previo al reto.
const ATRAS: Partial<Record<Pantalla, Pantalla>> = {
  formulario: "home",
  recetas: "formulario",
  intro: "recetas",
  "elige-trago": "intro",
  listo: "elige-trago",
};

// Durante el reto solo se ofrece Home (abandona la partida); atrás rompería el reto.
const CON_HOME: Pantalla[] = [
  "formulario",
  "recetas",
  "intro",
  "elige-trago",
  "listo",
  "reto-vaso",
  "reto-ron",
  "reto-mezcla",
  "reto-mix",
];

const BOTON =
  "pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-oro/30 " +
  "bg-navy-deep/45 text-crema/80 backdrop-blur-sm transition-colors " +
  "active:border-oro active:text-oro";

export function NavBotones() {
  const { estado, despachar } = useJuego();
  const destinoAtras = ATRAS[estado.pantalla];
  const conHome = CON_HOME.includes(estado.pantalla);

  if (!destinoAtras && !conHome) return null;

  return (
    <div className="pointer-events-none absolute left-[30px] top-[30px] z-40 flex gap-[8px]">
      {destinoAtras && (
        <button
          type="button"
          aria-label="Atrás"
          className={BOTON}
          onClick={() => despachar({ tipo: "IR", a: destinoAtras })}
        >
          <ChevronLeft size={16} strokeWidth={2.25} />
        </button>
      )}
      {conHome && (
        <button
          type="button"
          aria-label="Inicio"
          className={BOTON}
          onClick={() => despachar({ tipo: "REINICIAR" })}
        >
          <House size={15} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
