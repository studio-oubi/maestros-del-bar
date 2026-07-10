# Mix Challenge

Juego web (Next.js 15 / React 19) para el activation de Brugal "Mix Challenge": el
usuario memoriza una receta, arma su trago contra reloj (vaso, rón, mezcla e
ingredientes) y al final se registra su intento. Pensado para correr a pantalla
completa en un tótem/tablet vertical.

## Correr en local

```bash
npm i
npm run assets   # genera public/img/* desde los originales (ver scripts/build-assets.mjs)
npm run dev
```

Abre `http://localhost:3000`. `npm run assets` debe correrse al menos una vez antes
de `npm run dev`/`npm run build` — sin eso el manifiesto de imágenes
(`lib/asset-manifest.ts`) apunta a archivos que no existen. `npm run build` ya lo
hace por ti (ver más abajo), pero en dev hay que correrlo a mano tras clonar el repo
o cambiar los assets de origen.

Otros scripts:

```bash
npm test        # vitest run — suite unitaria (recetas, validación, máscaras, etc.)
npm run build   # npm run assets + next build
```

## Variables de entorno

Copia `.env.example` a `.env.local` y completa:

| Variable         | Para qué sirve                                                        |
| ---------------- | ---------------------------------------------------------------------- |
| `POSTGRES_URL`   | Conexión a la base de datos (Postgres/Neon) donde se guardan los registros de jugadores y las partidas. |
| `ADMIN_PASSWORD` | Contraseña para entrar al panel `/registros`.                          |
| `ADMIN_SECRET`   | Secreto para firmar la sesión de admin (cookie HMAC, ver `lib/admin-auth.ts`). Usa un valor largo y aleatorio. |

Sin `POSTGRES_URL` el juego sigue funcionando: los registros que fallan al
enviarse se guardan en `localStorage` y se reintentan solos (`lib/registro-cliente.ts`),
así que nunca bloquean la partida.

## Deploy en Vercel

1. Crea el proyecto en Vercel apuntando a este repo (o `vercel` desde la CLI).
2. En la pestaña **Storage** del proyecto, añade una base de datos **Postgres**
   (Neon). Esto crea las variables de entorno de conexión automáticamente.
3. Copia el valor de `POSTGRES_URL` (o el que Vercel haya nombrado) a las
   variables de entorno del proyecto si no quedó ya seteado, y añade también
   `ADMIN_PASSWORD` y `ADMIN_SECRET`.
4. Con `POSTGRES_URL` disponible en tu máquina (`vercel env pull` o pegado en
   `.env.local`), corre las migraciones:
   ```bash
   npm run db:push
   ```
5. Haz deploy (`vercel --prod` o push a la rama conectada). El `build` script
   corre `npm run assets` antes de `next build`, así que las imágenes se
   generan solas en cada build — no hace falta commitear `public/img`.

## Panel de registros

`/registros` muestra los registros de jugadores (nombre, cédula, teléfono,
correo, resultado) capturados durante el evento. Está protegido por
`ADMIN_PASSWORD`; al entrar la sesión queda firmada con `ADMIN_SECRET` por 24h
(`lib/admin-auth.ts`). Desde ahí se puede exportar todo a CSV
(`/registros/export`) para abrir en Excel/Numbers.

## Estructura

- `components/App.tsx` — integración final: `JuegoProvider` + `Marco` + switch
  de pantallas + transición global entre ellas + `NavBotones`.
- `lib/juego.tsx` — estado del juego (reducer) y las pantallas posibles.
- `components/pantallas/*` — una pantalla por archivo (Home, Formulario,
  Recetas, Intro, EligeTrago, Listo, Reto, Resultado).
- `lib/recetas.ts` — datos de las recetas, vasos, rones, mezclas e ingredientes,
  y la lógica de evaluación del reto.
- `app/api/registro`, `app/api/partida` — endpoints que guardan el registro del
  jugador y el resultado de la partida.
