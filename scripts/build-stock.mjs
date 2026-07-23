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
import { recortarDesde } from "./lib/quitar-fondo.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const STOCK = path.join(ROOT, "stock");
const GEMINI = path.join(STOCK, "fuentes-gemini");
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
    const origen = nombre === "agua-gas" ? "botella alta v3, quitarFondoNavy" : "recorte manual de Oscar, alpha respetado tal cual";
    console.log("stock:", `mixer-${nombre}.png`, `(${origen})`);
  }
}

// ing-cascara / ing-albahaca (v2): primera pasada recortaba el twist de
// naranja del borde del vaso en New design/sour.png y un par de hojas de
// basir.png, con pad transparente para cuadrar el tile — medallón
// translúcido, igual que el resto de ing-*. Pasada intermedia las llevó a
// foto full-bleed sobre el navy del medallón (object-cover); esta pasada
// las REEMPLAZA de nuevo con fotos recortadas A MANO por Oscar en Photoshop
// (canal alpha real, mismo criterio que las 7 botellas de arriba) — sujeto
// aislado sobre transparencia. Con esto vuelven a tratarse como el resto de
// ing-* translúcidos (object-contain, NO están en RECORTES_FOTO de
// GridMix.tsx), para verse consistentes con MENTA/FRAMBUESA/etc.
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

// Cristalería + tragos (v2): reemplaza los renders de "New design "/ (toronja
// glas.png, sour glass.png, basir glass.png, toronja.png, sour.png,
// basir.png) por 6 fotos recortadas A MANO por Oscar en Photoshop (canal
// alpha real, mismo criterio que las botellas) — passthrough sin
// quitarFondoNavy, igual que el resto del set v2. CLAVE: cada vaso vacío y
// su trago son EL MISMO vidrio calzado píxel a píxel (verificado por
// team-lead con overlays al 50%) — el reveal del Resultado (vaso elegido +
// trago subiendo con máscara dentro del vidrio) depende de esa alineación.
// Por eso este build NO recorta, mueve ni reescala nada: copia el canvas
// 1536×2752 tal cual llega. PAD_INFERIOR/DIMENSIONES del manifiesto se
// recalculan solos en build-assets.mjs a partir del webp final.
const CRISTALERIA = [
  ["vaso-tallado-final", "vaso-sour"],
  ["vaso-acanalado-final", "vaso-toronja"],
  ["vaso-curvo-final", "vaso-albahaca"],
  ["trago-sour-v4", "trago-sour"],
  ["trago-toronja-v4", "trago-toronja"],
  ["trago-albahaca-v4", "trago-albahaca"],
];

async function buildCristaleria() {
  for (const [fuente, salida] of CRISTALERIA) {
    const buf = await sharp(gemini(`${fuente}.png`)).png().toBuffer();
    await writeFile(out(`${salida}.png`), buf);
    console.log("stock:", `${salida}.png`, "(recorte manual de Oscar, alpha respetado tal cual, sin mover/reescalar)");
  }
}

// ing-demerara (nombre de archivo/id sin cambios, ver lib/recetas.ts): el
// ingrediente pasó de "DEMERARA" a "PIMIENTA NEGRA" a pedido del cliente —
// la bolsa de azúcar demerara (legacy, con logo "Shamrock" despintado) ya no
// aplica. Reemplazada por una foto de Gemini (misma familia que las 7
// botellas: cuchara de madera con pimienta negra, fondo navy #0a1a3a,
// recorte por distancia de color con quitarFondoNavy — sujeto de silueta
// simple/lisa a propósito, a diferencia de un montón de granos sueltos, que
// deja un halo azul alrededor de cada grano al recortar). Ya viene con alpha
// real en fuentes-gemini/, así que este paso es passthrough puro, igual que
// buildCascara/buildAlbahaca.
async function buildPimientaNegra() {
  const buf = await sharp(gemini("ing-pimienta-negra.png")).png().toBuffer();
  await writeFile(out("ing-demerara.png"), buf);
  console.log("stock: ing-demerara.png (pimienta negra, alpha ya recortado)");
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
método sigue disponible como quitarFondoNavy en scripts/lib/quitar-fondo.mjs,
y se usó tal cual para ing-demerara/pimienta-negra más abajo) y a las
botellas reetiquetadas a mano de la primera pasada (ver commit 692312e para
ese método, disponible en scripts/lib/etiqueta-generica.mjs).

