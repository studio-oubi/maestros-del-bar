// Genera los assets de stock/ (botellas relabeladas sin marca + 2 ingredientes
// nuevos) a partir de fuentes de legacy/assets, "New design " y una única foto
// externa documentada en stock/LICENCIAS.md. Se corre ANTES que build-assets.mjs
// (que solo empaqueta/optimiza lo que ya está en stock/ + legacy + New design).
//
// Uso: node scripts/build-stock.mjs  (o via npm run assets, que lo invoca primero)
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { relabelarBotella } from "./lib/etiqueta-generica.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const LEG = path.join(ROOT, "legacy/assets");
const ND = path.join(ROOT, "New design ");
const STOCK = path.join(ROOT, "stock");
const leg = (n) => path.join(LEG, n);
const nd = (n) => path.join(ND, n);
const out = (n) => path.join(STOCK, n);

// Rects medidos a mano sobre cada fuente (overlay de grilla, igual método que
// las CROPS de build-assets.mjs) para tapar la etiqueta de marca real, sin
// adivinar. Coordenadas nativas (pre-upscale) de cada PNG legacy.
const BOTELLAS = [
  {
    // Tropical Sun Lime Juice (verde, plástico): banda amarilla + "LIME JUICE"
    // + foto de limones, mitad inferior de la botella (y~222-400 de 420).
    src: leg("mixer-limon.png"),
    out: out("mixer-zumo-limon.png"),
    rects: [{ x: 3, y: 222, w: 100, h: 178, r: 14, nombre: "ZUMO DE LIMÓN" }],
  },
  {
    // Fentimans Ginger Ale: óvalo de etiqueta en el cuerpo (y~250-398 de 420).
    src: leg("mixer-ginger.png"),
    out: out("mixer-sirope-albahaca.png"),
    rects: [{ x: 9, y: 250, w: 108, h: 165, r: 36, nombre: "SIROPE DE ALBAHACA" }],
  },
  {
    // Cartón "the berry company" Cranberry: casi toda la cara frontal está
    // impresa (banda roja arriba, marca, ilustración, "1 Litre", banda roja
    // abajo), así que se tapa casi toda la altura (y~18-413 de 420).
    src: leg("mixer-arandano.png"),
    out: out("mixer-zumo-toronja.png"),
    rects: [{ x: 14, y: 18, w: 150, h: 395, r: 14, nombre: "ZUMO DE TORONJA" }],
  },
  {
    // Frasco de miel "South Burnett Honey": etiqueta circular centrada
    // (centro ~170,215 radio ~112 de un frasco de 356x420).
    src: leg("ing-syrup.png"),
    out: out("mixer-sirope-simple.png"),
    rects: [{ x: 58, y: 103, w: 224, h: 224, r: 112, nombre: "SIROPE SIMPLE" }],
  },
  {
    // Angostura aromatic bitters: hay DOS zonas de marca — el sello rojo
    // pequeño en el cuello justo debajo de la tapa amarilla (y~78-166) y la
    // etiqueta blanca grande del cuerpo (y~178-403). Se tapan juntas con un
    // solo rectángulo alto (y~78-404 de 420) para no dejar ningún resto.
    src: leg("ing-angostura.png"),
    out: out("mixer-bitter-naranja.png"),
    rects: [{ x: 6, y: 58, w: 112, h: 346, r: 12, nombre: "BITTER DE NARANJA" }],
  },
  {
    // Perrier: óvalo principal "SOURCE perrier BOTTLED AT SOURCE VERGÈZE
    // FRANCE" (y~335-605) + óvalo chico inferior con código de barras
    // (y~725-845), de una botella de 325x900. Dos rects, la tapa dorada no
    // tiene texto legible (verificado a resolución nativa) así que no se toca.
    src: leg("mixer-perrier.png"),
    out: out("mixer-agua-gas.png"),
    rects: [
      { x: 10, y: 293, w: 305, h: 312, r: 50, nombre: "AGUA CON GAS" },
      { x: 0, y: 725, w: 325, h: 120, r: 20, nombre: "" },
    ],
  },
  {
    // Schweppes Indian Tonic Water: el logo "Schweppes" está grabado en
    // relieve en el PET (fantasma translúcido) POR ENCIMA de la etiqueta
    // impresa — hay que tapar ambas cosas, así que es un solo rect alto
    // (y~143-403 de 420) que cubre relieve + etiqueta impresa.
    src: leg("mixer-tonica.png"),
    out: out("mixer-soda.png"),
    rects: [{ x: 2, y: 143, w: 115, h: 275, r: 14, nombre: "SODA" }],
  },
];

