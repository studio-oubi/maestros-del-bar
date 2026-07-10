// Genera los assets de stock/ (botellas de mezclas + 3 ingredientes
// nuevos/retocados) a partir de fuentes de legacy/assets, "New design ",
// fotos generadas con Gemini (Nano Banana Pro) y una única foto externa —
// todo documentado en stock/LICENCIAS.md. Se corre ANTES que
// build-assets.mjs (que solo empaqueta/optimiza lo que ya está en stock/ +
// legacy + New design).
//
// Uso: node scripts/build-stock.mjs  (o via npm run assets, que lo invoca primero)
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { relabelarBotella, muestrearColor } from "./lib/etiqueta-generica.mjs";
import { quitarFondoBlanco, recortarDesde } from "./lib/quitar-fondo.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const LEG = path.join(ROOT, "legacy/assets");
const ND = path.join(ROOT, "New design ");
const STOCK = path.join(ROOT, "stock");
const GEMINI = path.join(STOCK, "fuentes-gemini");
const leg = (n) => path.join(LEG, n);
const nd = (n) => path.join(ND, n);
const out = (n) => path.join(STOCK, n);
const gemini = (n) => path.join(GEMINI, n);

// Las 7 botellas de mezclas: primera pasada (commit 692312e) reetiquetaba
// fotos legacy con marca tapada a mano (ver historial de git para ese
// método, scripts/lib/etiqueta-generica.mjs). Esta pasada las REEMPLAZA con
// fotos de producto generadas con Gemini (Nano Banana Pro) — ya vienen con
// la etiqueta navy/oro correcta pintada por el modelo, fondo de estudio
// blanco — así que el trabajo acá es solo quitar ese fondo (ver
// lib/quitar-fondo.mjs) y dejarlas en el mismo nombre de archivo de salida
// para no tocar el manifiesto ni lib/recetas.ts.
const BOTELLAS_GEMINI = [
  "zumo-limon",
  "sirope-albahaca",
  "zumo-toronja",
  "sirope-simple",
  "bitter-naranja",
  "agua-gas",
  "soda",
];

// Criterio final del cliente (ronda de remate post-07feec8): por debajo de
// la línea de apoyo (la y donde la botella y su decoración tocan
// visualmente la barra) NO debe quedar NINGÚN píxel con alpha — ni sombra
// de contacto ni continua. quitarFondoBlanco por sí solo no garantiza esto
// (la sombra de piso, sobre todo cerca de fruta/hoja con color propio,
// puede fallar el umbral de color/textura por las mismas razones que un
// resto de marca — ver comentarios en quitar-fondo.mjs). Se probaron dos
// heurísticas automáticas para ubicar esa línea (conteo de textura por
// fila, corrida contigua de textura) y ambas fallan en zumo-limon porque el
// ruido de compresión bajo esa imagen tiene el mismo orden de magnitud que
// la textura real de la fruta vecina — no hay separación limpia. Se mide la
// línea a mano por imagen: última fila con color realmente saturado
// (sat>55, no la sombra tibia) del objeto o su decoración, con margen
// chico, usando el mismo método de esta sesión (grilla de coordenadas +
// muestreo de píxeles del canal alpha, no a ojo). soda no tiene color
// saturado (vidrio transparente) — se usó en cambio la fila donde la
// corrida de alpha denso cae a cero de forma natural (ya venía limpia).
const LINEA_APOYO = {
  "zumo-limon": 1100,
  "sirope-albahaca": 1152,
  "zumo-toronja": 1190,
  "sirope-simple": 1183,
  "bitter-naranja": 1129,
  "agua-gas": 1167,
  soda: 1196,
};

async function buildBotellasGemini() {
  for (const nombre of BOTELLAS_GEMINI) {
    let buf = await quitarFondoBlanco(gemini(`${nombre}.png`));
    buf = await recortarDesde(buf, { y: LINEA_APOYO[nombre] });
    await writeFile(out(`mixer-${nombre}.png`), buf);
    console.log("stock:", `mixer-${nombre}.png`, "(gemini, fondo quitado)");
  }
}

