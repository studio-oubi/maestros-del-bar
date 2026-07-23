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
