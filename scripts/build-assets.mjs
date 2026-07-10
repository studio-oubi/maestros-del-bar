// Pipeline de assets: convierte los PNG pesados de "New design " y legacy/assets
// a WebP optimizado en public/img/, y genera el manifiesto tipado lib/asset-manifest.ts.
//
// Uso: npm run assets

import sharp from "sharp";
import { mkdir, copyFile, writeFile, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ND = path.join(ROOT, "New design "); // ojo: espacio final en el nombre real
const LEG = path.join(ROOT, "legacy/assets");
const STOCK = path.join(ROOT, "stock"); // botellas relabeladas + ingredientes propios (ver scripts/build-stock.mjs)
const OUT = path.join(ROOT, "public/img");
const MANIFEST_PATH = path.join(ROOT, "lib/asset-manifest.ts");

const nd = (name) => path.join(ND, name);
const leg = (name) => path.join(LEG, name);
const stock = (name) => path.join(STOCK, name);

// out: nombre de archivo en public/img; src: ruta absoluta de origen; height: alto máx de
// resize; quality: opcional, override de calidad webp (default 86, ver loop más abajo).
//
// Alturas subidas dos veces por feedback de usuario ("se ven de baja resolución" /
// "pixeladas"). Ronda 1: las alturas del plan original estaban pensadas en px CSS y
// quedaban cortas en DPR 2-3. Ronda 2 (esta): el tótem real corre a DPR alto sobre
// fuentes de hasta 2752px, así que las imágenes héroe (home/ron/trago/vaso/mixer) pasan
// a resolución NATIVA de su fuente (withoutEnlargement asegura que nunca se solicite más
// de lo que la fuente tiene), y esas mismas categorías héroe suben a quality 90. `ing-*`,
// `barra`, `background`, `escapate` y el logo quedan en quality 86 (no son el foco del
// reclamo de nitidez). `background` se deja en 1920: la fuente es 1080x1920 (no hay más
// resolución que sacar) y es una textura difusa de fondo donde no se nota.
const JOBS = [
  { out: "background.webp", src: nd("Background.png"), height: 1920 },
  { out: "barra.webp", src: nd("Barra.png"), height: 1613 },
  { out: "escapate.webp", src: nd("Escapate a lo extra ordinario.png"), height: 520 },
  { out: "mix-challenge-logo.webp", src: nd("Mix Challenge Logo.png"), height: 790 }, // nativo
  { out: "home-doble.webp", src: nd("Home Doble.png"), height: 2752, quality: 90 }, // nativo
  { out: "home-extraviejo.webp", src: nd("Home Extra Viejo.png"), height: 2752, quality: 90 }, // nativo
  { out: "home-triple.webp", src: nd("Home Triple Reserva.png"), height: 2754, quality: 90 }, // nativo
  { out: "ron-doble.webp", src: nd("Doble Reserva.png"), height: 2539, quality: 90 }, // nativo
  { out: "ron-triple.webp", src: nd("Triple reserva.png"), height: 2297, quality: 90 }, // nativo
  { out: "ron-extraviejo.webp", src: nd("Extraviejo.png"), height: 2077, quality: 90 }, // nativo
  { out: "trago-toronja.webp", src: nd("toronja.png"), height: 2752, quality: 90 }, // nativo
  { out: "trago-sour.webp", src: nd("sour.png"), height: 2752, quality: 90 }, // nativo
  { out: "trago-albahaca.webp", src: nd("basir.png"), height: 2752, quality: 90 }, // nativo
  { out: "vaso-toronja.webp", src: nd("toronja glas.png"), height: 2752, quality: 90 }, // nativo
  { out: "vaso-sour.webp", src: nd("sour glass.png"), height: 2752, quality: 90 }, // nativo
  { out: "vaso-albahaca.webp", src: nd("basir glass.png"), height: 2752, quality: 90 }, // nativo
  { out: "ing-romero.webp", src: leg("ing-romero.png"), height: 800 },
  { out: "ing-hielo.webp", src: leg("ing-hielo.png"), height: 800 },
  { out: "ing-naranja.webp", src: leg("ing-naranja.png"), height: 800 },
  { out: "ing-clara.webp", src: leg("ing-clara.png"), height: 800 },
  { out: "ing-canela.webp", src: leg("ing-canela.png"), height: 800 },
  { out: "ing-jengibre.webp", src: leg("ing-jengibre.png"), height: 800 },
  { out: "ing-frambuesa.webp", src: leg("ing-frambuesa.png"), height: 800 },
  { out: "ing-menta.webp", src: leg("ing-menta.png"), height: 800 },
  { out: "ing-cafe.webp", src: leg("ing-cafe.png"), height: 800 },
  { out: "ing-demerara.webp", src: leg("ing-demerara.png"), height: 800 },
  { out: "ing-sirope.webp", src: leg("ing-syrup.png"), height: 800 },

  // Botellas de mezclas RELABELADAS (stock/, generado por scripts/build-stock.mjs):
  // fotos reales de legacy/assets con la etiqueta de marca tapada por una
  // genérica navy/dorado propia del juego. Ver stock/LICENCIAS.md — estas 7
  // no llevan ningún asset externo, solo re-etiquetan fotos ya del cliente.
  { out: "mixer-zumo-limon.webp", src: stock("mixer-zumo-limon.png"), height: 1600, quality: 90 },
  { out: "mixer-sirope-albahaca.webp", src: stock("mixer-sirope-albahaca.png"), height: 1600, quality: 90 },
  { out: "mixer-zumo-toronja.webp", src: stock("mixer-zumo-toronja.png"), height: 1600, quality: 90 },
  { out: "mixer-sirope-simple.webp", src: stock("mixer-sirope-simple.png"), height: 1600, quality: 90 },
  { out: "mixer-bitter-naranja.webp", src: stock("mixer-bitter-naranja.png"), height: 1600, quality: 90 },
  { out: "mixer-agua-gas.webp", src: stock("mixer-agua-gas.png"), height: 1600, quality: 90 },
  { out: "mixer-soda.webp", src: stock("mixer-soda.png"), height: 1600, quality: 90 },

  // Ingredientes nuevos (stock/): cáscara recortada de un render propio del
  // cliente (sour.png), anís de la única foto externa del juego (Dominio
  // Público, ver stock/LICENCIAS.md).
  { out: "ing-cascara.webp", src: stock("ing-cascara.png"), height: 800 },
  { out: "ing-anis.webp", src: stock("ing-anis.png"), height: 800 },
];

// Tiles derivados: recorte (extract) sobre la imagen fuente a tamaño original,
// recorte llevado a un lienzo CUADRADO (pad transparente si hace falta),
// luego resize a `height`. Estos 3 tiles se renderizan como medallones
// circulares con object-fit: cover, por lo que el resultado DEBE ser
// cuadrado y con el sujeto centrado llenando la mayor parte del cuadro
// (si no, el cover recorta de forma asimétrica y corta la fruta/hoja).
//
// Coordenadas medidas a mano con precisión de píxel: se generó un overlay
// de grilla (líneas cada 50px con la coordenada original impresa) sobre
// cada fuente y se leyó directamente la posición del sujeto y del borde
// del vaso/aro dorado, para no adivinar. Se verificó cada iteración con
// Read sobre el resultado final (compuesto sobre blanco para juzgar
// encuadre/márgenes).
//
// toronja.png y basir.png son 1536x2752. En ambos, el garnish (cuña de
// toronja / albahaca+limón) está en el tercio superior de la imagen.
const CROPS = [
  {
    // Cuña de toronja: bbox real medido con grilla ~(350,580)-(660,868)
    // (punta arriba, base abajo, borde del vaso empieza ~y870). El bbox
    // resultó casi cuadrado (349x305): solo hace falta un pad simétrico
    // mínimo arriba/abajo para cuadrar, sin recortar la fruta.
    out: "ing-toronja.webp",
    src: nd("toronja.png"),
    extract: { left: 333, top: 563, width: 349, height: 305 },
    pad: { top: 22, bottom: 22, left: 0, right: 0 },
    height: 800,
  },
  {
    // Par de hojas de albahaca: bbox real ~(305,745)-(715,878) (punta hoja
    // izq. en x330/y745, punta hoja der. en x700/y780, aro dorado del vaso
    // arranca ~y885). Es una forma intrínsecamente ancha y baja (410x138);
    // se prioriza mostrar ambas puntas completas y cero píxeles del aro
    // dorado por sobre el ratio de llenado, con pad simétrico arriba/abajo.
    out: "ing-albahaca.webp",
    src: nd("basir.png"),
    extract: { left: 305, top: 740, width: 410, height: 138 },
    pad: { top: 136, bottom: 136, left: 0, right: 0 },
    height: 800,
  },
  {
    // Rodaja de limón: recorte ya cuadrado, centrado en la rueda de limón
    // flotando en el trago (sin bordes de vaso ni residuos de albahaca).
    out: "ing-limon.webp",
    src: nd("basir.png"),
    extract: { left: 780, top: 1100, width: 350, height: 350 },
    height: 800,
  },
];

// out -> clave del manifiesto (camelCase), en el orden EXACTO de la interfaz del task brief.
const MANIFEST_KEYS = [
  ["background", "background.webp"],
  ["barra", "barra.webp"],
  ["escapate", "escapate.webp"],
  ["logoBrugal", "logo-brugal.svg"],
  ["logoMix", "mix-challenge-logo.webp"],
  ["homeDoble", "home-doble.webp"],
  ["homeExtraviejo", "home-extraviejo.webp"],
  ["homeTriple", "home-triple.webp"],
  ["ronDoble", "ron-doble.webp"],
  ["ronTriple", "ron-triple.webp"],
  ["ronExtraviejo", "ron-extraviejo.webp"],
  ["tragoToronja", "trago-toronja.webp"],
  ["tragoSour", "trago-sour.webp"],
  ["tragoAlbahaca", "trago-albahaca.webp"],
  ["vasoToronja", "vaso-toronja.webp"],
  ["vasoSour", "vaso-sour.webp"],
  ["vasoAlbahaca", "vaso-albahaca.webp"],
  ["ingToronja", "ing-toronja.webp"],
  ["ingRomero", "ing-romero.webp"],
  ["ingHielo", "ing-hielo.webp"],
  ["ingSirope", "ing-sirope.webp"],
  ["ingNaranja", "ing-naranja.webp"],
  ["ingClara", "ing-clara.webp"],
  ["ingAlbahaca", "ing-albahaca.webp"],
  ["ingLimon", "ing-limon.webp"],
  ["ingCanela", "ing-canela.webp"],
  ["ingJengibre", "ing-jengibre.webp"],
  ["ingFrambuesa", "ing-frambuesa.webp"],
  ["ingMenta", "ing-menta.webp"],
  ["ingCafe", "ing-cafe.webp"],
  ["ingDemerara", "ing-demerara.webp"],
  ["mixerZumoLimon", "mixer-zumo-limon.webp"],
  ["mixerSiropeAlbahaca", "mixer-sirope-albahaca.webp"],
  ["mixerZumoToronja", "mixer-zumo-toronja.webp"],
  ["mixerSiropeSimple", "mixer-sirope-simple.webp"],
  ["mixerBitterNaranja", "mixer-bitter-naranja.webp"],
  ["mixerAguaGas", "mixer-agua-gas.webp"],
  ["mixerSoda", "mixer-soda.webp"],
  ["ingCascara", "ing-cascara.webp"],
  ["ingAnis", "ing-anis.webp"],
];

// Cache-busting: el manifiesto emite las URLs como /img/archivo.webp?v=<hash>.
// Los archivos físicos NO cambian de nombre (Cache-Control: immutable en
// /img sigue sirviendo igual), solo cambia la query string cuando cambia el
// contenido, así el navegador/tótem deja de servir una versión vieja cacheada.
function shortHash(buf) {
  return createHash("md5").update(buf).digest("hex").slice(0, 8);
}

// Padding transparente INFERIOR de un webp con alpha, como fracción del alto
// (0..1). Replica exactamente el escaneo que Coverflow3D hacía en runtime
// (umbral alpha > 16, se busca desde abajo la primera fila con contenido) pero
// sobre el buffer de salida final, en tiempo de build. Devuelve null si la
// imagen no tiene canal alpha (no aplica anclaje). Así el coverflow puede
// anclar la base VISIBLE del item a la barra desde el primer frame, sin el
// canvas-scan asíncrono que provocaba el salto vertical al cargar.
async function padInferiorFrac(buf) {
  const meta = await sharp(buf).metadata();
  if (!meta.hasAlpha) return null;
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const aIdx = channels - 1; // último canal = alpha
  let filaContenido = height;
  for (let y = height - 1; y >= 0; y--) {
    let hay = false;
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + aIdx] > 16) {
        hay = true;
        break;
      }
    }
    if (hay) {
      filaContenido = y + 1;
      break;
    }
  }
  return Math.max(0, (height - filaContenido) / height);
}