- zumo-limon.png → mixer-zumo-limon.png (ZUMO DE LIMÓN)
- sirope-albahaca.png → mixer-sirope-albahaca.png (SIROPE DE ALBAHACA)
- zumo-toronja.png → mixer-zumo-toronja.png (ZUMO DE TORONJA)
- sirope-simple.png → mixer-sirope-simple.png (SIROPE SIMPLE)
- bitter-naranja.png → mixer-bitter-naranja.png (BITTER DE NARANJA)
- agua-gas.png → mixer-agua-gas.png (AGUA CON GAS, botella alta v3 — ver nota abajo)
- soda.png → mixer-soda.png (SODA)

### agua-gas: botella alta (v3)

Las pasadas anteriores dieron una botella achatada (proporción alto/ancho 2.01,
la más ancha del set) con etiqueta de marco dorado y letra crema — fuera del
patrón de la casa. Esta pasada la regenera a pedido del cliente con la silueta
alta clásica de agua con gas (proporción 3.02, medida contra su foto de
referencia: 3.06) y la etiqueta navy LISA con letra blanca condensada, igual
que las otras seis. Generada con gemini-3-pro-image y recortada con
quitarFondoNavy — es la única del set que no viene recortada a mano.

Sin marca de ningún tipo: la referencia del cliente era una foto de producto de
un tercero y NO se usa como asset (rompería el "nada de terceros" de este
archivo); solo se le pidió al modelo la silueta, sin wordmark, medallón,
swoosh ni relieve de marca.

REGLA APRENDIDA (no repetir el error): la etiqueta es navy, igual que el fondo
de estudio, así que debe quedar INSET — con vidrio verde visible a ambos lados
y sin tocar nunca el contorno de la botella. Si la etiqueta llega al borde,
queda conectada al fondo y el flood-fill de quitarFondoNavy entra por ahí y se
come trozos de la silueta (verificado: una versión con etiqueta a todo el ancho
dejó 685 píxeles de mordidas internas; esta deja 12). Es el mismo motivo por el
que las otras botellas llevan la etiqueta rodeada de vidrio.

## stock/fuentes-gemini/ing-{cascara,albahaca,anis}.png → stock/ing-{cascara,albahaca,anis}.png

Mismo origen Gemini que las 7 botellas de arriba. cascara y albahaca vienen
recortadas a mano por Oscar igual que las botellas (alpha real, sujeto
aislado) — tile translúcido normal (object-contain), NO están en
RECORTES_FOTO de components/GridMix.tsx. anis viene fotografiada cuadrada
1:1 directo sobre el navy exacto del círculo del medallón (#0a1a3a),
full-bleed, sin canal alpha — SÍ va a object-cover (tile "lleno", como
toronja). En los tres casos el trabajo de nuestro lado es solo empaquetar
tal cual — sin recorte, sin pad alfa adicional. Reemplazan a los recortes con
pad transparente de sour.png/basir.png (cascara/albahaca) y al crop de la
foto de Wikimedia con exposición subida (anís) de pasadas anteriores.

## stock/fuentes-gemini/ing-pimienta-negra.png → stock/ing-demerara.png

Cuchara de madera con pimienta negra, generada con Gemini y recortada con
quitarFondoNavy (scripts/lib/quitar-fondo.mjs) — reemplaza a la bolsa de
azúcar demerara legacy (id/nombre de archivo internos sin cambios, ver
lib/recetas.ts) tras el cambio de ingrediente a "PIMIENTA NEGRA".

## stock/fuentes-gemini/{vasos,tragos}-*.png → stock/{vaso,trago}-*.png (cristalería)

Reemplazan los renders de "New design "/ (toronja glas.png, sour glass.png,
basir glass.png, toronja.png, sour.png, basir.png) por 6 fotos recortadas A
MANO por Oscar en Photoshop (alpha real), passthrough sin ningún proceso
automático. Cada vaso vacío y su trago comparten el MISMO vidrio calzado
píxel a píxel (el reveal del Resultado depende de esto) — no se recorta,
mueve ni reescala nada de nuestro lado.

- vaso-tallado-final.png → vaso-sour.png
- vaso-acanalado-final.png → vaso-toronja.png
- vaso-curvo-final.png → vaso-albahaca.png
- trago-sour-v4.png → trago-sour.png
- trago-toronja-v4.png → trago-toronja.png
- trago-albahaca-v4.png → trago-albahaca.png
`;

async function run() {
  await mkdir(STOCK, { recursive: true });
  await buildBotellasGemini();
  await buildCascara();
  await buildAlbahaca();
  await buildAnis();
  await buildCristaleria();
  await buildPimientaNegra();
  await writeFile(path.join(STOCK, "LICENCIAS.md"), LICENCIAS_MD, "utf8");
  console.log("LICENCIAS.md escrito");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