// ing-cascara: recorta el twist de naranja del borde del vaso en New
// design/sour.png (asset propio del cliente, cero riesgo de licencia). Bbox
// ajustado bien ceñido al rulo principal (poca espuma/vidrio visible, solo
// un filo mínimo abajo a la derecha) — más chico dentro del tile a cambio de
// no traer el borde del vaso.
async function buildCascara() {
  const extract = { left: 838, top: 698, width: 412, height: 206 };
  let buf = await sharp(nd("sour.png")).extract(extract).png().toBuffer();
  buf = await sharp(buf)
    .extend({ top: 103, bottom: 103, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await writeFile(out("ing-cascara.png"), buf);
  console.log("stock: ing-cascara.png");
}

// ing-anis: recorta 2-3 estrellas limpias de la foto de anís estrellado
// (Wikimedia Commons, Dominio Público — ver LICENCIAS.md) y le sube
// exposición/contraste: el original es una macro muy oscura/de sombras
// densas, ilegible como medallón chico. gamma() abre las sombras sin
// quemar las luces, modulate() sube brillo/saturación encima. Es una foto
// (JPEG opaco, sin alpha) de un montón de anís, no un cutout con matte real,
// así que NO hay separación de sujeto/fondo pixel-perfecta disponible aquí
// (no hay herramienta de segmentación en este entorno): se recorta bien
// ajustado a la estrella más clara y se agrega un margen transparente
// alrededor para que la tile "flote" como el resto de ing-*, pero el área
// fotográfica en sí queda opaca (igual que la mayoría de los ing-* que ya
// existen, p.ej. ing-canela/ing-frambuesa).
async function buildAnis() {
  const src = out("_fuentes/star-aniseed-pd.jpg");
  const extract = { left: 2020, top: 1060, width: 420, height: 420 };
  // gamma+modulate solos no abrían lo suficiente las sombras (la foto fuente
  // es una macro plana/pareja, sin zona claramente más iluminada para
  // recortar en su lugar — se probó buscar otra zona del original y toda la
  // pila está igual de oscura). normalize() estira el histograma del propio
  // recorte antes de aplicar gamma/saturación, y ahí sí se lee nítido como
  // anís estrellado a tamaño de medallón chico (verificado con simulación a
  // 75x75 reescalada).
  let buf = await sharp(src)
    .extract(extract)
    .normalize()
    .gamma(1.4)
    .modulate({ brightness: 1.35, saturation: 1.35 })
    .png()
    .toBuffer();
  buf = await sharp(buf)
    .extend({ top: 40, bottom: 40, left: 40, right: 40, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await writeFile(out("ing-anis.png"), buf);
  console.log("stock: ing-anis.png");
}

// Bonus: ing-demerara (asset legacy YA existente) tiene un óvalo rojo con el
// logo "Shamrock" impreso en la bolsa. Se despinta con el color crema de la
// bolsa (muestreado) igual que las bandas del cartón — parche elíptico, sin
// tocar el texto "Demerara Sugar" (ese describe el ingrediente, no es marca).
// El óvalo real del logo (medido con máscara de color rojo, no a ojo) es
// bastante más chico de lo que parecía: x~69-209, y~69-153. Un parche más
// grande invadía la franja "Quality Ingredients"/"Demerara Sugar" de abajo
// (que es color distinto al de la bolsa arriba) y se veía pegado/cortando
// texto — con este tamaño el parche queda contenido en la zona crema de
// arriba, sin tocar la franja marrón.
async function buildDemerara() {
  const src = leg("ing-demerara.png");
  const crema = await muestrearColor(src, { x: 30, y: 80, w: 6, h: 6 });
  const rects = [{ x: 63, y: 60, w: 152, h: 100, color: crema, shape: "ellipse" }];
  const buf = await relabelarBotella(src, rects, { factor: 3 });
  await writeFile(out("ing-demerara.png"), buf);
  console.log("stock: ing-demerara.png");
}

const LICENCIAS_MD = `# Licencias de assets externos en stock/

Todo el resto de stock/ sale de fuentes YA propiedad del cliente (legacy/assets,
"New design "/, o generadas para el cliente con Gemini) — recortes de sus
propios renders o fotos de producto generadas por nosotros. Este archivo
documenta el ÚNICO asset externo usado en el juego.

## stock/fuentes-gemini/*.png → stock/mixer-*.png (7 botellas de mezclas)

Fotos de producto generadas con Gemini (Nano Banana Pro) por nosotros para
este proyecto — sin restricción de terceros, uso exclusivo del cliente. Cada
una viene con la etiqueta navy/oro (\`#0a1a3a\` / \`#c9a84c\`) y el texto de la
mezcla ya generados por el modelo, sobre fondo de estudio blanco; el fondo se
quita con \`scripts/lib/quitar-fondo.mjs\` (flood-fill + detección de textura,
sin herramientas externas) antes de empaquetar. Reemplazan a las botellas
reetiquetadas a mano de la primera pasada (ver commit 692312e para ese
método, que sigue disponible en scripts/lib/etiqueta-generica.mjs y se usa
para ing-demerara más abajo).

- zumo-limon.png → mixer-zumo-limon.png (ZUMO DE LIMÓN)
- sirope-albahaca.png → mixer-sirope-albahaca.png (SIROPE DE ALBAHACA)
- zumo-toronja.png → mixer-zumo-toronja.png (ZUMO DE TORONJA)
- sirope-simple.png → mixer-sirope-simple.png (SIROPE SIMPLE)
- bitter-naranja.png → mixer-bitter-naranja.png (BITTER DE NARANJA)
- agua-gas.png → mixer-agua-gas.png (AGUA CON GAS)
- soda.png → mixer-soda.png (SODA)

## stock/_fuentes/star-aniseed-pd.jpg → stock/ing-anis.png

- **Título**: "Star aniseed.jpg"
- **Fuente**: Wikimedia Commons
- **URL**: https://commons.wikimedia.org/wiki/File:Star_aniseed.jpg
- **URL directa del archivo**: https://upload.wikimedia.org/wikipedia/commons/a/a9/Star_aniseed.jpg
- **Licencia**: Dominio Público (Public Domain) — sin atribución obligatoria, uso comercial permitido.
- **Uso en el juego**: recorte cuadrado de 2-3 piezas de anís estrellado
  (con exposición/contraste subidos para que se lea como medallón chico),
  \`stock/ing-anis.png\`, empaquetado como \`public/img/ing-anis.webp\` por
  scripts/build-assets.mjs. Ingrediente "ANÍS" del grid de Completa.
`;

async function run() {
  await mkdir(STOCK, { recursive: true });
  await buildBotellasGemini();
  await buildCascara();
  await buildAnis();
  await buildDemerara();
  await writeFile(path.join(STOCK, "LICENCIAS.md"), LICENCIAS_MD, "utf8");
  console.log("LICENCIAS.md escrito");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
