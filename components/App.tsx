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
import { procesarCola } from "@/lib/registro-cliente";
import { registrarServiceWorker } from "@/lib/sw-registro";

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

function Juego() {
  const { estado } = useJuego();

  // Offline: registra el service worker (app shell + imágenes) y vacía la cola de
  // registros/partidas pendientes al arrancar, al volver la conexión ('online') y
  // cada 60s mientras la app siga abierta.
  useEffect(() => {
    registrarServiceWorker();
    void procesarCola();
    const alVolverRed = () => void procesarCola();
    window.addEventListener("online", alVolverRed);
    const intervalo = window.setInterval(() => void procesarCola(), 60000);
    return () => {
      window.removeEventListener("online", alVolverRed);
      window.clearInterval(intervalo);
    };
  }, []);

  const grupo = grupoDe(estado.pantalla);

  return (
    <Marco>
      <div key={grupo} className="pantalla-enter h-full w-full">
        <Pantallas />
      </div>
      <NavBotones />
      <ConfigOculta />
      <style jsx>{`
        /* Transición entre pantallas portada del legacy (.pantalla /
           .pantalla.activa, index.html): la pantalla entrante sube 16px y
           aparece (opacity + transform) en 0.65s con la curva easeOut del
           legacy cubic-bezier(.22,.9,.28,1). Sin scale y uniforme para todas:
           el legacy desliza la pantalla ENTERA —barra incluida— los mismos
           16px, así que los items no se despegan de su propia barra. */
        .pantalla-enter {
          animation: pantalla-entra 0.65s cubic-bezier(0.22, 0.9, 0.28, 1);
        }
        @keyframes pantalla-entra {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .pantalla-enter {
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
