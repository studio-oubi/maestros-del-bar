// Genera una etiqueta genérica (rectángulo redondeado navy + borde dorado +
// nombre en mayúsculas doradas) y la compone sobre una foto de botella
// existente, para tapar la etiqueta de marca original. Usado por
// scripts/build-stock.mjs para producir los mixer-* de stock/ a partir de
// fuentes de legacy/assets.
import sharp from "sharp";

const NAVY = "#0a1a3a";
const NAVY_DARK = "#061024"; // sombra de asiento, apenas más oscuro
const GOLD = "#c9a84c";
const GOLD_TEXT = "#e8cc7a"; // texto un poco más claro que el borde, para que resalte sobre el navy

// Parte un texto en 1-2 líneas buscando el espacio más cercano al medio.
function partirLineas(texto) {
  if (texto.length <= 10) return [texto];
  const palabras = texto.split(" ");
  if (palabras.length < 2) return [texto];
  let mejorCorte = 1;
  let mejorDelta = Infinity;
  for (let i = 1; i < palabras.length; i++) {
    const l1 = palabras.slice(0, i).join(" ").length;
    const l2 = palabras.slice(i).join(" ").length;
    const delta = Math.abs(l1 - l2);
    if (delta < mejorDelta) {
      mejorDelta = delta;
      mejorCorte = i;
    }
  }
  return [palabras.slice(0, mejorCorte).join(" "), palabras.slice(mejorCorte).join(" ")];
}

// Ancho aproximado de un caracter para una condensada bold (heurística,
// suficiente para calibrar el font-size al ancho disponible sin medir texto real).
const ANCHO_CAR = 0.58;

function svgEtiqueta({ w, h, r, nombre }) {
  const lineas = partirLineas(nombre);
  const padX = w * 0.12;
  const anchoDisponible = w - padX * 2;
  const altoDisponible = h * 0.7;
  // font-size que hace caber la línea más larga en el ancho disponible.
  const charsMax = Math.max(...lineas.map((l) => l.length));
  let fontSize = anchoDisponible / (charsMax * ANCHO_CAR);
  // limitado también por el alto disponible repartido entre líneas.
  const fontSizeAlto = (altoDisponible / lineas.length) * 0.78;
  fontSize = Math.min(fontSize, fontSizeAlto);
  fontSize = Math.max(fontSize, 8); // piso de legibilidad

  const lineHeight = fontSize * 1.12;
  const bloqueAlto = lineHeight * lineas.length;
  const yInicio = h / 2 - bloqueAlto / 2 + fontSize * 0.78;

  const textos = lineas
    .map(
      (linea, i) =>
        `<text x="${w / 2}" y="${yInicio + i * lineHeight}" text-anchor="middle" font-family="Arial Narrow, Arial, Helvetica, sans-serif" font-weight="800" font-size="${fontSize.toFixed(1)}" letter-spacing="${(fontSize * 0.02).toFixed(1)}" fill="${GOLD_TEXT}" transform="scale(0.92,1)" transform-origin="${w / 2} ${(yInicio + i * lineHeight).toFixed(1)}">${linea}</text>`
    )
    .join("\n");

  const borde = Math.max(2, Math.round(h * 0.018));

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${NAVY}"/>
        <stop offset="100%" stop-color="${NAVY_DARK}"/>
      </linearGradient>
    </defs>
    <rect x="${borde}" y="${borde + h * 0.015}" width="${w - borde * 2}" height="${h - borde * 2}" rx="${r}" ry="${r}" fill="#000" opacity="0.28"/>
    <rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="url(#g)" stroke="${GOLD}" stroke-width="${borde}"/>
    <rect x="${borde * 1.8}" y="${borde * 1.8}" width="${w - borde * 3.6}" height="${h - borde * 3.6}" rx="${Math.max(0, r - borde)}" ry="${Math.max(0, r - borde)}" fill="none" stroke="${GOLD}" stroke-opacity="0.35" stroke-width="${Math.max(1, borde * 0.4)}"/>
    ${textos}
  </svg>`;
}

// Compone una o más etiquetas genéricas sobre una imagen fuente.
// rects: [{ x, y, w, h, r, nombre }] en coordenadas nativas de la imagen fuente.
// factor: upscale aplicado antes de componer (fuentes legacy son chicas; se
// sube de resolución para que el texto vectorial de la etiqueta salga nítido).
export async function relabelarBotella(srcPath, rects, { factor = 3 } = {}) {
  const base = sharp(srcPath);
  const meta = await base.metadata();
  const W = Math.round(meta.width * factor);
  const H = Math.round(meta.height * factor);
  const upscaled = await base.resize(W, H, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();

  const composites = [];
  for (const rect of rects) {
    const w = Math.round(rect.w * factor);
    const h = Math.round(rect.h * factor);
    const r = Math.round((rect.r ?? Math.min(rect.w, rect.h) * 0.12) * factor);
    const svg = svgEtiqueta({ w, h, r, nombre: rect.nombre });
    composites.push({
      input: Buffer.from(svg),
      left: Math.round(rect.x * factor),
      top: Math.round(rect.y * factor),
    });
  }

  return sharp(upscaled).composite(composites).png().toBuffer();
}
