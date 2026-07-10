// Quita el fondo blanco de estudio de una foto de producto (JPEG opaco) vía
// flood-fill desde los bordes del lienzo, sin herramientas externas. Usado
// para las 7 botellas generadas con Gemini (Nano Banana Pro) en
// scripts/build-stock.mjs — reemplazan a las botellas reetiquetadas a mano.
//
// Método base: cualquier píxel "casi blanco/gris" (luminancia alta,
// saturación baja) que esté CONECTADO al borde del lienzo se vuelve
// transparente. Al ser flood-fill (no un umbral global), los brillos/blancos
// internos de la botella (vidrio, reflejos) no se tocan salvo que formen un
// camino continuo hasta el borde. Esto también come la sombra suave del
// piso: es un degradé continuo de blanco a gris claro, y todo ese degradé
// queda del lado "conectado al borde".
//
// Problema real encontrado: el cuello/tapa de vidrio TRANSLÚCIDO (p.ej.
// zumo-limon, zumo-toronja) es, en promedio de color, casi tan blanco como
// el fondo real — un umbral de color solo no alcanza para distinguirlos
// ("blanco sobre blanco" es un caso clásicamente difícil de chroma-key). La
// señal que SÍ los distingue es la TEXTURA: el fondo de estudio es liso
// (varianza local ~0), el vidrio/tapa tiene reflejos, roscas y bordes que
// generan variación local aunque el promedio sea claro. Se calcula un
// "rango local" (max-min de luminancia en una ventana chica) y cualquier
// píxel con textura real queda bloqueado para el flood-fill — efectivamente
// una muralla alrededor de cualquier zona con relieve, sin importar su
// brillo promedio.
//
// Remate (ver commit posterior): quedaba un parche crema/cálido de sombra
// de piso bajo la base de algunas botellas (el peor caso, ZUMO DE LIMÓN,
// tiene una rodaja de limón al lado que "sangra" color amarillo sobre esa
// sombra — se midió con muestreo de píxeles y da saturación 40-124, MUY por
// encima de SAT_MAX=22, así que fallaba el test de color de lleno, no era
// solo un problema de conectividad). Pero esa misma zona es TEXTURALMENTE
// PLANA (rango local 4-15, muy por debajo del rango real 15-33 de la pulpa
// del limón) — así que se puede relajar la saturación exigida SOLO en la
// banda baja del bbox de contenido (donde vive la sombra de piso) y seguir
// confiando en la muralla de textura para no comerse la fruta/hoja real.
import sharp from "sharp";

const LUM_MIN = 210; // por debajo de esto ya no se considera "fondo"
const SAT_MAX = 22; // diferencia max-min entre canales (evita comerse vidrio/líquido con tinte)
const RANGO_LOCAL_MAX = 14; // rango local (max-min) de luminancia; por encima = "hay textura", no es fondo
const RADIO_TEXTURA = 2; // ventana para el rango local (5x5) — chico a propósito, ver nota en quitarFondoBlanco
const BANDA_BAJA_FRAC = 0.18; // fracción inferior del bbox de contenido con umbral relajado
const LUM_MIN_BANDA = 180; // umbral de luminancia relajado dentro de la banda baja
const SAT_MAX_BANDA = 130; // umbral de saturación relajado dentro de la banda baja

function esFondoColor(r, g, b, lumMin = LUM_MIN, satMax = SAT_MAX) {
  const lum = (r + g + b) / 3;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  return lum >= lumMin && sat <= satMax;
}

// Máx/mín local separable (pasada horizontal + vertical) sobre un array de
// valores 0-255 — rápido en JS puro sobre imágenes de ~1M px (usado tanto
// para el rango de textura como para dilatar/erosionar máscaras binarias).
function boxMinMax(arr, width, height, r) {
  const tmpMx = new Float32Array(width * height);
  const tmpMn = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const lo = Math.max(0, x - r), hi = Math.min(width - 1, x + r);
      let mx = -Infinity, mn = Infinity;
      for (let xx = lo; xx <= hi; xx++) {
        const v = arr[y * width + xx];
        if (v > mx) mx = v;
        if (v < mn) mn = v;
      }
      tmpMx[y * width + x] = mx;
      tmpMn[y * width + x] = mn;
    }
  }
  const mx = new Float32Array(width * height);
  const mn = new Float32Array(width * height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const lo = Math.max(0, y - r), hi = Math.min(height - 1, y + r);
      let vmx = -Infinity, vmn = Infinity;
      for (let yy = lo; yy <= hi; yy++) {
        const a = tmpMx[yy * width + x];
        if (a > vmx) vmx = a;
        const b = tmpMn[yy * width + x];
        if (b < vmn) vmn = b;
      }
      mx[y * width + x] = vmx;
      mn[y * width + x] = vmn;
    }
  }
  return { mx, mn };
}

