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
import { recortarDesde } from "./lib/quitar-fondo.mjs";

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
// dorada sobre fondo de estudio blanco; tercera pasada (v2, quitarFondoNavy)
// las regeneró sobre fondo de estudio navy con recorte automático por
// distancia de color. Esta CUARTA pasada las REEMPLAZA con el set final:
// Oscar recortó las 7 A MANO en Photoshop (canal alpha real, no fondo
// fotografiado) — calidad de recorte manual > flood-fill automático, así que
// el trabajo acá es SOLO respetar ese alpha tal cual (ni tocar los canales
// de color ni volver a correr quitarFondoNavy encima, que asumiría fondo
// opaco y rompería el matte). Mismos nombres de archivo de salida para no
// tocar el manifiesto ni lib/recetas.ts.
const BOTELLAS_GEMINI = [
  "zumo-limon",
  "sirope-albahaca",
  "zumo-toronja",
  "sirope-simple",
  "bitter-naranja",
  "agua-gas",
  "soda",
];

// Criterio final del cliente (vigente desde la ronda post-07feec8): por
// debajo de la línea de apoyo (la y donde la botella toca visualmente la
// barra) NO debe quedar NINGÚN píxel con alpha. Verificado por imagen
// (escaneo de la fila de alpha más baja + búsqueda de fragmentos flotantes
// en una ventana de 400px encima de esa fila, no a ojo): los recortes
// manuales de Oscar ya vienen perfectamente limpios en las 7 — sin sombra de
// contacto, sin fragmentos sueltos — así que este mapa queda vacío. Se deja
// la infraestructura (recortarDesde) lista por si una futura entrega trae
// algo suelto bajo la base de una imagen puntual.
const LINEA_APOYO_RESCATE = {};

async function buildBotellasGemini() {
  for (const nombre of BOTELLAS_GEMINI) {
    let buf = await sharp(gemini(`${nombre}.png`)).png().toBuffer();
    if (LINEA_APOYO_RESCATE[nombre] != null) {
      buf = await recortarDesde(buf, { y: LINEA_APOYO_RESCATE[nombre] });
    }
    await writeFile(out(`mixer-${nombre}.png`), buf);
    console.log("stock:", `mixer-${nombre}.png`, "(recorte manual de Oscar, alpha respetado tal cual)");
  }
}

// ing-cascara / ing-albahaca (v2): primera pasada recortaba el twist de
// naranja del borde del vaso en New design/sour.png y un par de hojas de
// basir.png, con pad transparente para cuadrar el tile — quedaban como
// medallón translúcido, igual que el resto de ing-*. Esta pasada las
// REEMPLAZA con fotos de producto generadas con Gemini y luego recortadas A
// MANO por Oscar en Photoshop (canal alpha real, mismo criterio que las 7
// botellas de arriba) — cuadradas 1:1, sujeto aislado sobre transparencia.
// Como el medallón ya es cuadrado y el recorte también, object-cover en
// GridMix (ver RECORTES_FOTO) llena el círculo exacto y dado que el fondo
// del medallón YA es navy (bg-navy/70), el margen transparente del recorte
// se funde solo con el círculo — sin necesidad de bakear el navy en la
// foto ni de pad alfa de nuestro lado.
async function buildCascara() {
  const buf = await sharp(gemini("ing-cascara.png")).png().toBuffer();
  await writeFile(out("ing-cascara.png"), buf);
  console.log("stock: ing-cascara.png (recorte manual de Oscar, alpha respetado tal cual)");
}

async function buildAlbahaca() {
  const buf = await sharp(gemini("ing-albahaca.png")).png().toBuffer();
  await writeFile(out("ing-albahaca.png"), buf);
  console.log("stock: ing-albahaca.png (recorte manual de Oscar, alpha respetado tal cual)");
}

