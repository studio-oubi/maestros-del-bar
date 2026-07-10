# Licencias de assets externos en stock/

Todo el resto de stock/ sale de fuentes YA propiedad del cliente (legacy/assets,
"New design "/, o generadas para el cliente con Gemini) — recortes de sus
propios renders o fotos de producto generadas por nosotros. Este archivo
documenta el ÚNICO asset externo usado en el juego.

## stock/fuentes-gemini/*.png → stock/mixer-*.png (7 botellas de mezclas)

Fotos de producto generadas con Gemini (Nano Banana Pro) por nosotros para
este proyecto — sin restricción de terceros, uso exclusivo del cliente. Cada
una viene con la etiqueta navy/oro (`#0a1a3a` / `#c9a84c`) y el texto de la
mezcla ya generados por el modelo, sobre fondo de estudio blanco; el fondo se
quita con `scripts/lib/quitar-fondo.mjs` (flood-fill + detección de textura,
sin herramientas externas) antes de empaquetar. Reemplazan a las botellas
reetiquetadas a mano de la primera pasada (ver commit 692312e para ese
método, que sigue disponible en scripts/lib/etiqueta-generica.mjs y se usa
para ing-demerara más abajo).

- zumo-limon.png → mixer-zumo-limon.png (ZUMO DE LIMÓN)
- sirope-albahaca.png → mixer-sirope-albahaca.png (SIROPE DE ALBAHACA)
- zumo-toronja.png → mixer-zumo-toronja.png (ZUMO DE TORONJA)
- sirope-simple.png → mixer-sirope-simple.png (SIROPE SIMPLE)
- bitter-naranja.png → mixer-bitter-naranja.png (BITTER DE NARANJA)
- agua-gas.png → mixer-agua-gas.png (AGUA CON GAS)
- soda.png → mixer-soda.png (SODA)

## stock/_fuentes/star-aniseed-pd.jpg → stock/ing-anis.png

- **Título**: "Star aniseed.jpg"
- **Fuente**: Wikimedia Commons
- **URL**: https://commons.wikimedia.org/wiki/File:Star_aniseed.jpg
- **URL directa del archivo**: https://upload.wikimedia.org/wikipedia/commons/a/a9/Star_aniseed.jpg
- **Licencia**: Dominio Público (Public Domain) — sin atribución obligatoria, uso comercial permitido.
- **Uso en el juego**: recorte cuadrado de 2-3 piezas de anís estrellado
  (con exposición/contraste subidos para que se lea como medallón chico),
  `stock/ing-anis.png`, empaquetado como `public/img/ing-anis.webp` por
  scripts/build-assets.mjs. Ingrediente "ANÍS" del grid de Completa.
