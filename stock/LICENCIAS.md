# Licencias de assets en stock/

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
