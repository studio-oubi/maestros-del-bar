"use client";

import { useEffect } from "react";
import { JuegoProvider, useJuego } from "@/lib/juego";
import { Marco } from "@/components/Marco";
import { NavBotones } from "@/components/NavBotones";
import { ConfigOculta } from "@/components/ConfigOculta";
import { Preloader } from "@/components/Preloader";
import { Home } from "@/components/pantallas/Home";
import { Formulario } from "@/components/pantallas/Formulario";
import { Recetas } from "@/components/pantallas/Recetas";
import { Intro } from "@/components/pantallas/Intro";
import { EligeTrago } from "@/components/pantallas/EligeTrago";
import { Listo } from "@/components/pantallas/Listo";
import { Reto } from "@/components/pantallas/Reto";
import { Resultado } from "@/components/pantallas/Resultado";
import { reintentarPendiente } from "@/lib/registro-cliente";

function Pantallas() {
  const { estado } = useJuego();
  switch (estado.pantalla) {
    case "loading":
      return <Preloader />;
    case "home":
      return <Home />;
    case "formulario":
      return <Formulario />;
    case "recetas":
      return <Recetas />;
    case "intro":
      return <Intro />;
    case "elige-trago":
      return <EligeTrago />;
    case "listo":
      return <Listo />;
    case "reto-vaso":
    case "reto-ron":
    case "reto-mezcla":
    case "reto-mix":
      return <Reto />;
    case "resultado":
      return <Resultado />;
    default:
      return null;
  }
}

// Reto anima INTERNAMENTE entre sus 4 sub-pasos (ver Reto.tsx: key por
// estado.pantalla con su propio keyframe de 300ms), así que las 4 pantallas
// reto-* comparten una sola key aquí para que la transición global de 400ms
// no se retrigguee al pasar de reto-vaso a reto-ron, etc.
function grupoDe(pantalla: string): string {
  return pantalla.startsWith("reto") ? "reto" : pantalla;
}

// Pantallas CON BARRA: los items del coverflow/botella se apoyan en la línea de
// la barra, así que la entrada con translateY los hacía "subir" a su sitio
// (movimiento vertical no deseado). Entran solo con fundido. El resto conserva
// el fade + translateY(16px), que ahí no molesta.
const GRUPOS_CON_BARRA = new Set(["elige-trago", "reto", "resultado"]);

function Juego() {
  const { estado } = useJuego();

  // Reintenta un registro que quedó pendiente (red caída / DB no disponible)
  // en cuanto la app arranca, sin bloquear el juego.
  useEffect(() => {
    void reintentarPendiente();
  }, []);

  const grupo = grupoDe(estado.pantalla);
  const claseEntra = GRUPOS_CON_BARRA.has(grupo) ? "pantalla-enter-fade" : "pantalla-enter";

  return (
    <Marco>
      <div key={grupo} className={`${claseEntra} h-full w-full`}>
        <Pantallas />
      </div>
      <NavBotones />
      <ConfigOculta />
      <style jsx>{`
        .pantalla-enter {
          animation: pantalla-entra 0.4s ease;
        }
        .pantalla-enter-fade {
          animation: pantalla-entra-fade 0.4s ease;
        }
        @keyframes pantalla-entra {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pantalla-entra-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .pantalla-enter,
          .pantalla-enter-fade {
            animation: none;
          }
        }
      `}</style>
    </Marco>
  );
}

export default function App() {
  return (
    <JuegoProvider>
      <Juego />
    </JuegoProvider>
  );
}
