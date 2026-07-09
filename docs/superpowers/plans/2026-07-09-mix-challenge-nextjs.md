# Mix Challenge (Next.js) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir la app de activación Brugal como "Mix Challenge": juego contra reloj (memoriza la receta → vaso → ron → mezcla → ingredientes) en Next.js, deploy Vercel, Postgres para inscritos y panel protegido.

**Architecture:** SPA-like: toda la experiencia vive en `/` como client component con máquina de estados (Context + reducer). Backend mínimo: 2 route handlers de escritura + panel server-rendered `/registros` con cookie HMAC. Assets se preprocesan a WebP con un script sharp que también genera el manifiesto tipado que consume el preloader.

**Tech Stack:** Next.js 15 (App Router, TS), Tailwind CSS 4, Drizzle ORM + `@neondatabase/serverless` (Vercel Postgres/Neon), sharp (build script), WebGL puro (GLSL inline) para el shader del Home, vitest para lógica.

**Spec:** `docs/superpowers/specs/2026-07-09-mix-challenge-nextjs-design.md` (leer antes de cualquier tarea). Mocks de pantallas: `User Flow/1.png` … `14.png`. Assets fuente: `New design /` y `legacy/assets/`.

## Global Constraints

- Idioma de la UI: **español** exacto según mocks ("ÚNETE AL CHALLENGE", "ARMA EL MIX PERFECTO", "GANASTE!!", "UPP.. SE ACABO EL TIEMPO", eyebrow "ESCAPATE / A LO EXTRAORDINARIO").
- Timer global del reto: `GAME_SECONDS = 60` definido SOLO en `lib/recetas.ts`.
- Sin feedback de acierto/error durante el reto; el resultado se evalúa al final.
- Paleta: navy `#0a1a3a`, oro `#c9a45c`, crema `#f0e3cd`, neón rosa `#ff3fd8`. Marco dorado de 2px con inset 8px alrededor del viewport en TODAS las pantallas (como en mocks).
- Tipografías vía `next/font/google`: **Oswald** (títulos condensados, weights 500/600/700) y **Jost** (cuerpo, 300/400/500/600).
- Mobile-first 100dvh sin scroll; en `min-width:600px` marco tipo teléfono centrado con aspect-ratio 1080/1920 (patrón de `legacy/index.html`).
- Todas las imágenes se sirven de `public/img/*.webp` (o `.svg`) y se referencian SOLO vía el objeto `IMG` de `lib/asset-manifest.ts`. Prohibido `<img src="/img/...">` hardcodeado.
- Nombres de archivo de assets: kebab-case sin espacios.
- Env vars: `POSTGRES_URL`, `ADMIN_PASSWORD`, `ADMIN_SECRET`. La app de juego debe funcionar sin DB configurada (registro optimista, reintento; nunca bloquear la UX).
- Commits frecuentes en español, mensaje corto, con `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Node scripts con ESM (`.mjs`). Package manager: npm.

## Grafo de dependencias (para paralelizar)

```
Task 1 (scaffold) ──► Task 2 (assets)  ──► Task 6 (preloader/loading)
        ├──────────► Task 3 (DB+API)   ──► Task 4 (panel /registros)
        └──────────► Task 5 (datos juego + state machine + timer)
Task 5 ──► Task 7 (home shader) [necesita nombres IMG de Task 2, ya fijados aquí]
Task 5 ──► Task 8 (formulario)
Task 5 ──► Task 9 (recetas/intro/listo)
Task 5 ──► Task 10 (coverflow + elige-trago)
Task 10 ─► Task 11 (reto: vaso/ron/mezcla/grid + HUD timer)
Task 11 ─► Task 12 (resultado)
Todo ───► Task 13 (integración, verificación, deploy docs)
```
Tasks 3, 5 y 2 pueden ir en paralelo tras Task 1. Tasks 7, 8, 9, 10 en paralelo tras Task 5. Task 4 en paralelo con la pista de UI.

---

### Task 1: Scaffold Next.js en la raíz + mover app vieja a `legacy/`

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (placeholder), `vitest.config.ts`, `.env.example`
- Modify: `.gitignore`
- Move: `index.html` → `legacy/index.html`, `assets/` → `legacy/assets/`

**Interfaces:**
- Produces: proyecto compilable (`npm run build`), fuentes exportadas desde `app/layout.tsx` como variables CSS `--font-oswald`, `--font-jost`; tokens CSS en `globals.css` (`--navy`, `--oro`, `--crema`, `--neon`).

- [ ] **Step 1: Mover la app vieja**

```bash
cd "/Users/oscarlobaldera/Downloads/app 4"
mkdir -p legacy && git mv index.html legacy/index.html && git mv assets legacy/assets
```

- [ ] **Step 2: Escribir archivos de scaffold**

`package.json`:
```json
{
  "name": "mix-challenge",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "assets": "node scripts/build-assets.mjs",
    "test": "vitest run",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@neondatabase/serverless": "^1.0.0",
    "drizzle-orm": "^0.44.0",
    "next": "^15.4.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.0",
    "@types/node": "^22",
    "@types/react": "^19",
    "drizzle-kit": "^0.31.0",
    "sharp": "^0.34.0",
    "tailwindcss": "^4.1.0",
    "typescript": "^5",
    "vitest": "^3.2.0"
  }
}
```

`next.config.ts`:
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: { unoptimized: true }, // servimos webp ya optimizados desde /public
  headers: async () => [{
    source: "/img/:path*",
    headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
  }],
};
export default nextConfig;
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true, "skipLibCheck": true, "strict": true, "noEmit": true,
    "esModuleInterop": true, "module": "esnext", "moduleResolution": "bundler",
    "resolveJsonModule": true, "isolatedModules": true, "jsx": "preserve",
    "incremental": true, "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "legacy"]
}
```

`postcss.config.mjs`:
```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`app/globals.css`:
```css
@import "tailwindcss";

:root {
  --navy: #0a1a3a;
  --navy-deep: #060d1f;
  --oro: #c9a45c;
  --oro-claro: #e7cf9f;
  --crema: #f0e3cd;
  --crema-suave: rgba(240, 227, 205, 0.65);
  --neon: #ff3fd8;
}

@theme inline {
  --color-navy: var(--navy);
  --color-navy-deep: var(--navy-deep);
  --color-oro: var(--oro);
  --color-oro-claro: var(--oro-claro);
  --color-crema: var(--crema);
  --color-neon: var(--neon);
  --font-titulo: var(--font-oswald);
  --font-cuerpo: var(--font-jost);
}

