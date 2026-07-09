# Brugal Mix Challenge — Rediseño completo en Next.js

**Fecha:** 2026-07-09 · **Estado:** Aprobado por el usuario

## Resumen

Reconstrucción completa de la app de activación "Maestros del Bar" bajo el nuevo
concepto **Mix Challenge**: juego contra reloj donde el usuario memoriza una
receta y arma su trago (vaso → ron → mezcla → ingredientes) antes de que el
tiempo llegue a cero. Nuevo diseño (carpeta `New design /`), flujo según las 14
pantallas de `User Flow/`. Next.js desplegado en Vercel con base de datos
Postgres (Neon vía Vercel) y panel protegido para ver los inscritos.

## Stack

- **Next.js 15 (App Router) + TypeScript**, deploy en Vercel.
- **Tailwind CSS 4** + CSS custom para efectos (coverflow, neón).
- **Drizzle ORM + Vercel Postgres (Neon)**.
- **WebGL puro (GLSL)** para el shader del Home — sin three.js.
- **sharp** (script de build) para el pipeline de assets.
- La app vieja (`index.html`, `assets/`) se mueve a `legacy/` como referencia.
  Los assets de mixers/ingredientes de `legacy/assets` se reutilizan.

## Rutas

| Ruta | Descripción |
|---|---|
| `/` | La app completa (client component, máquina de estados) |
| `/api/registro` | POST — guarda inscripción del formulario |
| `/api/partida` | POST — guarda resultado del juego (ganó/perdió/tiempo) |
| `/registros` | Panel de inscritos. Pide contraseña (`ADMIN_PASSWORD` env), cookie de sesión firmada (`ADMIN_SECRET`). Tabla + búsqueda + export CSV |

## Máquina de estados (pantallas)

`loading → home → formulario → recetas → intro → elige-trago → listo → reto → resultado`

1. **loading** — logo Brugal + barra de progreso. Precarga TODAS las imágenes del
   manifiesto (Image() promises). No se avanza hasta 100%. Todo queda en cache.
2. **home** — Fondo navy + marco dorado + "ESCÁPATE A LO EXTRAORDINARIO".
   Canvas WebGL: las 3 botellas Home (Doble, Extra Viejo, Triple) transicionan
   con **shader de máscara de ruido** (dissolve orgánico, ciclo automático lento
   ~6s). Delante, **fijo**, el logo neón Mix Challenge con loop lento: flota
   ±6px vertical + tilt aleatorio suave (±2°). Fallback CSS crossfade+mask si no
   hay WebGL. Tap en cualquier parte → formulario.
3. **formulario** — "ÚNETE AL CHALLENGE": nombre, cédula (000-0000000-0, con
   máscara), teléfono ((809) 000-0000, máscara), correo. Validación inline.
   CONTINUAR hace POST `/api/registro` (optimista: avanza sin esperar; reintento
   en background si falla).
4. **recetas** — Los 3 tragos con foto e ingredientes (pantalla de memorizar),
   tal como el mock 5.
5. **intro** — "ARMA EL MIX PERFECTO — recuerda la receta y completa tu trago
   antes de llegar a cero." Toca para continuar.
6. **elige-trago** — Coverflow 3D mejorado con los 3 tragos terminados sobre la
   barra: perspectiva y rotación 3D, profundidad (escala+blur+oscurecido en
   laterales), reflejo sutil en la barra, swipe con inercia y snap, tap en el
   del centro para elegir.
7. **listo** — "¿LISTO PARA ARMAR EL MIX PERFECTO?" → INICIAR.
8. **reto** (timer global **60s**, constante `GAME_SECONDS` en un solo lugar,
   arranca al pulsar INICIAR; countdown `M:SS` arriba a la derecha):
   - **elige tu vaso** — coverflow con los 3 vasos.
   - **elige tu ron** — coverflow con las 3 botellas limpias.
   - **elige tu mezcla** — coverflow con 5 mixers.
   - **completa el mix** — grid 3×3 de ingredientes (multi-selección, toggle)
     → botón MEZCLAR.
   - **Sin feedback de acierto/error durante el juego**: toda elección se
     acepta y se registra. Si el timer llega a 0 en cualquier paso →
     pantalla **tiempo agotado**.
9. **resultado**:
   - Todo correcto → **"GANASTE!!"** + foto del trago + tarjeta de receta.
   - Con fallos → **"CASI..."** (fallo): muestra la receta objetivo con
     check ✓ / cruz ✗ por cada paso (vaso, ron, mezcla) y los ingredientes
     marcando cuáles faltaron y cuáles sobraron.
   - Timer a 0 → **"UPP.. SE ACABÓ EL TIEMPO"** + botón INICIO.
   - En todos los casos se hace POST `/api/partida` y hay botón para volver
     al inicio (vuelve a home, sin repetir formulario en la misma sesión).