// Rango local de luminancia: alto donde hay textura/bordes reales (roscas,
// reflejos, contorno del vidrio), ~0 en fondo de estudio liso.
function rangoLocalLuminancia(data, channels, width, height, r) {
  const lum = new Float32Array(width * height);
  for (let p = 0; p < width * height; p++) {
    const i = p * channels;
    lum[p] = (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const { mx, mn } = boxMinMax(lum, width, height, r);
  const rango = new Float32Array(width * height);
  for (let p = 0; p < width * height; p++) rango[p] = mx[p] - mn[p];
  return rango;
}

// Dilatar un Uint8Array booleano (0/1) con un kernel cuadrado de radio r —
// usado para ensanchar la "muralla" de textura hasta que los huecos lisos
// entre roscas/reflejos queden cubiertos y el cuello quede bloqueado de
// punta a punta para el flood-fill.
function dilatarBooleano(mask, width, height, r) {
  const { mx } = boxMinMax(mask, width, height, r);
  const out = new Uint8Array(width * height);
  for (let p = 0; p < out.length; p++) out[p] = mx[p] > 0 ? 1 : 0;
  return out;
}

// Flood-fill iterativo (stack propio, no recursión — las imágenes son
// ~850x1264, recursión nativa desbordaría) desde todos los píxeles del borde
// que pasan esFondo (color Y sin textura bloqueante). Devuelve un
// Uint8Array (0/1): 1 = fondo alcanzado por flood-fill.
function floodFillFondo(esFondoMask, width, height) {
  const visitado = new Uint8Array(width * height);
  const stack = [];

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visitado[p] || !esFondoMask[p]) return;
    visitado[p] = 1;
    stack.push(p);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (stack.length) {
    const p = stack.pop();
    const x = p % width;
    const y = (p / width) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  return visitado;
}

// Quita el fondo de srcPath y devuelve un buffer PNG con alpha.
// feather: radio (px) de desenfoque aplicado SOLO al canal alpha para
// suavizar el borde (evita el serrucho de un corte binario duro).
// murallaRadio: cuánto se dilata la máscara de textura antes de bloquear el
// flood-fill (ver rangoLocalLuminancia/dilatarBooleano arriba).
export async function quitarFondoBlanco(srcPath, { feather = 1.4, murallaRadio = 2 } = {}) {
  const img = sharp(srcPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // El JPEG fuente tiene ruido de compresión: en el degradé suave de la
  // sombra, muchos píxeles individuales quedan justo al límite del umbral
  // de forma intermitente, formando una "cerca punteada" que el flood-fill
  // 4-conectado no atraviesa aunque perceptualmente sea sombra uniforme —
  // quedaban charcos de sombra sin quitar. Se clasifica el COLOR sobre una
  // versión desenfocada (blur 2.5) SOLO para decidir qué es fondo; el color
  // final compuesto sigue usando los píxeles originales sin desenfocar.
  const clasif = await sharp(srcPath).ensureAlpha().blur(2.5).raw().toBuffer({ resolveWithObject: true });
  const { data: dc, info: ic } = clasif;

  const width2 = ic.width, height2 = ic.height, ch2 = ic.channels;
  const colorFondo = new Uint8Array(width2 * height2);
  for (let p = 0; p < width2 * height2; p++) {
    const i = p * ch2;
    colorFondo[p] = esFondoColor(dc[i], dc[i + 1], dc[i + 2]) ? 1 : 0;
  }

  // Muralla de textura: cualquier zona con relieve real (roscas de la tapa,
  // reflejos/bordes del vidrio del cuello) queda bloqueada para el
  // flood-fill sin importar cuán clara sea en promedio — así el vidrio
  // translúcido "blanco sobre blanco" no se confunde con el fondo real,
  // que es liso. OJO: esto se calcula sobre una versión con un blur MUCHO
  // más chico (1.0, apenas para no confundir ruido JPEG con textura) que la
  // usada para el color — usar el mismo blur(2.5) de arriba esparcía tanto
  // cualquier borde real (silueta exterior de la botella) que la muralla
  // quedaba de ~20px de ancho alrededor de TODO el contorno, dejando un
  // halo blanco sin quitar pegado a cada botella. Con textura nítida +
  // ventana/dilatación chicas, la muralla es angosta en el contorno externo
  // (solo bloquea 1-2 pasadas de flood-fill, no dilata la silueta) pero
  // sigue siendo suficiente para cerrar los huecos angostos entre roscas.
  const nitida = await sharp(srcPath).ensureAlpha().blur(1.0).raw().toBuffer({ resolveWithObject: true });
  const rango = rangoLocalLuminancia(nitida.data, nitida.info.channels, width2, height2, RADIO_TEXTURA);
  const textura = new Uint8Array(width2 * height2);
  for (let p = 0; p < width2 * height2; p++) textura[p] = rango[p] > RANGO_LOCAL_MAX ? 1 : 0;
  const texturaDilatada = murallaRadio > 0 ? dilatarBooleano(textura, width2, height2, murallaRadio) : textura;

  const esFondoFinal = new Uint8Array(width2 * height2);
  for (let p = 0; p < width2 * height2; p++) esFondoFinal[p] = colorFondo[p] && !texturaDilatada[p] ? 1 : 0;

  let fondo = floodFillFondo(esFondoFinal, width, height);

  // Segunda pasada, banda baja: la sombra de piso bajo la botella puede
  // salir cálida/densa (color bleed de una fruta al lado, p.ej. el limón) y
  // fallar el umbral de saturación estricto de arriba de lleno — no es un
  // problema de conectividad, el propio color no pasa. Se ubica el bbox de
  // contenido de la primera pasada, se recalcula esFondoColor con un umbral
  // MUY relajado (satMax 130) solo en su 18% inferior, y se re-corre el
  // flood-fill completo con esa máscara ampliada. La muralla de textura
  // (sin cambios) sigue bloqueando cualquier fruta/hoja real que caiga en
  // esa banda, así que la saturación relajada no se come contenido.
  let yMin = height, yMax = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!fondo[y * width + x]) {
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
      }
    }
  }
  if (yMax > yMin) {
    const altoContenido = yMax - yMin;
    const bandaDesde = Math.round(yMax - altoContenido * BANDA_BAJA_FRAC);
    const esFondoFinal2 = esFondoFinal.slice();
    for (let y = bandaDesde; y <= yMax; y++) {
      for (let x = 0; x < width2; x++) {
        const p = y * width2 + x;
        const i = p * ch2;
        const colorRelajado = esFondoColor(dc[i], dc[i + 1], dc[i + 2], LUM_MIN_BANDA, SAT_MAX_BANDA);
        esFondoFinal2[p] = colorRelajado && !texturaDilatada[p] ? 1 : 0;
      }
    }
    fondo = floodFillFondo(esFondoFinal2, width, height);
  }

  // Canal alpha binario: 0 en fondo, 255 en el resto.
  const alphaBin = Buffer.alloc(width * height);
  for (let p = 0; p < width * height; p++) alphaBin[p] = fondo[p] ? 0 : 255;

  // Feather: desenfocar el alpha binario suaviza el borde a un gradiente de
  // 1-2px en vez de un corte duro de un solo píxel.
  // OJO: sharp .blur() sobre un raw de 1 canal devuelve 3 canales al hacer
  // .raw().toBuffer() (quirk observado — metadata() dice channels:1 pero el
  // buffer crudo sale triplicado), lo que corrompía el alpha con un patrón
  // de rayas. .extractChannel(0) fuerza que quede en 1 canal de nuevo (los
  // 3 canales que devuelve blur() son idénticos, no se pierde información).
  const alphaSuave = await sharp(alphaBin, { raw: { width, height, channels: 1 } })
    .blur(feather)
    .extractChannel(0)
    .raw()
    .toBuffer();

  const rgba = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const iSrc = p * channels;
    const iDst = p * 4;
    rgba[iDst] = data[iSrc];
    rgba[iDst + 1] = data[iSrc + 1];
    rgba[iDst + 2] = data[iSrc + 2];
    rgba[iDst + 3] = alphaSuave[p];
  }

  return sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

