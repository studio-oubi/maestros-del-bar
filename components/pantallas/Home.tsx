"use client";

import { useRef } from "react";
import { IMG } from "@/lib/asset-manifest";
import { useJuego } from "@/lib/juego";
import { ShaderBotellas } from "@/components/ShaderBotellas";

const BOTELLAS = [IMG.homeExtraviejo, IMG.homeDoble, IMG.homeTriple];
const UMBRAL_MOV = 12; // px: más que esto se considera scroll/drag, no un toque

export function Home() {
  const { despachar } = useJuego();
  const inicio = useRef<{ x: number; y: number } | null>(null);

  const comenzar = () => despachar({ tipo: "IR", a: "formulario" });

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Comenzar el Mix Challenge"
      onPointerDown={(e) => {
        inicio.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const p = inicio.current;
        inicio.current = null;
        if (!p) return;
        const dist = Math.hypot(e.clientX - p.x, e.clientY - p.y);
        if (dist <= UMBRAL_MOV) comenzar();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          comenzar();
        }
      }}
      className="relative h-full w-full cursor-pointer overflow-hidden select-none outline-none"
      style={{ containerType: "size" }}
    >
      <style>{estilos}</style>

      {/* Proporciones medidas de la referencia (User Flow/1.png, 1080×1920),
          en unidades de container-query relativas a esta pantalla:
          Brugal ~33cqw centro 17.5cqh · lockup ~66cqw centro 29cqh ·
          botella 40→88cqh · neón ~72cqw sobre el tercio inferior. */}

      {/* Logo Brugal */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={IMG.logoBrugal}
        alt="Brugal"
        className="pointer-events-none absolute left-1/2 top-[17.5cqh] w-[33cqw] -translate-x-1/2 -translate-y-1/2"
      />

      {/* Lockup ESCÁPATE / A LO EXTRAORDINARIO (grande) */}
      <h1 className="absolute left-1/2 top-[29cqh] w-[66cqw] -translate-x-1/2 -translate-y-1/2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={IMG.escapate} alt="Escápate a lo extraordinario" className="w-full" />
      </h1>

      {/* Botella compacta (dissolve) — ocupa de 40cqh a 88cqh.
          Contra-tilt (rotate) en este contenedor y bob (translateY) por dentro,
          en capas separadas para no pisarse el transform. El contra-tilt usa el
          mismo ciclo que el tilt del neón pero invertido, como contrapeso. */}
      <div className="mix-contratilt absolute left-0 top-[40cqh] h-[48cqh] w-full">
        <ShaderBotellas imagenes={BOTELLAS} intervaloMs={12000} className="mix-bob h-full w-full" />
      </div>

      {/* Logo neón: centrado, cruza el tercio inferior de la botella. Posición
          y animación en capas separadas para que el translate de centrado no
          choque con las animaciones (el texto neón ocupa el 93% del PNG y está
          centrado, así que basta con centrar la caja). */}
      <div className="pointer-events-none absolute left-1/2 top-[76cqh] w-[72cqw] -translate-x-1/2 -translate-y-1/2">
        <div className="mix-flotar">
          <div className="mix-tiltear">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMG.logoMix}
              alt="Mix Challenge"
              className="w-full drop-shadow-[0_0_18px_rgba(255,63,216,0.45)]"
            />
          </div>
        </div>
      </div>

      {/* Hint inferior */}
      <p className="mix-latido absolute bottom-[3cqh] left-1/2 -translate-x-1/2 font-cuerpo text-[0.7rem] font-light uppercase tracking-[0.35em] text-crema/55">
        toca para comenzar
      </p>
    </div>
  );
}

const estilos = `
@keyframes mixFlotar {
  0%, 100% { transform: translateY(-6px); }
  50%      { transform: translateY(6px); }
}
@keyframes mixTiltear {
  0%   { transform: rotate(-2deg); }
  35%  { transform: rotate(1.4deg); }
  70%  { transform: rotate(-1deg); }
  100% { transform: rotate(2deg); }
}
@keyframes mixLatido {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 0.8; }
}
@keyframes mixBob {
  0%, 100% { transform: translateY(-12px); }
  50%      { transform: translateY(12px); }
}
/* Contra-tilt: keyframes del neón (-2,1.4,-1,2) invertidos y escalados a ±0.9°. */
@keyframes mixContraTilt {
  0%   { transform: rotate(0.9deg); }
  35%  { transform: rotate(-0.63deg); }
  70%  { transform: rotate(0.45deg); }
  100% { transform: rotate(-0.9deg); }
}
.mix-flotar  { animation: mixFlotar 8s ease-in-out infinite; }
.mix-tiltear { animation: mixTiltear 11.7s ease-in-out infinite alternate; transform-origin: 50% 60%; }
.mix-latido  { animation: mixLatido 2.6s ease-in-out infinite; }
.mix-bob     { animation: mixBob 15s ease-in-out infinite; }
.mix-contratilt { animation: mixContraTilt 11.7s ease-in-out infinite alternate; transform-origin: 50% 85%; }
@media (prefers-reduced-motion: reduce) {
  .mix-bob     { animation: none; }
  .mix-contratilt { animation: none; }
  .mix-flotar  { animation: none; }
  .mix-tiltear { animation: none; }
  .mix-latido  { animation: none; opacity: 0.6; }
}
`;
