// Módulo sin React: transición "dissolve" por ruido entre varias texturas
// sobre un canvas WebGL. Devuelve null si WebGL no está disponible (el caller
// debe usar un fallback CSS).

export interface DissolveController {
  destruir(): void;
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

// Transición "humo": FBM multi-octava animado sobre el tiempo que hierve y
// asciende durante el cambio. La botella saliente se disuelve en volutas que
// suben mientras la entrante se condensa; el borde del frente distorsiona los
// UV de ambas texturas (calima) y se enciende con un filo dorado sutil.
const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uFrom; uniform sampler2D uTo;
uniform float uProgress;            // 0..1
uniform float uTime;                // segundos (para el hervor del ruido)
uniform vec2 uScaleFrom; uniform vec2 uScaleTo; // para object-fit: contain por textura

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// FBM de 4 octavas (turbulencia). Cada octava se desplaza para descorrelacionar
// los ejes -> textura de humo, no una rejilla. Normalizado a ~0..1.
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.0 + vec2(37.0, 17.0);
    a *= 0.5;
  }
  return v / 0.9375;
}
vec4 muestra(sampler2D t, vec2 uv, vec2 esc){
  vec2 p = (uv - 0.5) / esc + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return vec4(0.0);
  return texture2D(t, p);
}
void main(){
  float p = uProgress;

  // Campo de ruido que asciende (humo) y hierve lento durante la transición.
  vec2 np = vUv * vec2(3.0, 3.6);
  np.y -= p * 1.7;                       // el patrón sube -> volutas que ascienden
  np += vec2(uTime * 0.035, uTime * 0.075);
  float f = fbm(np);

  // Sesgo direccional de brocha: el frente barre de abajo hacia arriba,
  // roto por el ruido para que lea como un trazo y no como una línea recta.
  float sweep = mix(f, 1.0 - vUv.y, 0.26);

  // Umbral que recorre todo el rango para cubrir de 0% a 100%.
  float borde = 0.15;
  float thr = p * (1.0 + 2.0 * borde) - borde;
  float m = smoothstep(thr - borde, thr + borde, sweep);
  // m=1 -> aún uFrom; m=0 -> ya uTo

  // Proximidad al frente: 1 justo en el borde móvil, 0 lejos. Solo vive durante
  // la transición (en reposo el frente está fuera del rango de sweep).
  float edge = 1.0 - smoothstep(0.0, borde * 1.8, abs(sweep - thr));
  float ventana = smoothstep(0.0, 0.06, p) * smoothstep(0.0, 0.06, 1.0 - p);
  edge *= ventana;

  // Distorsión tipo calima: desplaza los UV de AMBAS texturas con un vector de
  // ruido, escalado por la cercanía al frente (2 muestras de ruido, baratas).
  // El sesgo hacia arriba (disp.y) arrastra la imagen como humo que sube.
  vec2 disp = vec2(noise(np * 2.0 + 5.0), noise(np * 2.0 - 9.0)) - 0.5;
  disp.y += 0.28;                        // el calor/humo empuja hacia arriba
  float amp = 0.045 * edge;
  vec4 a = muestra(uFrom, vUv + disp * amp, uScaleFrom);
  vec4 b = muestra(uTo, vUv + disp * (amp * 0.7), uScaleTo);
  vec4 col = mix(b, a, m);

  // Filo dorado en el borde móvil (más intenso a mitad de transición).
  float glow = edge * (0.7 + 0.3 * (1.0 - abs(p * 2.0 - 1.0)));
  col.rgb += glow * vec3(0.85, 0.68, 0.38) * 0.34;

  gl_FragColor = col;
}
`;

interface Tex {
  tex: WebGLTexture;
  w: number;
  h: number;
  lista: boolean;
}

function compilar(gl: WebGLRenderingContext, tipo: number, src: string): WebGLShader | null {
  const sh = gl.createShader(tipo);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

// Contain: fracción del canvas que ocupa la imagen en cada eje.
function calcularEscala(iw: number, ih: number, cw: number, ch: number): [number, number] {
  if (!iw || !ih || !cw || !ch) return [1, 1];
  const escala = Math.min(cw / iw, ch / ih);
  return [(iw * escala) / cw, (ih * escala) / ch];
}

// Cache de imágenes decodificadas a nivel de módulo, compartido entre montajes.
// Así la decodificación (cara con imágenes grandes) ocurre una sola vez por
// sesión: al volver al Home solo se re-suben las texturas, no se re-decodifican.
const cacheImagenes = new Map<string, Promise<HTMLImageElement>>();

function cargarImagen(url: string): Promise<HTMLImageElement> {
  let p = cacheImagenes.get(url);
  if (!p) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    // decode() garantiza que el bitmap está completamente decodificado antes
    // de resolver, de modo que el texImage2D posterior no bloquea.
    p = img
      .decode()
      .then(() => img)
      .catch(
        () =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            if (img.complete && img.naturalWidth > 0) return resolve(img);
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`No se pudo cargar ${url}`));
          }),
      );
    cacheImagenes.set(url, p);
  }
  return p;
}

export function crearDissolve(
  canvas: HTMLCanvasElement,
  urls: string[],
  intervaloMs: number,
  // Se invoca una vez, cuando el shader pinta su primer frame con contenido
  // real (la textura del índice 0 ya subida). El caller lo usa para ocultar el
  // placeholder sin dejar hueco.
  onPrimerContenido?: () => void,
): DissolveController | null {
  const opciones: WebGLContextAttributes = {
    premultipliedAlpha: false,
    alpha: true,
    antialias: true,
    depth: false,
  };
  const gl = (canvas.getContext("webgl", opciones) ||
    canvas.getContext("experimental-webgl", opciones)) as WebGLRenderingContext | null;
  if (!gl) return null;

  const vs = compilar(gl, gl.VERTEX_SHADER, VERT);
  const fs = compilar(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  // Quad fullscreen (triangle strip)
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uFrom = gl.getUniformLocation(prog, "uFrom");
  const uTo = gl.getUniformLocation(prog, "uTo");
  const uProgress = gl.getUniformLocation(prog, "uProgress");
  const uTime = gl.getUniformLocation(prog, "uTime");
  const uScaleFrom = gl.getUniformLocation(prog, "uScaleFrom");
  const uScaleTo = gl.getUniformLocation(prog, "uScaleTo");
  gl.uniform1i(uFrom, 0);
  gl.uniform1i(uTo, 1);

  gl.clearColor(0, 0, 0, 0);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  const texturas: Tex[] = urls.map(() => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // placeholder 1x1 transparente hasta que cargue
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return { tex, w: 1, h: 1, lista: false };
  });

  let destruido = false;
  urls.forEach((url, i) => {
    cargarImagen(url)
      .then((img) => {
        if (destruido) return;
        gl.bindTexture(gl.TEXTURE_2D, texturas[i].tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        texturas[i].w = img.naturalWidth;
        texturas[i].h = img.naturalHeight;
        texturas[i].lista = true;
      })
      .catch(() => {
        /* imagen no disponible: se queda con el placeholder transparente */
      });
  });

  let anchoCanvas = 1;
  let altoCanvas = 1;
  const dimensionar = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (w === canvas.width && h === canvas.height) return;
    canvas.width = w;
    canvas.height = h;
    anchoCanvas = w;
    altoCanvas = h;
    gl.viewport(0, 0, w, h);
  };
  dimensionar();

  const ro = new ResizeObserver(dimensionar);
  ro.observe(canvas);

  // Máquina de estados temporal
  let indice = 0; // textura actualmente visible
  let faseInicio = performance.now();
  let enTransicion = false;
  const duracionTrans = 2200;

  const suavizar = (t: number) => t * t * (3 - 2 * t);

  let notificado = false;
  let raf = 0;
  const dibujar = (ahora: number) => {
    if (destruido) return;
    raf = requestAnimationFrame(dibujar);

    const n = texturas.length;

    // Actualiza la máquina de estados ANTES de capturar las texturas, para que
    // el frame que cierra una transición ya dibuje el estado post-swap. Si se
    // capturaran antes, ese frame pintaría la textura FROM anterior con
    // progreso=0 (máscara ≈1) → un flash de 1 frame de la textura vieja.
    let progreso = 0;
    const transcurrido = ahora - faseInicio;
    if (!enTransicion) {
      if (n > 1 && transcurrido >= intervaloMs) {
        enTransicion = true;
        faseInicio = ahora;
      }
    } else {
      const t = Math.min(1, (ahora - faseInicio) / duracionTrans);
      if (t >= 1) {
        indice = (indice + 1) % n;
        enTransicion = false;
        faseInicio = ahora;
        progreso = 0;
      } else {
        progreso = suavizar(t);
      }
    }

    const desde = texturas[indice];
    const hacia = texturas[(indice + 1) % n];

    const [sfx, sfy] = calcularEscala(desde.w, desde.h, anchoCanvas, altoCanvas);
    const [stx, sty] = calcularEscala(hacia.w, hacia.h, anchoCanvas, altoCanvas);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, desde.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, hacia.tex);

    gl.uniform1f(uProgress, progreso);
    // Tiempo en segundos acotado a 0..1000 para no perder precisión en mediump
    // (solo alimenta la deriva lenta del hervor, no necesita rango mayor).
    gl.uniform1f(uTime, (ahora * 0.001) % 1000.0);
    gl.uniform2f(uScaleFrom, sfx, sfy);
    gl.uniform2f(uScaleTo, stx, sty);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Primer frame con contenido real (la textura visible ya está subida):
    // avisa al caller para que retire el placeholder sin dejar hueco.
    if (!notificado && desde.lista) {
      notificado = true;
      onPrimerContenido?.();
    }
  };
  raf = requestAnimationFrame(dibujar);

  return {
    destruir() {
      destruido = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      texturas.forEach((t) => gl.deleteTexture(t.tex));
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    },
  };
}
