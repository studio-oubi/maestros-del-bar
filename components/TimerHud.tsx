"use client";

// HUD del cronómetro: vive montado en Reto.tsx (nunca se desmonta entre los
// 4 pasos del reto) para que la cuenta atrás nunca se reinicie. Arriba a la
// derecha (mocks 9-12); pulsa en rojo suave cuando quedan ≤10s.
export function TimerHud({ formato, critico }: { formato: string; critico: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[3.2cqh] z-30 flex justify-end px-[6cqw]">
      <span
        className={`font-titulo text-[2.6cqh] font-600 tabular-nums transition-colors duration-300 ${
          critico ? "text-red-400 [animation:timer-pulso_.9s_ease-in-out_infinite]" : "text-white"
        }`}
      >
        {formato}
      </span>
      <style jsx>{`
        @keyframes timer-pulso {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
