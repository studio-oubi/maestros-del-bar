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

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uFrom; uniform sampler2D uTo;
uniform float uProgress;            // 0..1
uniform vec2 uScaleFrom; uniform vec2 uScaleTo; // para object-fit: contain por textura

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec4 muestra(sampler2D t, vec2 uv, vec2 esc){
  vec2 p = (uv - 0.5) / esc + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return vec4(0.0);
  return texture2D(t, p);
}
void main(){
  float n = noise(vUv * 6.0) * 0.7 + noise(vUv * 18.0) * 0.3;
  float borde = 0.08;
  float m = smoothstep(uProgress - borde, uProgress + borde, n + (1.0 - uProgress) * 0.0);
  // m=1 -> aún uFrom; m=0 -> ya uTo
  vec4 a = muestra(uFrom, vUv, uScaleFrom);
  vec4 b = muestra(uTo, vUv, uScaleTo);
  vec4 col = mix(b, a, m);
  // brillo dorado en el borde de la máscara
  float glow = smoothstep(0.0, borde, abs(n - uProgress)) ;
  col.rgb += (1.0 - glow) * vec3(0.79, 0.64, 0.36) * 0.35 * step(0.001, uProgress) * step(uProgress, 0.999);
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

export function crearDissolve(
  canvas: HTMLCanvasElement,
  urls: string[],
  intervaloMs: number,
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
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (destruido) return;
      gl.bindTexture(gl.TEXTURE_2D, texturas[i].tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      texturas[i].w = img.naturalWidth;
      texturas[i].h = img.naturalHeight;
      texturas[i].lista = true;
    };
    img.src = url;
  });

  let anchoCanvas = 1;
  let altoCanvas = 1;
  const dimensionar = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
  const duracionTrans = 1600;

  const suavizar = (t: number) => t * t * (3 - 2 * t);

  let raf = 0;
  const dibujar = (ahora: number) => {
    if (destruido) return;
    raf = requestAnimationFrame(dibujar);

    const n = texturas.length;
    const desde = texturas[indice];
    const hacia = texturas[(indice + 1) % n];

    let progreso = 0;
    const transcurrido = ahora - faseInicio;
    if (!enTransicion) {
      if (n > 1 && transcurrido >= intervaloMs) {
        enTransicion = true;
        faseInicio = ahora;
        progreso = 0;
      }
    } else {
      const t = Math.min(1, (ahora - faseInicio) / duracionTrans);
      progreso = suavizar(t);
      if (t >= 1) {
        indice = (indice + 1) % n;
        enTransicion = false;
        faseInicio = ahora;
        progreso = 0;
      }
    }

    const [sfx, sfy] = calcularEscala(desde.w, desde.h, anchoCanvas, altoCanvas);
    const [stx, sty] = calcularEscala(hacia.w, hacia.h, anchoCanvas, altoCanvas);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, desde.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, hacia.tex);

    gl.uniform1f(uProgress, progreso);
    gl.uniform2f(uScaleFrom, sfx, sfy);
    gl.uniform2f(uScaleTo, stx, sty);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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
