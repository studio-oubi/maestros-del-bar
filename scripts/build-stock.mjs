// Genera los assets de stock/ (botellas relabeladas sin marca + 3 ingredientes
// nuevos/retocados) a partir de fuentes de legacy/assets, "New design " y una
// única foto externa documentada en stock/LICENCIAS.md. Se corre ANTES que
// build-assets.mjs (que solo empaqueta/optimiza lo que ya está en stock/ +
// legacy + New design).
//
// Uso: node scripts/build-stock.mjs  (o via npm run assets, que lo invoca primero)
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { relabelarBotella, muestrearColor } from "./lib/etiqueta-generica.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const LEG = path.join(ROOT, "legacy/assets");
const ND = path.join(ROOT, "New design ");
const STOCK = path.join(ROOT, "stock");
const leg = (n) => path.join(LEG, n);
const nd = (n) => path.join(ND, n);
const out = (n) => path.join(STOCK, n);

// Rects medidos a mano sobre cada fuente (overlay de grilla, igual método que
// las CROPS de build-assets.mjs) para tapar la etiqueta de marca real, sin
// adivinar. Coordenadas nativas (pre-upscale) de cada PNG legacy. Cada
// resultado se recorta además a la silueta ORIGINAL de la botella (ver
// relabelarBotella) para que ninguna etiqueta sobresalga del contorno.
const BOTELLAS = [
  {
    // Tropical Sun Lime Juice (verde, plástico): banda amarilla + "LIME JUICE"
    // + foto de limones, mitad inferior de la botella (y~222-400 de 420).
    src: leg("mixer-limon.png"),
    out: out("mixer-zumo-limon.png"),
    rects: [{ x: 3, y: 222, w: 100, h: 178, r: 14, nombre: "ZUMO DE LIMÓN" }],
  },
  {
    // Fentimans Ginger Ale: el óvalo de etiqueta empieza más arriba de lo que
    // parece a simple vista — "SERVE CHILLED" y las puntas de "FENTIMAN'S"
    // arrancan en y~228 (medido con grilla 5x). Con y=250 quedaban letras de
    // "...NTIMA..." asomando arriba; con y=228 pero radio de esquina grande
    // (r=30) TODAVÍA quedaba un triángulo de "...ERVE CHILLE..." asomando en
    // las esquinas redondeadas (verificado con inspección de píxeles, no solo
    // a ojo). Con radio chico (r=12) el borde de arriba queda casi recto de
    // punta a punta y cubre todo.
    src: leg("mixer-ginger.png"),
    out: out("mixer-sirope-albahaca.png"),
    rects: [{ x: 6, y: 220, w: 114, h: 195, r: 12, nombre: "SIROPE DE ALBAHACA" }],
  },
  {
    // Cartón "the berry company" Cranberry: la cara frontal es casi 100%
    // impresa (banda roja arriba y1-para de 5, blanco impreso al medio, roja
    // abajo — límites medidos por muestreo de color, no a ojo). En vez de
    // taparlo todo con una sola losa navy (se veía como un bloque sin forma),
    // se despinta cada banda a su color base real (muestreado) y se pone la
    // etiqueta como un INSET navy centrado en la banda blanca, con margen
    // visible arriba/abajo/lados para que se siga leyendo el envase.
    src: leg("mixer-arandano.png"),
    out: out("mixer-zumo-toronja.png"),
    rects: null, // se arma a mano en buildArandano() (necesita muestreo de color)
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
    // solo rectángulo alto (y~58-404 de 420) para no dejar ningún resto.
    src: leg("ing-angostura.png"),
    out: out("mixer-bitter-naranja.png"),
    rects: [{ x: 6, y: 58, w: 112, h: 346, r: 12, nombre: "BITTER DE NARANJA" }],
  },
  {
    // Perrier: óvalo principal "SOURCE perrier BOTTLED AT SOURCE VERGÈZE
    // FRANCE" (y~293-605) + óvalo chico inferior con código de barras
    // (y~725-845) + la tapa dorada, que SÍ tiene texto grabado legible
    // ("L17" y otro código parcial, medido con grilla) pese a no tener el
    // wordmark — se tapa con un tercer parche estilo etiqueta (sin texto).
    src: leg("mixer-perrier.png"),
    out: out("mixer-agua-gas.png"),
    rects: [
      { x: 80, y: 5, w: 165, h: 228, r: 40, nombre: "" },
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
    if (!b.rects) continue; // arandano se arma aparte
    const buf = await relabelarBotella(b.src, b.rects, { factor: b.src.includes("perrier") ? 2 : 3 });
    await writeFile(b.out, buf);
    console.log("stock:", path.basename(b.out));
  }
}

// Cartón de arándano → ZUMO DE TORONJA: despinta cada banda a su color base
// real (muestreado con sharp, no a ojo) y pone la etiqueta como un inset
// centrado en la banda blanca, con margen visible a los 4 lados. Así el
// cartón conserva su forma reconocible (banda roja / blanca / roja) en vez
// de quedar una losa navy sin silueta.
async function buildArandano() {
  const src = leg("mixer-arandano.png");
  const rojo = await muestrearColor(src, { x: 138, y: 48, w: 6, h: 6 });
  const crema = await muestrearColor(src, { x: 138, y: 118, w: 6, h: 6 });
  const rects = [
    // bandas despintadas a su color base (sin borde, sin texto)
    { x: 8, y: 16, w: 165, h: 100, color: rojo }, // banda roja superior ("the berry company")
    { x: 8, y: 106, w: 165, h: 250, color: crema }, // cuerpo blanco (badge+Cranberry+ilustración+"1 Litre")
    { x: 8, y: 348, w: 165, h: 68, color: rojo }, // banda roja inferior (importado/barcode)
    // etiqueta navy como INSET dentro de la banda blanca, con margen visible
    { x: 34, y: 152, w: 112, h: 168, r: 14, nombre: "ZUMO DE TORONJA" },
  ];
  const buf = await relabelarBotella(src, rects, { factor: 3 });
  await writeFile(out("mixer-zumo-toronja.png"), buf);
  console.log("stock: mixer-zumo-toronja.png");
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

Todo el resto de stock/ sale de fuentes YA propiedad del cliente (legacy/assets
y "New design "/) — botellas relabeladas o recortes de sus propios renders.
Este archivo documenta el ÚNICO asset externo usado en el juego.

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
  await buildBotellas();
  await buildArandano();
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