async function buildBotellas() {
  for (const b of BOTELLAS) {
    const buf = await relabelarBotella(b.src, b.rects, { factor: b.src.includes("perrier") ? 2 : 3 });
    await writeFile(b.out, buf);
    console.log("stock:", path.basename(b.out));
  }
}

// ing-cascara: recorta el twist de naranja del borde del vaso en New
// design/sour.png (asset propio del cliente, cero riesgo de licencia). El
// PNG fuente tiene alpha real (fondo transparente fuera del trago), así que
// el recorte sale con transparencia real donde no hay foam/vaso/twist.
// bbox medido a mano con grilla: el twist (dos rulos) va de x845-1310,
// y700-1090 sobre una imagen de 1536x2752. Se recorta un poco más generoso
// y se cuadra con pad transparente arriba/abajo.
async function buildCascara() {
  const extract = { left: 840, top: 695, width: 470, height: 395 };
  let buf = await sharp(nd("sour.png")).extract(extract).png().toBuffer();
  buf = await sharp(buf)
    .extend({ top: 38, bottom: 38, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await writeFile(out("ing-cascara.png"), buf);
  console.log("stock: ing-cascara.png");
}

// ing-anis: recorta 2-3 estrellas limpias de la foto de anís estrellado
// (Wikimedia Commons, Dominio Público — ver LICENCIAS.md). Es una foto
// (JPEG opaco, sin alpha) de un montón de anís, no un cutout con matte real,
// así que NO hay separación de sujeto/fondo pixel-perfecta disponible aquí
// (no hay herramienta de segmentación en este entorno): se recorta bien
// ajustado a la estrella más limpia y se agrega un margen transparente
// alrededor para que la tile "flote" como el resto de ing-*, pero el área
// fotográfica en sí queda opaca (igual que la mayoría de los ing-* que ya
// existen, p.ej. ing-canela/ing-demerara/ing-frambuesa).
async function buildAnis() {
  const src = out("_fuentes/star-aniseed-pd.jpg");
  const extract = { left: 1980, top: 1030, width: 520, height: 520 };
  let buf = await sharp(src).extract(extract).png().toBuffer();
  buf = await sharp(buf)
    .extend({ top: 40, bottom: 40, left: 40, right: 40, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await writeFile(out("ing-anis.png"), buf);
  console.log("stock: ing-anis.png");
}

const LICENCIAS_MD = `# Licencias de assets externos en stock/

Todo el resto de stock/ sale de fuentes YA propiedad del cliente (legacy/assets
y "New design "/) — botellas relabeladas o recortes de sus propios renders.
Este archivo documenta el ÚNICO asset externo usado en el juego.

## stock/_fuentes/star-aniseed-pd.jpg → stock/ing-anis.png

- **Título**: "Star aniseed.jpg"
- **Fuente**: Wikimedia Commons
- **URL**: https://commons.wikimedia.org/wiki/File:Star_aniseed.jpg
- **URL directa del archivo**: https://upload.wikimedia.org/wikipedia/commons/a/a9/Star_aniseed.jpg
- **Licencia**: Dominio Público (Public Domain) — sin atribución obligatoria, uso comercial permitido.
- **Uso en el juego**: recorte cuadrado de 2-3 piezas de anís estrellado,
  \`stock/ing-anis.png\`, empaquetado como \`public/img/ing-anis.webp\` por
  scripts/build-assets.mjs. Ingrediente "ANÍS" del grid de Completa.
`;

async function run() {
  await mkdir(STOCK, { recursive: true });
  await buildBotellas();
  await buildCascara();
  await buildAnis();
  await writeFile(path.join(STOCK, "LICENCIAS.md"), LICENCIAS_MD, "utf8");
  console.log("LICENCIAS.md escrito");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