async function run() {
  await mkdir(OUT, { recursive: true });

  const results = [];
  const hashes = {}; // nombre de archivo en public/img -> hash corto de su contenido
  const pads = {}; // nombre de archivo -> fracción de padding transparente inferior (solo webp con alpha)
  const dims = {}; // nombre de archivo -> { w, h } finales del webp (para fijar el layout sin depender del decode)

  for (const job of JOBS) {
    const outPath = path.join(OUT, job.out);
    const buf = await sharp(job.src)
      .resize({ height: job.height, withoutEnlargement: true })
      .webp({ quality: job.quality ?? 86 })
      .toBuffer();
    await writeFile(outPath, buf);
    hashes[job.out] = shortHash(buf);
    const frac = await padInferiorFrac(buf);
    if (frac != null) pads[job.out] = frac;
    const meta = await sharp(buf).metadata();
    dims[job.out] = { w: meta.width, h: meta.height };
    results.push(outPath);
  }

  for (const crop of CROPS) {
    const outPath = path.join(OUT, crop.out);
    // Nota: extract/extend/resize se materializan en buffers separados
    // (en vez de encadenar .extend().resize() en un solo pipeline) porque
    // esa combinación encadenada produce dimensiones incorrectas en esta
    // versión de sharp (el resize se calcula sobre el tamaño pre-extend).
    let buf = await sharp(crop.src).extract(crop.extract).png().toBuffer();
    if (crop.pad) {
      buf = await sharp(buf)
        .extend({ ...crop.pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    }
    // Sin withoutEnlargement: estos crops cuadrados (ya recortados a su
    // bbox real + pad) suelen quedar por debajo de los 400px objetivo, y
    // deben escalarse hacia arriba para quedar del mismo tamaño que el
    // resto de los tiles ing-*.
    const webpBuf = await sharp(buf)
      .resize({ height: crop.height })
      .webp({ quality: 86 })
      .toBuffer();
    await writeFile(outPath, webpBuf);
    hashes[crop.out] = shortHash(webpBuf);
    const frac = await padInferiorFrac(webpBuf);
    if (frac != null) pads[crop.out] = frac;
    const meta = await sharp(webpBuf).metadata();
    dims[crop.out] = { w: meta.width, h: meta.height };
    results.push(outPath);
  }

  // Copia el SVG del logo tal cual, sin procesar (el hash se calcula sobre
  // el contenido fuente, que es idéntico byte a byte al que queda copiado).
  const svgSrc = nd("logo brugal.svg");
  const svgOut = path.join(OUT, "logo-brugal.svg");
  await copyFile(svgSrc, svgOut);
  hashes["logo-brugal.svg"] = shortHash(await readFile(svgSrc));
  results.push(svgOut);

  // Iconos PWA: logo Brugal centrado sobre fondo navy (#0a1a3a = theme_color),
  // cuadrado, en 192 y 512. Van en public/ raíz (no en public/img, que se sirve
  // immutable) para que manifest.webmanifest los referencie como /icon-XXX.png.
  // Gitignoreados: se regeneran en cada build, igual que el resto del pipeline.
  const NAVY = { r: 10, g: 26, b: 58, alpha: 1 };
  const svgLogo = await readFile(svgSrc);
  for (const size of [192, 512]) {
    const inner = Math.round(size * 0.6); // logo al 60%: dentro de la zona segura maskable
    const logo = await sharp(svgLogo, { density: 512 })
      .resize(inner, inner, { fit: "inside" })
      .png()
      .toBuffer();
    const iconPath = path.join(ROOT, "public", `icon-${size}.png`);
    await sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
      .composite([{ input: logo, gravity: "center" }])
      .png()
      .toFile(iconPath);
    results.push(iconPath);
  }

  // Manifiesto tipado, con cache-busting por hash de contenido en cada URL.
  const lines = MANIFEST_KEYS.map(([key, file]) => {
    const hash = hashes[file];
    if (!hash) throw new Error(`Falta hash de cache-busting para ${file}`);
    return `  ${key}: "/img/${file}?v=${hash}",`;
  }).join("\n");
  // PAD_INFERIOR: fracción (0..1) del alto que es padding transparente inferior
  // de cada imagen con alpha, keyed por la MISMA URL con cache-busting que IMG.
  // Coverflow3D lo usa para anclar la base visible del item a la barra desde el
  // primer frame (antes se medía con un canvas-scan asíncrono → salto vertical).
  const padLines = MANIFEST_KEYS.filter(([, file]) => pads[file] != null)
    .map(([, file]) => {
      const hash = hashes[file];
      return `  "/img/${file}?v=${hash}": ${pads[file].toFixed(4)},`;
    })
    .join("\n");
  // DIMENSIONES: ancho/alto finales (px) de cada webp, keyed por la MISMA URL con
  // cache-busting que IMG. Permite fijar el tamaño de la caja del item SÍNCRONAMENTE
  // (sin esperar al decode del bitmap), evitando el "flick" de re-dimensionado.
  const dimLines = MANIFEST_KEYS.filter(([, file]) => dims[file])
    .map(([, file]) => {
      const hash = hashes[file];
      return `  "/img/${file}?v=${hash}": { w: ${dims[file].w}, h: ${dims[file].h} },`;
    })
    .join("\n");
  const manifestSrc = `// Generado por scripts/build-assets.mjs. No editar a mano.
export const IMG = {
${lines}
} as const;

export const ALL_IMAGES: string[] = Object.values(IMG);

export const PAD_INFERIOR: Record<string, number> = {
${padLines}
};

export const DIMENSIONES: Record<string, { w: number; h: number }> = {
${dimLines}
};
`;
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, manifestSrc, "utf8");

  // Tabla de tamaños + total.
  let total = 0;
  console.log("\nArchivo".padEnd(32) + "Tamaño");
  console.log("-".repeat(48));
  for (const file of results.sort()) {
    const { size } = await stat(file);
    total += size;
    console.log(path.basename(file).padEnd(32) + `${(size / 1024).toFixed(1)} KB`);
  }
  console.log("-".repeat(48));
  console.log(`Total: ${results.length} archivos, ${(total / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`\nManifiesto escrito en ${path.relative(ROOT, MANIFEST_PATH)}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