// ing-anis (v2): la primera pasada recortaba una macro de Wikimedia (Dominio
// Público) con exposición/contraste subidos a mano — desentonaba en el grid
// (cuadrado oscuro con bordes visibles). Esta pasada la REEMPLAZA con una
// foto de producto generada con Gemini directo sobre el navy exacto del
// círculo del medallón (#0a1a3a) — mismo tratamiento que ing-cascara/
// ing-albahaca en su pasada anterior: cuadrada 1:1, full-bleed, sin recorte
// ni pad alfa de nuestro lado (llega en JPEG, sin canal alpha). Ya no se usa
// ningún asset externo en el juego — ver LICENCIAS.md.
async function buildAnis() {
  const buf = await sharp(gemini("ing-anis.png")).png().toBuffer();
  await writeFile(out("ing-anis.png"), buf);
  console.log("stock: ing-anis.png (gemini v2 navy, full-bleed)");
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

const LICENCIAS_MD = `# Licencias de assets en stock/

Todo stock/ sale de fuentes propiedad del cliente (legacy/assets, "New design "/)
o generadas para el cliente con Gemini (recortadas a mano por Oscar cuando
aplica) — nada de terceros. El único asset externo que tuvo el juego (una foto
de Wikimedia Dominio Público para el anís) ya no se usa: se reemplazó por una
foto propia, ver más abajo.

## stock/fuentes-gemini/*.png → stock/mixer-*.png (7 botellas de mezclas)

Fotos de producto generadas con Gemini (Nano Banana Pro) por nosotros para
este proyecto, con la etiqueta azul y texto blanco condensado grande ya
generados por el modelo — y luego recortadas A MANO por Oscar en Photoshop
(canal alpha real, sujeto aislado sobre transparencia). El recorte manual es
la fuente final: no se corre ningún proceso automático encima (ni
quitarFondoNavy ni recortarDesde), solo se respeta el alpha tal cual llega.
Reemplazan a los sets automáticos de pasadas anteriores (fondo blanco/
etiqueta dorada, luego fondo navy con recorte por distancia de color — ese
método sigue disponible como quitarFondoNavy en scripts/lib/quitar-fondo.mjs
para una futura entrega que no venga pre-recortada) y a las botellas
reetiquetadas a mano de la primera pasada (ver commit 692312e para ese
método, que sigue disponible en scripts/lib/etiqueta-generica.mjs y se usa
para ing-demerara más abajo).

- zumo-limon.png → mixer-zumo-limon.png (ZUMO DE LIMÓN)
- sirope-albahaca.png → mixer-sirope-albahaca.png (SIROPE DE ALBAHACA)
- zumo-toronja.png → mixer-zumo-toronja.png (ZUMO DE TORONJA)
- sirope-simple.png → mixer-sirope-simple.png (SIROPE SIMPLE)
- bitter-naranja.png → mixer-bitter-naranja.png (BITTER DE NARANJA)
- agua-gas.png → mixer-agua-gas.png (AGUA CON GAS, forma Perrier)
- soda.png → mixer-soda.png (SODA)

## stock/fuentes-gemini/ing-{cascara,albahaca,anis}.png → stock/ing-{cascara,albahaca,anis}.png

Mismo origen Gemini que las 7 botellas de arriba, para los 3 tiles "llenos"
(object-cover) del grid COMPLETA — ver RECORTES_FOTO en components/GridMix.tsx.
cascara y albahaca vienen recortadas a mano por Oscar igual que las botellas
(alpha real, sujeto aislado); anis viene fotografiada cuadrada 1:1 directo
sobre el navy exacto del círculo del medallón (#0a1a3a), full-bleed, sin
canal alpha. En los tres casos el trabajo de nuestro lado es solo empaquetar
tal cual — sin recorte, sin pad alfa adicional. Reemplazan a los recortes con
pad transparente de sour.png/basir.png (cascara/albahaca) y al crop de la
foto de Wikimedia con exposición subida (anís) de pasadas anteriores.
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
