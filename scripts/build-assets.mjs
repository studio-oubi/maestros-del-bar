// Pipeline de assets: convierte los PNG pesados de "New design " y legacy/assets
// a WebP optimizado en public/img/, y genera el manifiesto tipado lib/asset-manifest.ts.
//
// Uso: npm run assets

import sharp from "sharp";
import { mkdir, copyFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ND = path.join(ROOT, "New design "); // ojo: espacio final en el nombre real
const LEG = path.join(ROOT, "legacy/assets");
const OUT = path.join(ROOT, "public/img");
const MANIFEST_PATH = path.join(ROOT, "lib/asset-manifest.ts");

const nd = (name) => path.join(ND, name);
const leg = (name) => path.join(LEG, name);

// out: nombre de archivo en public/img; src: ruta absoluta de origen; height: alto máx de resize.
const JOBS = [
  { out: "background.webp", src: nd("Background.png"), height: 1920 },
  { out: "barra.webp", src: nd("Barra.png"), height: 1200 },
  { out: "escapate.webp", src: nd("Escapate a lo extra ordinario.png"), height: 300 },
  { out: "mix-challenge-logo.webp", src: nd("Mix Challenge Logo.png"), height: 500 },
  { out: "home-doble.webp", src: nd("Home Doble.png"), height: 1100 },
  { out: "home-extraviejo.webp", src: nd("Home Extra Viejo.png"), height: 1100 },
  { out: "home-triple.webp", src: nd("Home Triple Reserva.png"), height: 1100 },
  { out: "ron-doble.webp", src: nd("Doble Reserva.png"), height: 900 },
  { out: "ron-triple.webp", src: nd("Triple reserva.png"), height: 900 },
  { out: "ron-extraviejo.webp", src: nd("Extraviejo.png"), height: 900 },
  { out: "trago-toronja.webp", src: nd("toronja.png"), height: 700 },
  { out: "trago-sour.webp", src: nd("sour.png"), height: 700 },
  { out: "trago-albahaca.webp", src: nd("basir.png"), height: 700 },
  { out: "vaso-toronja.webp", src: nd("toronja glas.png"), height: 700 },
  { out: "vaso-sour.webp", src: nd("sour glass.png"), height: 700 },
  { out: "vaso-albahaca.webp", src: nd("basir glass.png"), height: 700 },
  { out: "mixer-perrier.webp", src: leg("mixer-perrier.png"), height: 700 },
  { out: "mixer-limon.webp", src: leg("mixer-limon.png"), height: 700 },
  { out: "mixer-tonica.webp", src: leg("mixer-tonica.png"), height: 700 },
  { out: "mixer-ginger.webp", src: leg("mixer-ginger.png"), height: 700 },
  { out: "mixer-arandano.webp", src: leg("mixer-arandano.png"), height: 700 },
  { out: "ing-romero.webp", src: leg("ing-romero.png"), height: 400 },
  { out: "ing-hielo.webp", src: leg("ing-hielo.png"), height: 400 },
  { out: "ing-naranja.webp", src: leg("ing-naranja.png"), height: 400 },
  { out: "ing-clara.webp", src: leg("ing-clara.png"), height: 400 },
  { out: "ing-canela.webp", src: leg("ing-canela.png"), height: 400 },
  { out: "ing-jengibre.webp", src: leg("ing-jengibre.png"), height: 400 },
  { out: "ing-frambuesa.webp", src: leg("ing-frambuesa.png"), height: 400 },
  { out: "ing-menta.webp", src: leg("ing-menta.png"), height: 400 },
  { out: "ing-angostura.webp", src: leg("ing-angostura.png"), height: 400 },
  { out: "ing-cafe.webp", src: leg("ing-cafe.png"), height: 400 },
  { out: "ing-demerara.webp", src: leg("ing-demerara.png"), height: 400 },
  { out: "ing-sirope.webp", src: leg("ing-syrup.png"), height: 400 },
];

// Tiles derivados: recorte (extract) sobre la imagen fuente a tamaño original,
// luego resize a `height`, fondo transparente conservado.
//
// Coordenadas medidas a mano: se generó un preview escalado de cada fuente
// (sips -Z 600 / sharp resize) y se iteró el recorte hasta obtener un tile
// presentable (sin bordes de vaso, sin fruta cortada), verificando cada
// iteración con Read sobre el WebP resultante.
//
// toronja.png y basir.png son 1536x2752. En ambos, el garnish (cuña de
// toronja / albahaca+limón) está en el tercio superior de la imagen.
const CROPS = [
  {
    // Cuña de toronja: zona superior-izquierda del garnish, por encima del borde del vaso.
    out: "ing-toronja.webp",
    src: nd("toronja.png"),
    extract: { left: 300, top: 565, width: 560, height: 285 },
    height: 400,
  },
  {
    // Ramillete de albahaca: hojas en la zona superior del garnish, justo sobre el borde dorado del vaso.
    out: "ing-albahaca.webp",
    src: nd("basir.png"),
    extract: { left: 305, top: 705, width: 530, height: 165 },
    height: 400,
  },
  {
    // Rodaja de limón: zona superior-derecha del garnish, flotando en el trago.
    out: "ing-limon.webp",
    src: nd("basir.png"),
    extract: { left: 790, top: 1090, width: 330, height: 370 },
    height: 400,
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
  ["mixerPerrier", "mixer-perrier.webp"],
  ["mixerLimon", "mixer-limon.webp"],
  ["mixerTonica", "mixer-tonica.webp"],
  ["mixerGinger", "mixer-ginger.webp"],
  ["mixerArandano", "mixer-arandano.webp"],
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
  ["ingAngostura", "ing-angostura.webp"],
  ["ingCafe", "ing-cafe.webp"],
  ["ingDemerara", "ing-demerara.webp"],
];

async function run() {
  await mkdir(OUT, { recursive: true });

  const results = [];

  for (const job of JOBS) {
    const outPath = path.join(OUT, job.out);
    await sharp(job.src)
      .resize({ height: job.height, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outPath);
    results.push(outPath);
  }

  for (const crop of CROPS) {
    const outPath = path.join(OUT, crop.out);
    await sharp(crop.src)
      .extract(crop.extract)
      .resize({ height: crop.height, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outPath);
    results.push(outPath);
  }

  // Copia el SVG del logo tal cual, sin procesar.
  const svgOut = path.join(OUT, "logo-brugal.svg");
  await copyFile(nd("logo brugal.svg"), svgOut);
  results.push(svgOut);

  // Manifiesto tipado.
  const lines = MANIFEST_KEYS.map(([key, file]) => `  ${key}: "/img/${file}",`).join("\n");
  const manifestSrc = `// Generado por scripts/build-assets.mjs. No editar a mano.
export const IMG = {
${lines}
} as const;

export const ALL_IMAGES: string[] = Object.values(IMG);
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