// Borra (alpha→0, con feather) un rectángulo redondeado puntual sobre un PNG
// con alpha ya existente — escape hatch para remates puntuales de un caso
// específico que quitarFondoBlanco no puede resolver de forma general sin
// arriesgar otras regresiones (ver comentario en build-stock.mjs sobre
// zumo-limon: un resto de sombra de piso, texturalmente indistinguible de
// la pulpa real del limón vecino, que solo se puede quitar con coordenadas
// medidas a mano sobre ESA imagen puntual). Coordenadas nativas (mismas que
// la salida de quitarFondoBlanco, sin upscale).
export async function borrarRect(buf, { x, y, w, h, r = 0, feather = 3 }) {
  const meta = await sharp(buf).metadata();
  const W = meta.width, H = meta.height;
  const svg = `<svg width="${W}" height="${H}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="white"/></svg>`;
  const alphaBin = await sharp(Buffer.from(svg)).extractChannel(0).raw().toBuffer();
  const alphaSuave = await sharp(alphaBin, { raw: { width: W, height: H, channels: 1 } })
    .blur(feather)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const maskRgba = Buffer.alloc(W * H * 4);
  for (let p = 0; p < W * H; p++) maskRgba[p * 4 + 3] = alphaSuave[p];
  const maskBuf = await sharp(maskRgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  return sharp(buf).composite([{ input: maskBuf, blend: "dest-out" }]).png().toBuffer();
}
