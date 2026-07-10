"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { JuegoProvider, useJuego } from "@/lib/juego";
import { EVENTO_PORTADA, leerPortada, type Portada } from "@/lib/portada";
import { Marco } from "@/components/Marco";
import { NavBotones } from "@/components/NavBotones";
import { ConfigOculta, VideoOverlay } from "@/components/ConfigOculta";
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

  // Portada elegida (persiste en localStorage). En el Home con portada "kv" la
  // imagen va a sangre completa: se oculta el borde dorado del Marco. Al pasar al
  // flujo (formulario en adelante) el marco vuelve a la normalidad.
  const [portada, setPortada] = useState<Portada>("actual");
  useEffect(() => {
    setPortada(leerPortada());
    const alCambiar = () => setPortada(leerPortada());
    window.addEventListener(EVENTO_PORTADA, alCambiar);
    return () => window.removeEventListener(EVENTO_PORTADA, alCambiar);
  }, []);

  const grupo = grupoDe(estado.pantalla);
  const sinBorde = estado.pantalla === "home" && portada === "kv";

  // El overlay de video vive a nivel de App (hermano del Marco) para cubrir la
  // pantalla completa, por encima del marco y de NavBotones (ver VideoOverlay).
  const [videoAbierto, setVideoAbierto] = useState(false);

  // Video de ARRANQUE: la primera vez que la app llega al Home (tras la precarga
  // del Preloader) se muestra el video en loop; el usuario lo cierra con la X y
  // cae al Home. Solo una vez por carga (no en REINICIAR). En reduced-motion se
  // salta directo al Home. useLayoutEffect para montar el overlay antes del
  // primer paint del Home (sin flash de la pantalla de abajo).
  const bootVideoConsumido = useRef(false);
  useLayoutEffect(() => {
    if (estado.pantalla !== "home" || bootVideoConsumido.current) return;
    bootVideoConsumido.current = true;
    const reducido =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducido) setVideoAbierto(true);
  }, [estado.pantalla]);

  return (
    <>
    <Marco sinBorde={sinBorde}>
      <div key={grupo} className="pantalla-enter h-full w-full">
        <Pantallas />
      </div>
      <NavBotones />
      <ConfigOculta onAbrirVideo={() => setVideoAbierto(true)} />
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
    {videoAbierto && <VideoOverlay onCerrar={() => setVideoAbierto(false)} />}
    </>
  );
}

export default function App() {
  return (
    <JuegoProvider>
      <Juego />
    </JuegoProvider>
  );
}
