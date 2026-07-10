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
import { quitarFondoNavy, recortarDesde } from "./lib/quitar-fondo.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const LEG = path.join(ROOT, "legacy/assets");
const STOCK = path.join(ROOT, "stock");
const GEMINI = path.join(STOCK, "fuentes-gemini");
const leg = (n) => path.join(LEG, n);
const out = (n) => path.join(STOCK, n);
const gemini = (n) => path.join(GEMINI, n);

// Las 7 botellas de mezclas: primera pasada (commit 692312e) reetiquetaba
// fotos legacy con marca tapada a mano; segunda pasada (fondo blanco,
// quitarFondoBlanco) generó fotos de producto con Gemini pero con etiqueta
// dorada sobre navy y fondo de estudio blanco. Esta tercera pasada (v2) las
// REEMPLAZA con un nuevo set: mismo esqueleto de foto de producto, pero
// fondo de estudio NAVY (~#0a1a3a, igual al fondo de la app) y etiqueta azul
// con texto blanco condensado grande — a pedido del cliente, porque el
// vidrio transparente ya refracta azul y así cualquier resto de recorte
// queda invisible sobre la app. El trabajo acá es solo quitar ese fondo (ver
// quitarFondoNavy en lib/quitar-fondo.mjs, que keyea por distancia de color
// en vez de luminancia) y dejarlas en el mismo nombre de archivo de salida
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

// Criterio final del cliente (vigente desde la ronda post-07feec8, re-medido
// para el set v2 navy): por debajo de la línea de apoyo (la y donde la
// botella y su decoración tocan visualmente la barra) NO debe quedar NINGÚN
// píxel con alpha — ni sombra de contacto ni continua. quitarFondoNavy por
// sí sola deja el fondo prácticamente limpio (el set v2 casi no trae sombra,
// y lo que hay es azul sobre azul), pero cada base se remató con
// recortarDesde para garantizar cero alpha por debajo — medido a mano por
// imagen con el mismo método de esta sesión: distancia de color contra el
// navy local interpolado (dist>90 = color de objeto real, no sombra/fondo),
// grilla de coordenadas + muestreo de píxeles, no a ojo.
const LINEA_APOYO = {
  "zumo-limon": 1145,
  "sirope-albahaca": 1121,
  "zumo-toronja": 1106,
  "sirope-simple": 1134,
  "bitter-naranja": 1046,
  "agua-gas": 1139,
  soda: 1092,
};

// soda: la única de las 7 con una sombra proyectada al COSTADO (no debajo)
// de la base — recortarDesde no la alcanza (es un corte horizontal). Se
// resuelve subiendo el umbral de distancia de color solo para esta imagen
// (30→60): a esa distancia la sombra (dist ~25-35 del navy esperado) cae
// del lado "es fondo" sin comerse ningún reflejo/contenido real de la
// botella (verificado con zoom en la base y en los reflejos del vidrio).
const UMBRAL_COLOR = { soda: 60 };

async function buildBotellasGemini() {
  for (const nombre of BOTELLAS_GEMINI) {
    let buf = await quitarFondoNavy(gemini(`${nombre}.png`), {
      umbralColor: UMBRAL_COLOR[nombre] ?? 30,
    });
    buf = await recortarDesde(buf, { y: LINEA_APOYO[nombre] });
    await writeFile(out(`mixer-${nombre}.png`), buf);
    console.log("stock:", `mixer-${nombre}.png`, "(gemini v2 navy, fondo quitado)");
  }
}

// ing-cascara / ing-albahaca (v2): primera pasada recortaba el twist de
// naranja del borde del vaso en New design/sour.png y un par de hojas de
// basir.png, con pad transparente para cuadrar el tile — quedaban como
// medallón translúcido, igual que el resto de ing-*. Esta pasada las
// REEMPLAZA con fotos de producto generadas con Gemini directo sobre el
// mismo navy exacto del círculo del medallón (#0a1a3a) — a pedido del
// cliente, que quiere estos 2 tiles "llenos" en vez de translúcidos: "ponle
// ese mismo fondo azul del círculo para que no tengas que recortarlo". Ya
// vienen cuadradas 1:1 y encuadradas, así que el trabajo acá es SOLO
// convertir a PNG (llegan en JPEG) — sin recorte, sin pad alfa, full-bleed.
async function buildCascara() {
  const buf = await sharp(gemini("ing-cascara.png")).png().toBuffer();
  await writeFile(out("ing-cascara.png"), buf);
  console.log("stock: ing-cascara.png (gemini v2 navy, full-bleed)");
}

async function buildAlbahaca() {
  const buf = await sharp(gemini("ing-albahaca.png")).png().toBuffer();
  await writeFile(out("ing-albahaca.png"), buf);
  console.log("stock: ing-albahaca.png (gemini v2 navy, full-bleed)");
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
una viene con la etiqueta azul y texto blanco condensado grande ya generados
por el modelo, sobre fondo de estudio NAVY (\`#0a1a3a\`, igual al fondo de la
app); el fondo se quita con \`quitarFondoNavy\` en
\`scripts/lib/quitar-fondo.mjs\` (flood-fill + detección de textura + key por
distancia de color al navy, sin herramientas externas) antes de empaquetar.
Reemplazan al set v1 de fondo blanco/etiqueta dorada, que a su vez reemplazó
a las botellas reetiquetadas a mano de la primera pasada (ver commit 692312e
para ese método, que sigue disponible en scripts/lib/etiqueta-generica.mjs y
se usa para ing-demerara más abajo).

- zumo-limon.png → mixer-zumo-limon.png (ZUMO DE LIMÓN)
- sirope-albahaca.png → mixer-sirope-albahaca.png (SIROPE DE ALBAHACA)
- zumo-toronja.png → mixer-zumo-toronja.png (ZUMO DE TORONJA)
- sirope-simple.png → mixer-sirope-simple.png (SIROPE SIMPLE)
- bitter-naranja.png → mixer-bitter-naranja.png (BITTER DE NARANJA)
- agua-gas.png → mixer-agua-gas.png (AGUA CON GAS)
- soda.png → mixer-soda.png (SODA)

## stock/fuentes-gemini/ing-cascara.png, ing-albahaca.png → stock/ing-{cascara,albahaca}.png

Mismo origen (Gemini, uso exclusivo del cliente) que las 7 botellas de arriba,
pero fotografiadas cuadradas 1:1 directo sobre el navy exacto del círculo del
medallón del grid COMPLETA (\`#0a1a3a\`) — full-bleed, sin recorte ni pad
alfa, a pedido del cliente. Reemplazan a los recortes con pad transparente de
sour.png/basir.png de la primera pasada.

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
  await buildAlbahaca();
  await buildAnis();
  await buildDemerara();
  await writeFile(path.join(STOCK, "LICENCIAS.md"), LICENCIAS_MD, "utf8");
  console.log("LICENCIAS.md escrito");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