## Datos del juego (`lib/recetas.ts`)

| Trago | Ron | Vaso | Mezcla | Ingredientes correctos (grid) |
|---|---|---|---|---|
| Toronja Reserva | Doble Reserva | vaso acanalado (`toronja glas`) | Agua con gás (Perrier) | toronja, romero, hielo |
| Sour Reserva | Triple Reserva | vaso tallado (`sour glass`) | Zumo de limón | sirope simple, naranja, clara de huevo |
| Limón Albahaca Extra Viejo | Extra Viejo | vaso sin tallo (`basir glass`) | Zumo de limón | albahaca, sirope, limón |

- Grid 3×3 = 3 correctos + 6 señuelos del pool: canela, jengibre, frambuesa,
  menta, angostura, café, demerara (mezclados aleatoriamente por partida).
- Mixers del coverflow de mezcla: Perrier, zumo de limón, tónica, ginger,
  arándano (de `legacy/assets/mixer-*.png`).
- **Assets faltantes** (toronja, albahaca, limón como tiles de ingrediente): se
  derivan recortando de los renders provistos (`toronja.png` tiene la toronja y
  el romero, `basir.png` tiene albahaca y rodaja de limón) con sharp, o tiles
  fotográficos equivalentes. Nunca dejar un tile sin imagen.

## Pipeline de assets (`scripts/build-assets.mjs`)

- Entrada: `New design /` + `legacy/assets/`.
- Salida: `public/img/` — WebP con calidad ~80, redimensionado al tamaño máximo
  de uso real (botellas home ≤ 900px alto, tiles ≤ 400px, fondo ≤ 1400px).
  Nombres kebab-case sin espacios (`home-doble.webp`, `mix-challenge-logo.webp`).
- Genera `lib/asset-manifest.ts` con la lista tipada de todas las imágenes para
  el preloader.
- Objetivo: peso total del manifiesto < 4 MB (hoy los PNG suman ~40 MB).

## Base de datos (Drizzle)

```
registros: id serial PK, nombre text, cedula text, telefono text,
           correo text, created_at timestamptz default now()
partidas:  id serial PK, registro_id int FK→registros, trago text,
           resultado text ('gano'|'fallo'|'tiempo'), tiempo_restante int,
           detalles jsonb (elecciones completas), created_at timestamptz
```

## Panel `/registros`

- Server component. Sin cookie válida → form de contraseña (server action,
  compara con `ADMIN_PASSWORD`, si ok setea cookie HMAC firmada con
  `ADMIN_SECRET`, 24h).
- Con sesión: tabla (nombre, cédula, teléfono, correo, fecha, resultado de su
  mejor partida), búsqueda por texto, contador total, botón **Exportar CSV**
  (route handler que exige la misma cookie).

## Estética

- Paleta: navy `#0a1a3a`/textura `Background.png`, oro `#c9a45c`, crema,
  neón rosa del logo. Marco dorado fino en el borde del viewport (como mocks).
- Tipografía: condensada bold para títulos (Oswald o Archivo Condensed vía
  `next/font`) + sans geométrica (Jost) para cuerpo. Eyebrows dorados con
  letter-spacing ancho.
- Botones píldora con degradado dorado.
- Mobile-first (activación en evento). En desktop: marco tipo teléfono centrado
  (mismo patrón que la app vieja).
- La barra (`Barra.png`) ancla los objetos del coverflow; textos arriba,
  objetos "apoyados" en la barra, leyenda ESCÁPATE abajo.

## Errores y bordes

- Si `/api/registro` falla, no se bloquea el juego: se guarda en localStorage y
  se reintenta al finalizar la partida.
- Doble registro con la misma cédula: se permite (evento con repetición), pero
  el panel agrupa por cédula.
- Timer con `requestAnimationFrame` + timestamp (no `setInterval`) para no
  driftear; se pausa si la pestaña pierde visibilidad y se descuenta el tiempo
  real transcurrido al volver.

## Testing / verificación

- Build de assets reproducible (`npm run assets`).
- `npm run build` sin errores de tipos.
- Prueba e2e manual guiada: flujo completo ganar / fallar / tiempo agotado,
  registro visible en `/registros`, export CSV correcto.
- Lighthouse móvil: sin peticiones de imagen después del loading.

## Variables de entorno

`POSTGRES_URL` (Vercel Postgres), `ADMIN_PASSWORD`, `ADMIN_SECRET`.