html, body { height: 100%; overscroll-behavior: none; }
body {
  background: var(--navy-deep);
  color: var(--crema);
  font-family: var(--font-jost), sans-serif;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
img { -webkit-user-drag: none; }
```

`app/layout.tsx`:
```tsx
import type { Metadata, Viewport } from "next";
import { Oswald, Jost } from "next/font/google";
import "./globals.css";

const oswald = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-oswald" });
const jost = Jost({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-jost" });

export const metadata: Metadata = { title: "Mix Challenge — Brugal", description: "Escápate a lo extraordinario" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${oswald.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx` (placeholder hasta Task 13):
```tsx
export default function Page() {
  return <main className="grid h-dvh place-items-center font-titulo text-3xl">MIX CHALLENGE</main>;
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: { environment: "node", include: ["lib/**/*.test.ts", "app/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

`.env.example`:
```
POSTGRES_URL=
ADMIN_PASSWORD=
ADMIN_SECRET=
```

Añadir a `.gitignore` (conservar lo existente):
```
node_modules/
.next/
.env*.local
.vercel
public/img/
lib/asset-manifest.ts
```
(`public/img` y el manifiesto son artefactos generados por `npm run assets`.)

- [ ] **Step 3: Instalar y verificar build**

```bash
npm install && npm run build
```
Expected: build OK ("Compiled successfully").

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Scaffold Next.js 15 + Tailwind 4; app vieja a legacy/"
```

---

### Task 2: Pipeline de assets (sharp) + manifiesto tipado

**Files:**
- Create: `scripts/build-assets.mjs`
- Genera (no commiteados): `public/img/*.webp|svg`, `lib/asset-manifest.ts`

**Interfaces:**
- Consumes: `New design /*.png|svg`, `legacy/assets/*.png`.
- Produces: `lib/asset-manifest.ts` con EXACTAMENTE:
  ```ts
  export const IMG = {
    background: "/img/background.webp", barra: "/img/barra.webp",
    escapate: "/img/escapate.webp", logoBrugal: "/img/logo-brugal.svg",
    logoMix: "/img/mix-challenge-logo.webp",
    homeDoble: "/img/home-doble.webp", homeExtraviejo: "/img/home-extraviejo.webp", homeTriple: "/img/home-triple.webp",
    ronDoble: "/img/ron-doble.webp", ronTriple: "/img/ron-triple.webp", ronExtraviejo: "/img/ron-extraviejo.webp",
    tragoToronja: "/img/trago-toronja.webp", tragoSour: "/img/trago-sour.webp", tragoAlbahaca: "/img/trago-albahaca.webp",
    vasoToronja: "/img/vaso-toronja.webp", vasoSour: "/img/vaso-sour.webp", vasoAlbahaca: "/img/vaso-albahaca.webp",
    mixerPerrier: "/img/mixer-perrier.webp", mixerLimon: "/img/mixer-limon.webp", mixerTonica: "/img/mixer-tonica.webp",
    mixerGinger: "/img/mixer-ginger.webp", mixerArandano: "/img/mixer-arandano.webp",
    ingToronja: "/img/ing-toronja.webp", ingRomero: "/img/ing-romero.webp", ingHielo: "/img/ing-hielo.webp",
    ingSirope: "/img/ing-sirope.webp", ingNaranja: "/img/ing-naranja.webp", ingClara: "/img/ing-clara.webp",
    ingAlbahaca: "/img/ing-albahaca.webp", ingLimon: "/img/ing-limon.webp", ingCanela: "/img/ing-canela.webp",
    ingJengibre: "/img/ing-jengibre.webp", ingFrambuesa: "/img/ing-frambuesa.webp", ingMenta: "/img/ing-menta.webp",
    ingAngostura: "/img/ing-angostura.webp", ingCafe: "/img/ing-cafe.webp", ingDemerara: "/img/ing-demerara.webp",
  } as const;
  export const ALL_IMAGES: string[] = Object.values(IMG);
  ```

- [ ] **Step 1: Escribir `scripts/build-assets.mjs`**

Mapa de entradas → salidas (alturas máx.; sharp `resize({ height, withoutEnlargement: true })`, `webp({ quality: 82 })`):

| Salida | Fuente | Alto máx |
|---|---|---|
| background.webp | `New design /Background.png` | 1920 |
| barra.webp | `New design /Barra.png` | 1200 |
| escapate.webp | `New design /Escapate a lo extra ordinario.png` | 300 |
| logo-brugal.svg | `New design /logo brugal.svg` | copia tal cual |
| mix-challenge-logo.webp | `New design /Mix Challenge Logo.png` | 500 |
| home-doble.webp | `New design /Home Doble.png` | 1100 |
| home-extraviejo.webp | `New design /Home Extra Viejo.png` | 1100 |
| home-triple.webp | `New design /Home Triple Reserva.png` | 1100 |
| ron-doble.webp | `New design /Doble Reserva.png` | 900 |
| ron-triple.webp | `New design /Triple reserva.png` | 900 |
| ron-extraviejo.webp | `New design /Extraviejo.png` | 900 |
| trago-toronja.webp | `New design /toronja.png` | 700 |
| trago-sour.webp | `New design /sour.png` | 700 |
| trago-albahaca.webp | `New design /basir.png` | 700 |
| vaso-toronja.webp | `New design /toronja glas.png` | 700 |
| vaso-sour.webp | `New design /sour glass.png` | 700 |
| vaso-albahaca.webp | `New design /basir glass.png` | 700 |
| mixer-*.webp | `legacy/assets/mixer-*.png` (perrier, limon, tonica, ginger, arandano) | 700 |
| ing-{romero,hielo,naranja,clara,canela,jengibre,frambuesa,menta,angostura,cafe,demerara}.webp | `legacy/assets/ing-*.png` | 400 |
| ing-sirope.webp | `legacy/assets/ing-syrup.png` | 400 |

Tiles derivados (recorte con sharp `.extract()` sobre la fuente a tamaño original, luego resize alto 400, fondo transparente conservado):
- `ing-toronja.webp`: recorte de la cuña de toronja de `New design /toronja.png` (zona superior-izquierda del garnish).
- `ing-albahaca.webp`: recorte del ramillete de albahaca de `New design /basir.png` (zona superior).
- `ing-limon.webp`: recorte de la rodaja de limón de `New design /basir.png` (zona superior-derecha).

El implementador debe abrir las imágenes, medir las coordenadas del recorte (sips/sharp metadata) y dejar las coordenadas como constantes documentadas en el script. Verificar visualmente cada tile generado (Read del webp). Si un recorte sale mal (bordes cortados, restos del vaso), ajustar coordenadas hasta que sea un tile presentable.

Estructura del script:
```js
import sharp from "sharp";
import { mkdir, copyFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ND = path.join(ROOT, "New design ");   // ojo: espacio final en el nombre real
const LEG = path.join(ROOT, "legacy/assets");
const OUT = path.join(ROOT, "public/img");

const JOBS = [ /* { out: "background.webp", src: <abs>, height: 1920 }, ... */ ];
const CROPS = [ /* { out: "ing-toronja.webp", src, extract: { left, top, width, height }, height: 400 }, ... */ ];

// procesa JOBS y CROPS, luego escribe lib/asset-manifest.ts con las claves EXACTAS
// de la sección Interfaces, y reporta tabla de tamaños + total.
```

- [ ] **Step 2: Ejecutar y verificar**

```bash
npm run assets && du -sh public/img && ls public/img | wc -l
```
Expected: 35 archivos, total < 4 MB. Verificar visualmente (Read) `ing-toronja.webp`, `ing-albahaca.webp`, `ing-limon.webp`, `home-doble.webp`.

- [ ] **Step 3: Verificar que el manifiesto compila**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 4: Commit (script solamente; los artefactos están gitignoreados)**

```bash
git add scripts/build-assets.mjs && git commit -m "Pipeline de assets: WebP optimizados + manifiesto tipado"
```

---

### Task 3: Esquema Drizzle + cliente DB + APIs de registro/partida

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/index.ts`, `drizzle.config.ts`, `app/api/registro/route.ts`, `app/api/partida/route.ts`, `lib/validacion.ts`, `lib/validacion.test.ts`

**Interfaces:**
- Produces:
  - `lib/validacion.ts`: `export function validarRegistro(d: unknown): { ok: true; datos: RegistroInput } | { ok: false; error: string }` con `export interface RegistroInput { nombre: string; cedula: string; telefono: string; correo: string }`. Reglas: nombre ≥ 3 chars; cédula matchea `/^\d{3}-?\d{7}-?\d{1}$/` (se normaliza a `000-0000000-0`); teléfono ≥ 10 dígitos (normaliza a `(809) 000-0000`); correo regex simple `/^\S+@\S+\.\S+$/`.
  - `POST /api/registro` body `RegistroInput` → `201 { id: number }` | `400 { error }` | `503 { error }` si no hay `POSTGRES_URL`.
  - `POST /api/partida` body `{ registroId: number | null; trago: string; resultado: "gano"|"fallo"|"tiempo"; tiempoRestante: number; detalles: unknown }` → `201 { id }`.
  - `lib/db/index.ts`: `export function getDb()` (lanza si falta `POSTGRES_URL`), `export const registros`, `export const partidas` re-export del schema.

- [ ] **Step 1: Test de validación primero** (`lib/validacion.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { validarRegistro } from "./validacion";

describe("validarRegistro", () => {
  it("acepta y normaliza un registro válido", () => {
    const r = validarRegistro({ nombre: "Ana Pérez", cedula: "00112345678", telefono: "8095551234", correo: "ana@mail.com" });
    expect(r).toEqual({ ok: true, datos: { nombre: "Ana Pérez", cedula: "001-1234567-8", telefono: "(809) 555-1234", correo: "ana@mail.com" } });
  });
  it("rechaza cédula corta", () => {
    expect(validarRegistro({ nombre: "Ana", cedula: "123", telefono: "8095551234", correo: "a@b.co" }).ok).toBe(false);
  });
  it("rechaza correo inválido", () => {
    expect(validarRegistro({ nombre: "Ana", cedula: "00112345678", telefono: "8095551234", correo: "nope" }).ok).toBe(false);
  });
  it("rechaza payload no-objeto", () => {
    expect(validarRegistro(null).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y ver fallar** — `npx vitest run lib/validacion.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implementar `lib/validacion.ts`** hasta que pase. Normalización: quitar no-dígitos de cédula/teléfono y reformatear.

- [ ] **Step 4: `npx vitest run` → PASS.**

- [ ] **Step 5: Schema y cliente**

`lib/db/schema.ts`:
```ts
import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const registros = pgTable("registros", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  cedula: text("cedula").notNull(),
  telefono: text("telefono").notNull(),
  correo: text("correo").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const partidas = pgTable("partidas", {
  id: serial("id").primaryKey(),
  registroId: integer("registro_id").references(() => registros.id),
  trago: text("trago").notNull(),
  resultado: text("resultado").notNull(), // 'gano' | 'fallo' | 'tiempo'
  tiempoRestante: integer("tiempo_restante").notNull(),
  detalles: jsonb("detalles"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

`lib/db/index.ts`:
```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function getDb() {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error("POSTGRES_URL no configurada");
  return drizzle(neon(url), { schema });
}
export { registros, partidas } from "./schema";
```

`drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.POSTGRES_URL! },
});
```

- [ ] **Step 6: Route handlers**

`app/api/registro/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getDb, registros } from "@/lib/db";
import { validarRegistro } from "@/lib/validacion";

export async function POST(req: Request) {
  const v = validarRegistro(await req.json().catch(() => null));
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  if (!process.env.POSTGRES_URL) return NextResponse.json({ error: "DB no configurada" }, { status: 503 });
  try {
    const [fila] = await getDb().insert(registros).values(v.datos).returning({ id: registros.id });
    return NextResponse.json({ id: fila.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error guardando" }, { status: 500 });
  }
}
```

`app/api/partida/route.ts` análogo: valida `resultado ∈ {gano,fallo,tiempo}`, `trago` string no vacío, `tiempoRestante` entero ≥ 0; `registroId` puede ser null.

- [ ] **Step 7: Build + tests + commit**

```bash
npm run build && npm test
git add lib/ app/api drizzle.config.ts && git commit -m "DB Drizzle/Neon + APIs registro y partida con validación"
```

---

### Task 4: Panel `/registros` con contraseña + export CSV

**Files:**
- Create: `lib/admin-auth.ts`, `lib/admin-auth.test.ts`, `app/registros/page.tsx`, `app/registros/acciones.ts` (server action), `app/registros/export/route.ts`

**Interfaces:**
- Consumes: `getDb()`, `registros`, `partidas` de Task 3.
- Produces:
  - `lib/admin-auth.ts`: `export function crearToken(secreto: string): string` (payload `exp` +24h, HMAC-SHA256, formato `exp.firmaHex` con `node:crypto`), `export function verificarToken(token: string | undefined, secreto: string): boolean`. Cookie: nombre `mc_admin`, httpOnly, secure en prod, sameSite lax.

- [ ] **Step 1: Tests de token primero** (`lib/admin-auth.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { crearToken, verificarToken } from "./admin-auth";

describe("admin-auth", () => {
  it("token recién creado verifica", () => {
    expect(verificarToken(crearToken("s3cr3t"), "s3cr3t")).toBe(true);
  });
  it("secreto incorrecto no verifica", () => {
    expect(verificarToken(crearToken("a"), "b")).toBe(false);
  });
  it("token expirado no verifica", () => {
    const viejo = `${Date.now() - 1000}.deadbeef`;
    expect(verificarToken(viejo, "s3cr3t")).toBe(false);
  });
  it("token undefined/malformado no verifica", () => {
    expect(verificarToken(undefined, "s")).toBe(false);
    expect(verificarToken("garbage", "s")).toBe(false);
  });
});
```

- [ ] **Step 2: FAIL → implementar → PASS** (usar `crypto.timingSafeEqual` para comparar firmas).

- [ ] **Step 3: Página `/registros`**

`app/registros/page.tsx` (server component, `export const dynamic = "force-dynamic"`):
- Lee cookie `mc_admin` (via `cookies()` de `next/headers`). Sin token válido → render de formulario de contraseña (estilo de la app: navy, marco dorado, input píldora) que postea a la server action `entrar`.
- Con token válido → consulta `registros` LEFT JOIN mejor `partidas` por registro (la de mejor resultado: gano > fallo > tiempo, luego mayor `tiempoRestante`), orden `createdAt` desc. Render: contador total, input de búsqueda (client component chiquito que filtra en cliente), tabla (nombre, cédula, teléfono, correo, fecha `es-DO`, resultado con badge), link `Exportar CSV` → `/registros/export`.
- Si `POSTGRES_URL` falta: mensaje "Base de datos no configurada".

`app/registros/acciones.ts`:
```ts
"use server";
import { cookies } from "next/headers";
import { crearToken } from "@/lib/admin-auth";

export async function entrar(_prev: { error: string } | null, formData: FormData) {
  const pass = formData.get("password");
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SECRET) return { error: "Panel no configurado" };
  if (pass !== process.env.ADMIN_PASSWORD) return { error: "Contraseña incorrecta" };
  (await cookies()).set("mc_admin", crearToken(process.env.ADMIN_SECRET), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24,
  });
  return null;
}
```
(Usar `useActionState` en un client component pequeño para el form, o un form server-action con redirect; elegir lo más simple que funcione.)

- [ ] **Step 4: Export CSV**

`app/registros/export/route.ts`: GET; verifica cookie con `verificarToken`, si no → 401. Query igual que la página; responde `text/csv; charset=utf-8` con BOM `﻿` (para Excel), cabecera `Content-Disposition: attachment; filename="registros-mix-challenge.csv"`. Columnas: `Nombre,Cédula,Teléfono,Correo,Fecha,Resultado`. Escapar comillas dobles.

- [ ] **Step 5: Verificar build+tests, probar manualmente con `npm run dev`** (sin DB: página muestra aviso; con password mal: error). Commit:

```bash
git add lib/admin-auth* app/registros && git commit -m "Panel /registros con contraseña, sesión firmada y export CSV"
```

---

### Task 5: Datos del juego + máquina de estados + timer

**Files:**
- Create: `lib/recetas.ts`, `lib/recetas.test.ts`, `lib/juego.tsx` (Provider + reducer + hooks), `lib/use-countdown.ts`

**Interfaces:**
- Consumes: `IMG` de `lib/asset-manifest.ts` (Task 2; las claves ya están fijadas — codificar contra ellas aunque el archivo aún no exista en runtime).
- Produces (firmas EXACTAS):

`lib/recetas.ts`:
```ts
import { IMG } from "@/lib/asset-manifest";

export const GAME_SECONDS = 60;

export type TragoId = "toronja" | "sour" | "albahaca";
export type RonId = "doble" | "triple" | "extraviejo";
export type VasoId = "vaso-toronja" | "vaso-sour" | "vaso-albahaca";
export type MezclaId = "perrier" | "limon" | "tonica" | "ginger" | "arandano";
export type IngredienteId =
  | "toronja" | "romero" | "hielo" | "sirope" | "naranja" | "clara" | "albahaca" | "limon"
  | "canela" | "jengibre" | "frambuesa" | "menta" | "angostura" | "cafe" | "demerara";

export interface Receta {
  id: TragoId; nombre: string; ron: RonId; ronNombre: string;
  vaso: VasoId; mezcla: MezclaId; mezclaNombre: string;
  ingredientes: IngredienteId[];        // exactamente 3
  lineasReceta: string[];               // bullets del mock 5
  imgTrago: string; imgVaso: string;
}

export const RECETAS: Receta[] = [
  { id: "toronja", nombre: "TORONJA RESERVA", ron: "doble", ronNombre: "BRUGAL DOBLE RESERVA",
    vaso: "vaso-toronja", mezcla: "perrier", mezclaNombre: "AGUA CON GÁS",
    ingredientes: ["toronja", "romero", "hielo"],
    lineasReceta: ["2 OZ BRUGAL DOBLE RESERVA", "ZUMO DE LIMÓN", "ZUMO DE TORONJA ROSADA", "TORONJA + ROMERO"],
    imgTrago: IMG.tragoToronja, imgVaso: IMG.vasoToronja },
  { id: "sour", nombre: "SOUR RESERVA", ron: "triple", ronNombre: "BRUGAL TRIPLE RESERVA",
    vaso: "vaso-sour", mezcla: "limon", mezclaNombre: "ZUMO DE LIMÓN",
    ingredientes: ["sirope", "naranja", "clara"],
    lineasReceta: ["2 OZ BRUGAL TRIPLE RESERVA", "ZUMO DE LIMÓN", "SIROPE SIMPLE", "BITTER DE NARANJA"],
    imgTrago: IMG.tragoSour, imgVaso: IMG.vasoSour },
  { id: "albahaca", nombre: "LIMÓN ALBAHACA EXTRA VIEJO", ron: "extraviejo", ronNombre: "BRUGAL EXTRA VIEJO",
    vaso: "vaso-albahaca", mezcla: "limon", mezclaNombre: "ZUMO DE LIMÓN",
    ingredientes: ["albahaca", "sirope", "limon"],
    lineasReceta: ["2 OZ BRUGAL EXTRA VIEJO", "ZUMO DE LIMÓN", "SIROPE DE ALBAHACA"],
    imgTrago: IMG.tragoAlbahaca, imgVaso: IMG.vasoAlbahaca },
];

export const RONES: { id: RonId; nombre: string; img: string }[] = [
  { id: "doble", nombre: "BRUGAL DOBLE RESERVA", img: IMG.ronDoble },
  { id: "triple", nombre: "BRUGAL TRIPLE RESERVA", img: IMG.ronTriple },
  { id: "extraviejo", nombre: "BRUGAL EXTRA VIEJO", img: IMG.ronExtraviejo },
];
export const VASOS: { id: VasoId; nombre: string; img: string }[] = [
  { id: "vaso-toronja", nombre: "VASO ACANALADO", img: IMG.vasoToronja },
  { id: "vaso-sour", nombre: "VASO TALLADO", img: IMG.vasoSour },
  { id: "vaso-albahaca", nombre: "VASO REDONDO", img: IMG.vasoAlbahaca },
];
export const MEZCLAS: { id: MezclaId; nombre: string; img: string }[] = [
  { id: "perrier", nombre: "AGUA CON GÁS", img: IMG.mixerPerrier },
  { id: "limon", nombre: "ZUMO DE LIMÓN", img: IMG.mixerLimon },
  { id: "tonica", nombre: "AGUA TÓNICA", img: IMG.mixerTonica },
  { id: "ginger", nombre: "GINGER ALE", img: IMG.mixerGinger },
  { id: "arandano", nombre: "JUGO DE ARÁNDANO", img: IMG.mixerArandano },
];
export const INGREDIENTES: Record<IngredienteId, { nombre: string; img: string }> = {
  toronja: { nombre: "TORONJA", img: IMG.ingToronja }, romero: { nombre: "ROMERO", img: IMG.ingRomero },
  hielo: { nombre: "HIELO", img: IMG.ingHielo }, sirope: { nombre: "SIROPE", img: IMG.ingSirope },
  naranja: { nombre: "NARANJA", img: IMG.ingNaranja }, clara: { nombre: "CLARA", img: IMG.ingClara },
  albahaca: { nombre: "ALBAHACA", img: IMG.ingAlbahaca }, limon: { nombre: "LIMÓN", img: IMG.ingLimon },
  canela: { nombre: "CANELA", img: IMG.ingCanela }, jengibre: { nombre: "JENGIBRE", img: IMG.ingJengibre },
  frambuesa: { nombre: "FRAMBUESA", img: IMG.ingFrambuesa }, menta: { nombre: "MENTA", img: IMG.ingMenta },
  angostura: { nombre: "ANGOSTURA", img: IMG.ingAngostura }, cafe: { nombre: "CAFÉ", img: IMG.ingCafe },
  demerara: { nombre: "DEMERARA", img: IMG.ingDemerara },
};
export const SENUELOS: IngredienteId[] = ["canela", "jengibre", "frambuesa", "menta", "angostura", "cafe", "demerara"];

export function armarGrid(receta: Receta, rng: () => number = Math.random): IngredienteId[];
// 3 correctos + 6 señuelos aleatorios sin repetir, barajados Fisher-Yates. Siempre length 9, sin duplicados.

export interface Elecciones { vaso: VasoId | null; ron: RonId | null; mezcla: MezclaId | null; ingredientes: IngredienteId[] }
export interface Evaluacion {
  gano: boolean;
  vasoOk: boolean; ronOk: boolean; mezclaOk: boolean;
  faltaron: IngredienteId[];   // correctos no elegidos
  sobraron: IngredienteId[];   // elegidos que no van
}
export function evaluar(receta: Receta, e: Elecciones): Evaluacion;
```

`lib/use-countdown.ts`:
```ts
export function useCountdown(activo: boolean, segundos: number, onExpirar: () => void): { restante: number; formato: string }
// rAF + performance.now(); al ocultarse la pestaña sigue contando tiempo real
// (guardar timestamp de inicio; restante = total - (now - inicio)).
// formato "M:SS". onExpirar se dispara UNA vez al cruzar 0.
```

`lib/juego.tsx`:
```tsx
export type Pantalla = "loading" | "home" | "formulario" | "recetas" | "intro"
  | "elige-trago" | "listo" | "reto-vaso" | "reto-ron" | "reto-mezcla" | "reto-mix" | "resultado";
export type ResultadoTipo = "gano" | "fallo" | "tiempo";

interface EstadoJuego {
  pantalla: Pantalla;
  registroId: number | null;
  registroHecho: boolean;         // para no repetir formulario al reiniciar
  receta: Receta | null;          // trago elegido
  grid: IngredienteId[];          // 9 tiles de la partida
  elecciones: Elecciones;
  resultado: ResultadoTipo | null;
  evaluacion: Evaluacion | null;
  inicioReto: number | null;      // performance.now() al pulsar INICIAR
  tiempoRestante: number;         // segundos al terminar (para guardar)
}

type Accion =
  | { tipo: "CARGA_LISTA" } | { tipo: "IR"; a: Pantalla }
  | { tipo: "REGISTRADO"; id: number | null }
  | { tipo: "ELIGE_TRAGO"; receta: Receta }
  | { tipo: "INICIAR_RETO" }
  | { tipo: "ELIGE_VASO"; vaso: VasoId } | { tipo: "ELIGE_RON"; ron: RonId } | { tipo: "ELIGE_MEZCLA"; mezcla: MezclaId }
  | { tipo: "TOGGLE_INGREDIENTE"; ing: IngredienteId }
  | { tipo: "MEZCLAR"; tiempoRestante: number }      // evalúa y va a resultado
  | { tipo: "TIEMPO_AGOTADO" }                        // resultado = 'tiempo'
  | { tipo: "REINICIAR" };                            // vuelve a home, conserva registroHecho

export function JuegoProvider({ children }: { children: React.ReactNode }): JSX.Element;
export function useJuego(): { estado: EstadoJuego; despachar: React.Dispatch<Accion> };
```
Transiciones del reducer: `ELIGE_VASO` → pantalla `reto-ron`; `ELIGE_RON` → `reto-mezcla`; `ELIGE_MEZCLA` → `reto-mix`; `MEZCLAR` → calcula `evaluar()`, setea `resultado` (`gano`/`fallo`) y pantalla `resultado`. `ELIGE_TRAGO` también calcula `grid = armarGrid(receta)`. `REINICIAR` → pantalla `home`, limpia receta/elecciones/resultado, conserva `registroId`/`registroHecho`.

- [ ] **Step 1: Tests primero** (`lib/recetas.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { RECETAS, armarGrid, evaluar, SENUELOS } from "./recetas";

const toronja = RECETAS[0];

describe("armarGrid", () => {
  it("devuelve 9 sin duplicados incluyendo los 3 correctos", () => {
    const grid = armarGrid(toronja, () => 0.5);
    expect(grid).toHaveLength(9);
    expect(new Set(grid).size).toBe(9);
    for (const ing of toronja.ingredientes) expect(grid).toContain(ing);
  });
  it("los 6 restantes salen del pool de señuelos", () => {
    const grid = armarGrid(toronja, () => 0.5);
    const extras = grid.filter((g) => !toronja.ingredientes.includes(g));
    expect(extras).toHaveLength(6);
    for (const e of extras) expect(SENUELOS).toContain(e);
  });
});

describe("evaluar", () => {
  it("todo correcto gana", () => {
    const ev = evaluar(toronja, { vaso: "vaso-toronja", ron: "doble", mezcla: "perrier", ingredientes: ["toronja", "romero", "hielo"] });
    expect(ev.gano).toBe(true);
    expect(ev.faltaron).toEqual([]); expect(ev.sobraron).toEqual([]);
  });
  it("marca faltantes y sobrantes", () => {
    const ev = evaluar(toronja, { vaso: "vaso-sour", ron: "doble", mezcla: "perrier", ingredientes: ["toronja", "canela"] });
    expect(ev.gano).toBe(false);
    expect(ev.vasoOk).toBe(false); expect(ev.ronOk).toBe(true);
    expect(ev.faltaron.sort()).toEqual(["hielo", "romero"]);
    expect(ev.sobraron).toEqual(["canela"]);
  });
  it("orden de ingredientes no importa", () => {
    const ev = evaluar(toronja, { vaso: "vaso-toronja", ron: "doble", mezcla: "perrier", ingredientes: ["hielo", "toronja", "romero"] });
    expect(ev.gano).toBe(true);
  });
});
```
Nota: el test importa `IMG`; si Task 2 aún no generó el manifiesto, crear un stub temporal `lib/asset-manifest.ts` con las claves de la Interfaces de Task 2 apuntando a strings (se sobrescribe al correr `npm run assets`). El stub NO se commitea (ya está gitignoreado).

- [ ] **Step 2: FAIL → implementar `lib/recetas.ts` → PASS.**

- [ ] **Step 3: Implementar `lib/use-countdown.ts` y `lib/juego.tsx`** según firmas. El countdown NO usa setInterval: rAF que calcula `restante = Math.max(0, seg - (performance.now() - inicio)/1000)`; redondear hacia arriba para display.

- [ ] **Step 4: `npm test` + `npx tsc --noEmit` → PASS. Commit:**

```bash
git add lib/recetas* lib/juego.tsx lib/use-countdown.ts && git commit -m "Datos del juego, reducer de pantallas y countdown rAF"
```

---

### Task 6: Marco visual compartido + pantalla de loading con precarga

**Files:**
- Create: `components/Marco.tsx`, `components/Preloader.tsx`, `lib/precarga.ts`

**Interfaces:**
- Consumes: `ALL_IMAGES` del manifiesto; `useJuego` (`despachar({tipo:"CARGA_LISTA"})` al terminar).
- Produces:
  - `Marco.tsx`: `export function Marco({ children }: { children: React.ReactNode })` — contenedor 100dvh con `Background.png` (IMG.background) cover, borde dorado (2px, inset 8px, border-radius 18px), `container-type: size`; en ≥600px, marco teléfono centrado aspect 1080/1920 con sombra (portar patrón de `legacy/index.html` líneas 33-47). Todas las pantallas se montan dentro.
  - `lib/precarga.ts`: `export function precargar(urls: string[], onProgress: (pct: number) => void): Promise<void>` — `new Image()` por URL, cuenta load/error (error también cuenta para no colgar), resuelve al completar todas.
  - `Preloader.tsx`: client component; logo Brugal (IMG.logoBrugal) centrado + barra de progreso dorada fina (animada con el pct real) + texto "CARGANDO EXPERIENCIA". Al 100% espera 300ms y despacha `CARGA_LISTA`.

- [ ] **Step 1: Implementar los tres archivos.**
- [ ] **Step 2: Verificación visual con dev server** (screenshot móvil 390×844: fondo navy texturizado, marco dorado, barra progresa hasta desaparecer).
- [ ] **Step 3: Commit** — `git add components lib/precarga.ts && git commit -m "Marco dorado compartido y preloader con precarga total"`.

---

### Task 7: Home con shader WebGL (dissolve) + logo neón flotante

**Files:**
- Create: `components/pantallas/Home.tsx`, `components/ShaderBotellas.tsx`, `lib/webgl-dissolve.ts`

**Interfaces:**
- Consumes: `IMG.homeDoble/homeExtraviejo/homeTriple/logoMix/logoBrugal/escapate`, `useJuego`.
- Produces: `ShaderBotellas.tsx`: `export function ShaderBotellas({ imagenes, intervaloMs = 6000, className }: { imagenes: string[]; intervaloMs?: number; className?: string })`.

**Comportamiento (según respuesta del usuario):** las botellas NO rotan como carrusel: un shader de máscara oculta una y revela la siguiente (dissolve orgánico por ruido). El logo Mix Challenge queda FIJO delante con animación en loop muy lenta: flota ±6px vertical (ease-in-out ~5s) y tilt suave pseudo-aleatorio ±2° (dos keyframes CSS con duraciones primas, p.ej. 5s y 7.3s, para que parezca aleatorio). Detrás, arriba: logo Brugal + "ESCÁPATE / A LO EXTRAORDINARIO" (usar IMG.escapate o texto estilizado como mock 2). Tap en cualquier parte → `despachar({tipo:"IR", a:"formulario"})`.

- [ ] **Step 1: `lib/webgl-dissolve.ts`** — módulo sin React:

```ts
export interface DissolveController { destruir(): void }
export function crearDissolve(canvas: HTMLCanvasElement, urls: string[], intervaloMs: number): DissolveController | null
// null si WebGL no disponible (el caller usa fallback CSS)
```
Detalles: contexto `webgl` con `premultipliedAlpha: false`; quad fullscreen; carga las N imágenes como texturas (CLAMP_TO_EDGE, LINEAR, `UNPACK_FLIP_Y_WEBGL`); loop rAF: cada `intervaloMs` inicia transición de 1.6s entre textura actual y siguiente. Fragment shader (incluir tal cual, con value-noise 2D inline):

```glsl
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
  // m=1 → aún uFrom; m=0 → ya uTo
  vec4 a = muestra(uFrom, vUv, uScaleFrom);
  vec4 b = muestra(uTo, vUv, uScaleTo);
  vec4 col = mix(b, a, m);
  // brillo dorado en el borde de la máscara
  float glow = smoothstep(0.0, borde, abs(n - uProgress)) ;
  col.rgb += (1.0 - glow) * vec3(0.79, 0.64, 0.36) * 0.35 * step(0.001, uProgress) * step(uProgress, 0.999);
  gl_FragColor = col;
}
```
`uScale*` compensa el aspect ratio imagen/canvas (contain). Progress con easing `t*t*(3-2t)`.

- [ ] **Step 2: `ShaderBotellas.tsx`** — client component: canvas con `crearDissolve` en `useEffect` (cleanup con `destruir()`); si devuelve null → fallback: stack de `<img>` con crossfade + `mask-image: radial-gradient` animado por CSS.

- [ ] **Step 3: `Home.tsx`** — composición según mock 2/3: logo Brugal arriba, ESCÁPATE, canvas de botellas centrado (~62% alto), logo Mix Challenge delante (~55% ancho, posicionado sobre el tercio inferior de la botella) con las animaciones CSS `flotar` y `tiltear`, hint "toca para comenzar" tenue abajo. Todo el screen es un botón accesible (`role="button"`, onPointerUp).

- [ ] **Step 4: Verificación visual (dev + screenshot en 2 momentos para ver el dissolve). Commit.**

```bash
git add components lib/webgl-dissolve.ts && git commit -m "Home: dissolve WebGL entre botellas y logo neón flotante"
```

---

### Task 8: Pantalla formulario "ÚNETE AL CHALLENGE"

**Files:**
- Create: `components/pantallas/Formulario.tsx`, `lib/mascaras.ts`, `lib/mascaras.test.ts`, `lib/registro-cliente.ts`

**Interfaces:**
- Consumes: `useJuego`, `validarRegistro` (misma validación que el server, importable en cliente).
- Produces:
  - `lib/mascaras.ts`: `export function mascaraCedula(v: string): string` (va formando `000-0000000-0` mientras escribe, máx 11 dígitos), `export function mascaraTelefono(v: string): string` (`(809) 000-0000`, máx 10 dígitos).
  - `lib/registro-cliente.ts`: `export async function enviarRegistro(datos: RegistroInput): Promise<number | null>` — POST `/api/registro`; si falla (red/503) guarda `{datos, pendiente:true}` en `localStorage["mc_registro_pendiente"]` y devuelve null. `export async function reintentarPendiente(): Promise<void>` (se llama al montar la app y al terminar partida).

- [ ] **Step 1: Tests de máscaras primero:**

```ts
import { describe, it, expect } from "vitest";
import { mascaraCedula, mascaraTelefono } from "./mascaras";

it("cedula progresiva", () => {
  expect(mascaraCedula("001")).toBe("001");
  expect(mascaraCedula("0011234")).toBe("001-1234");
  expect(mascaraCedula("00112345678")).toBe("001-1234567-8");
  expect(mascaraCedula("001123456789999")).toBe("001-1234567-8");
});
it("telefono progresivo", () => {
  expect(mascaraTelefono("809")).toBe("(809");
  expect(mascaraTelefono("8095551")).toBe("(809) 555-1");
  expect(mascaraTelefono("8095551234")).toBe("(809) 555-1234");
});
```

- [ ] **Step 2: FAIL → implementar → PASS.**

- [ ] **Step 3: `Formulario.tsx`** según mock 4: título Oswald "ÚNETE AL CHALLENGE", subtítulo dorado "LLENA TUS DATOS PARA CONTINUAR", 4 campos con label dorado uppercase letter-spacing y input píldora oscuro (borde `--oro` al focus), placeholders como el mock. Botón CONTINUAR (píldora degradado dorado, texto navy). Al enviar: valida con `validarRegistro`; con error → mensajito rojo bajo el campo; si ok → `enviarRegistro()` en background (optimista) y `despachar({tipo:"REGISTRADO", id})` + `IR recetas` inmediato. Inputs `inputMode` correcto (`numeric` cédula/teléfono, `email` correo).

- [ ] **Step 4: Verificación visual + flujo. Commit** — `git commit -m "Formulario Únete al Challenge con máscaras y registro optimista"`.

---

### Task 9: Pantallas recetas, intro y listo

**Files:**
- Create: `components/pantallas/Recetas.tsx`, `components/pantallas/Intro.tsx`, `components/pantallas/Listo.tsx`

**Interfaces:**
- Consumes: `RECETAS`, `useJuego`, `IMG`.

- [ ] **Step 1: `Recetas.tsx`** (mock 5): logo Brugal arriba; 3 filas — foto del trago (izq, ~96px) + nombre Oswald + bullets `lineasReceta` en dorado con letter-spacing, separadas por hairlines doradas; abajo "ESCÁPATE / A LO EXTRAORDINARIO". CTA discreto "CONTINUAR" (o toda la pantalla tap → `IR intro` tras ≥3s para forzar lectura; usar botón para claridad).
- [ ] **Step 2: `Intro.tsx`** (mock 6): "ARMA EL MIX / PERFECTO" enorme Oswald, sub "RECUERDA LA RECETA Y COMPLETA TU TRAGO ANTES DE LLEGAR A CERO." dorado, hint parpadeante "toca para continuar...." → `IR elige-trago`.
- [ ] **Step 3: `Listo.tsx`** (mock 8): "¿LISTO PARA ARMAR EL MIX PERFECTO?" + botón INICIAR → `despachar({tipo:"INICIAR_RETO"})`.
- [ ] **Step 4: Verificación visual de las 3. Commit** — `git commit -m "Pantallas recetas, intro y listo"`.

---

### Task 10: Coverflow 3D mejorado + pantalla elige-trago

**Files:**
- Create: `components/Coverflow3D.tsx`, `components/BarraEscena.tsx`, `components/pantallas/EligeTrago.tsx`

**Interfaces:**
- Produces:
  - `BarraEscena.tsx`: `export function BarraEscena({ children }: { children: React.ReactNode })` — escena con `IMG.barra` anclada al tercio inferior (la superficie de la barra queda a ~62% de alto del marco, variable CSS `--linea-barra: 62cqh`), children se renderizan "apoyados" en esa línea. Leyenda ESCÁPATE abajo.
  - `Coverflow3D.tsx`:
    ```tsx
    export interface CoverflowItem { id: string; img: string; nombre: string }
    export function Coverflow3D({ items, onSelect, alturaItem = 34 }: {
      items: CoverflowItem[];
      onSelect: (id: string) => void;      // tap sobre el item CENTRADO
      alturaItem?: number;                  // en cqh
    }): JSX.Element;
    ```
- Consumes en `EligeTrago.tsx`: `RECETAS`, `useJuego` (`ELIGE_TRAGO` + `IR listo`).

**Calidad exigida ("mejor elaborado" que el legacy):**
- Perspectiva real: contenedor `perspective: 1100px`; cada item `translateX(d * 46cqw * factor) rotateY(d * -38deg) translateZ(-|d| * 160px) scale(1 - |d| * 0.18)` donde `d` = distancia (float) al centro.
- Laterales: `filter: brightness(.55) blur(2px)` progresivo con |d|; el central brightness 1, drop-shadow suave.
- Reflejo en la barra: pseudo-elemento/img espejada con `-webkit-box-reflect` o img duplicada `scaleY(-1)` + gradient mask, opacidad ~0.18.
- Física: pointer events (down/move/up) con arrastre 1:1; al soltar, inercia con velocidad medida y snap al índice más cercano (spring rAF, sin librerías; amortiguación crítica ~ stiffness 170 / damping 26). Wrap infinito NO: rebote suave en extremos.
- Tap (movimiento < 8px) sobre item central → `onSelect`; tap en lateral → anima hacia ese índice.
- Nombre del item centrado arriba (eyebrow "ELIGE TU TRAGO" + nombre Oswald), actualizándose con el snap.
- Área táctil generosa (todo el ancho, altura de la escena).

- [ ] **Step 1: Implementar `BarraEscena` y `Coverflow3D`** (estado en rAF con refs, re-render solo del nombre; transforms directos al DOM via ref para 60fps).
- [ ] **Step 2: `EligeTrago.tsx`**: `BarraEscena` + `Coverflow3D items={RECETAS.map(r=>({id:r.id, img:r.imgTrago, nombre:r.nombre}))}`; onSelect → `ELIGE_TRAGO` → `IR listo`.
- [ ] **Step 3: Verificación con navegador: swipe con inercia, snap, tap central. Commit** — `git commit -m "Coverflow 3D con inercia y reflejo; pantalla elige tu trago"`.

---

### Task 11: El reto con timer (vaso → ron → mezcla → grid 3×3)

**Files:**
- Create: `components/pantallas/Reto.tsx`, `components/TimerHud.tsx`, `components/GridMix.tsx`

**Interfaces:**
- Consumes: `Coverflow3D`, `BarraEscena`, `useCountdown`, `useJuego`, `VASOS`, `RONES`, `MEZCLAS`, `INGREDIENTES`, `GAME_SECONDS`.
- Produces: `Reto.tsx` renderiza las 4 sub-pantallas según `estado.pantalla` (`reto-vaso|reto-ron|reto-mezcla|reto-mix`) con el MISMO timer montado arriba (no se desmonta entre pasos: `TimerHud` vive en `Reto.tsx`).

- [ ] **Step 1: `TimerHud.tsx`** — `export function TimerHud({ formato, critico }: { formato: string; critico: boolean })`: Oswald blanco arriba-derecha (como mocks 9-12); cuando `critico` (≤10s) pulsa en rojo suave.
- [ ] **Step 2: `Reto.tsx`** — monta `useCountdown(true, GAME_SECONDS, () => despachar({tipo:"TIEMPO_AGOTADO"}))`. Sub-pantallas:
  - `reto-vaso`: eyebrow "ELIGE TU VASO", `Coverflow3D` con VASOS → `ELIGE_VASO`.
  - `reto-ron`: "ELIGE TU RÓN", RONES → `ELIGE_RON`.
  - `reto-mezcla`: "ELIGE TU MEZCLA", MEZCLAS (5 items) → `ELIGE_MEZCLA`.
  - `reto-mix`: `GridMix`.
  - El nombre bajo el eyebrow muestra el item centrado del coverflow (NO la respuesta correcta — sin pistas).
  - Transición entre pasos: fade+slide 300ms.
- [ ] **Step 3: `GridMix.tsx`** — "COMPLETA EL MIX": grid 3×3 (mock 12) de tiles (imagen + nombre chico), `estado.grid`; tap = toggle con borde dorado + check; botón MEZCLAR (deshabilitado con 0 seleccionados) → `despachar({tipo:"MEZCLAR", tiempoRestante: restanteActual})`. Sin límite de selección (pueden elegir de más: eso son "sobraron").
- [ ] **Step 4: Verificación: flujo completo con timer corriendo, dejar expirar → pantalla tiempo (Task 12 la renderiza; mientras, placeholder). Commit** — `git commit -m "Reto contra reloj: vaso, ron, mezcla y grid completa el mix"`.

---

### Task 12: Pantallas de resultado (ganaste / casi / tiempo agotado)

**Files:**
- Create: `components/pantallas/Resultado.tsx`, `lib/partida-cliente.ts`

**Interfaces:**
- Consumes: `useJuego` (`estado.resultado`, `estado.evaluacion`, `estado.receta`, `estado.elecciones`, `estado.tiempoRestante`, `estado.registroId`), `BarraEscena`, `reintentarPendiente`.
- Produces: `lib/partida-cliente.ts`: `export async function enviarPartida(p: { registroId: number | null; trago: string; resultado: "gano"|"fallo"|"tiempo"; tiempoRestante: number; detalles: unknown }): Promise<void>` (fire-and-forget, catch silencioso).

- [ ] **Step 1: `Resultado.tsx`** con 3 variantes:
  - **gano** (mock 13): "GANASTE!!" Oswald gigante, trago sobre la barra (BarraEscena), tarjeta receta al lado (nombre + `lineasReceta` en bullets dorados). Confetti sutil CSS (partículas doradas cayendo 2s, una sola vez).
  - **fallo**: título "CASI..." + sub "ASÍ ERA EL {nombre}"; checklist: filas VASO / RON / MEZCLA con ✓ dorado o ✗ rojo según `evaluacion.vasoOk/ronOk/mezclaOk`, y sección INGREDIENTES: los 3 correctos como chips — verde/dorado si lo eligió, rojo con etiqueta "TE FALTÓ" si está en `faltaron`; debajo chips grises tachados "TE SOBRÓ: X" por cada `sobraron`.
  - **tiempo** (mock 14): "UPP.. SE ACABO EL TIEMPO" + botón INICIO.
  - En las 3: al montar → `enviarPartida(...)` una vez (`useRef` guard) y `reintentarPendiente()`. Botón INICIO/VOLVER → `despachar({tipo:"REINICIAR"})`.
- [ ] **Step 2: Verificación visual de las 3 variantes (forzar estados). Commit** — `git commit -m "Resultados: ganaste, casi (con desglose) y tiempo agotado"`.

---

### Task 13: Integración final en `page.tsx`, transiciones y verificación e2e

**Files:**
- Modify: `app/page.tsx`
- Create: `components/App.tsx`, `README.md`

**Interfaces:**
- Consumes: todo lo anterior.

- [ ] **Step 1: `components/App.tsx`** — client component: `JuegoProvider` + `Marco` + switch de `estado.pantalla` → componente. Transición global entre pantallas: el contenedor de pantalla hace fade+translateY 400ms (clase `pantalla-enter`). `app/page.tsx` = `export default function Page(){ return <App/> }` con `dynamic import ssr:false` si hace falta para el canvas.
- [ ] **Step 2: Flujo completo 3 veces** (ganar, fallar, dejar expirar) en dev con `npm run assets` hecho; verificar que tras el loading NO hay más requests de imagen (pestaña Network).
- [ ] **Step 3: `npm run build && npm test` verdes.**
- [ ] **Step 4: README.md**: cómo correr (`npm i && npm run assets && npm run dev`), env vars, cómo crear la DB en Vercel (Storage → Postgres/Neon → copiar `POSTGRES_URL`), `npm run db:push`, deploy (`vercel`), y nota de que `/registros` usa `ADMIN_PASSWORD`.
- [ ] **Step 5: Commit final** — `git commit -m "Integración completa Mix Challenge + README de deploy"`.

---

## Verificación final del lead (post-plan)

1. Revisión de diseño visual contra mocks 1–14 (side-by-side).
2. `vercel build` local o deploy preview.
3. Probar `/registros` con datos reales (insertar 2 registros jugando) + export CSV abierto en Numbers/Excel.
