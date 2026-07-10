"use client";

// Panel de confirmación con fondo desenfocado, compartido por el paso MEZCLA
// (Reto) y el paso COMPLETA (GridMix). Cubre la escena (intercepta taps) hasta
// que el jugador Continúa/Mezcla o Vuelve a editar la selección.
export function PanelConfirmar({
  onConfirmar,
  onVolver,
  textoConfirmar,
  textoVolver,
}: {
  onConfirmar: () => void;
  onVolver: () => void;
  textoConfirmar: string;
  textoVolver: string;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-end gap-[2cqh] bg-navy-deep/30 pb-[10cqh] backdrop-blur-md [animation:panel-aparece_.25s_ease]">
      <button
        type="button"
        onClick={onConfirmar}
        className="texto-boton rounded-full bg-gradient-to-b from-oro-claro to-oro px-[16cqw] py-[0.7cqh] leading-none shadow-[0_12px_32px_rgba(0,0,0,.55)] transition-transform active:scale-95"
      >
        {textoConfirmar}
      </button>
      <button
        type="button"
        onClick={onVolver}
        className="font-cuerpo text-[1.6cqh] font-medium uppercase tracking-[0.14em] text-crema/80 underline decoration-crema/30 underline-offset-4 transition-colors hover:text-crema"
      >
        {textoVolver}
      </button>
      <style jsx>{`
        @keyframes panel-aparece {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
