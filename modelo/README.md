# Canalización de estimación del modelo de proyección de matrícula

El modelo se entrega compilado en `../modelo_proyeccion_matricula.html`, que
funciona sin instalación y lleva dentro los conteos de transición y el motor de
cálculo. Esta carpeta contiene lo necesario para **regenerarlo con una base
histórica actualizada**, que es lo que hay que hacer al cerrar cada semestre, y
para **reconstruir el documento Word** que lo explica.

## Dimensiones del estado

El estado del modelo es
`(sede, carrera, modalidad de estudios, continuidad de la matrícula, ciclo, turno)`.

| Índice | Cambia | Tratamiento |
|---|---|---|
| Sede | 0 % | Se conserva. |
| Modalidad | 0,56 % | Se conserva; condiciona las tres probabilidades. |
| Carrera | 0,43 % | Se conserva. |
| Continuidad | siempre | La fijan el rezago y el salto de ciclo del flujo; sin parámetros. |
| Ciclo | 15,1 % | Matriz de avance estimada. |
| Turno | 21,5 % | Matriz de transición estimada. |

La **continuidad de la matrícula** distingue tres condiciones de continuador. El
*regular* se matricula el semestre inmediato y cambia de ciclo. El *recuperado*
también se matricula el semestre inmediato, pero vuelve al **mismo ciclo**:
perdió el que cursaba —figura como desertor de ese ciclo— y lo retoma. El
*reiniciado* interrumpió uno o más semestres y volvió. El *ingresante* ocupa la
dimensión sólo en su primer semestre. No se declara en ningún sitio ni necesita
matriz de transición: la determinan el rezago y el salto de ciclo del propio
flujo (L ≥ 2 reiniciado; L = 1 con Δ = 0 recuperado; L = 1 con Δ ≠ 0 regular), de
modo que el desglose de las tablas de resultados sale de la recursión y suma
exactamente el total.

Es el factor de mayor magnitud del modelo, y separa dos riesgos distintos: el
reiniciado se cae de la matrícula (continúa el 58,2 % frente al 86,0 % de un
regular, y la brecha no se cierra en todo el plan), mientras que el recuperado se
queda pero no avanza (continúa el 70,7 %, pero sólo el 57,4 % cambia de ciclo y
uno de cada cinco repite otra vez), de modo que se acumula en los ciclos bajos.

> **La marca `Desertor` de la base no sirve para esto.** Su regla interna es «no
> se matriculó el semestre inmediato siguiente» —exacta en los seis semestres
> cerrados, con cero excepciones— y por construcción excluye a quien sí se
> matriculó, que es justo el recuperado. Además está congelada a una fecha
> anterior a la campaña de 2026-II, lo que marca como desertores al 65,5 % de
> 2026-I y al 0 % de 2026-II. La condición se deriva del panel de matrículas.
> Ver `descriptivos.py`.

## Cuándo hace falta regenerar

El HTML puede reestimarse a sí mismo desde «Parámetros avanzados»: recalcula la
ponderación de recencia y las constantes de contracción sobre los conteos que ya
lleva dentro. Lo que **no** puede hacer solo es incorporar semestres nuevos. Para
eso hay que volver a ejecutar esta canalización.

## Requisitos

```
pip install pandas numpy scipy statsmodels openpyxl python-docx
npm install                    # en documento/, para la biblioteca docx
node --version                 # para las pruebas del motor y las capturas
```

## Pasos

Desde esta carpeta, con la ruta del Excel histórico actualizada en `RUTA`
(constante al inicio de `estimar.py`):

```bash
python3 compactar.py       # 1. conteos por periodo en formato compacto
python3 rejilla.py         # 2. selección de λ por backtesting de origen móvil
python3 fase2.py           # 3. varianza, calibración de κ y parametros.json
python3 cobertura.py       # 4. cobertura de escenarios vs intervalo (para el documento)
python3 construir_html.py  # 5. ensambla el HTML final
python3 paridad.py         # 6. referencia para la prueba de paridad del motor JS
python3 descriptivos.py    # 7. cifras descriptivas para las tablas del documento
```

Los pasos 2 a 4 tardan varios minutos cada uno: reestiman el modelo completo en
cada punto de la rejilla y en cada origen del backtesting.

`rejilla.py` recorre la rejilla de λ y selecciona el valor por un criterio
**minimax** sobre las series de EPAP indexadas cada una a su propio mínimo: se
elige la λ que acota el peor sobrecoste relativo entre los ocho niveles de
agregación. Se indexa porque el error del cruce más fino es veinte veces mayor
que el del total; y se usa minimax en vez de la media porque la media la decide
el nivel con mayor recorrido relativo, que no es el mismo en todas las
especificaciones.

Si el λ seleccionado cambia respecto de 1,00 hay que actualizar la constante
`LAM` de `fase2.py` y `paridad.py` y volver a ejecutar desde el paso 2. El valor
por defecto del control del HTML no hace falta tocarlo: la interfaz lo lee de
`grid_lambda.json`.

> **La posición de λ en la rejilla es un diagnóstico.** Un óptimo pegado al borde
> **inferior** indica que falta una variable relevante: el estimador quiere
> olvidar deprisa una deriva que no puede ver. Un óptimo cerca del borde
> **superior** (λ = 1, sin descuento) es lo contrario, y además el modelo más
> simple. Este modelo recorrió la rejilla de un extremo al otro a medida que se
> incorporaron la modalidad y la continuidad: 0,30 → 0,40 → 1,00. Ver
> `ablacion.py` y los apartados 6.5 a 6.7 del documento.

## Qué hace cada archivo

| Archivo | Cometido |
|---|---|
| `estimar.py` | Implementación de referencia: panel de transiciones, contracción empírico-Bayes, GLM de descomposición de varianza, motor de proyección y backtesting. Es la fuente de verdad contra la que se verifica el motor JavaScript. |
| `fase2.py` | Calibra el factor de inflación de varianza κ contra la cobertura observada y escribe `parametros.json`. |
| `compactar.py` | Empaqueta los conteos de transición por periodo en arreglos indexados (~450 KB) que se incrustan en el HTML, incluida la tabla de oferta `(sede, carrera, modalidad)`. |
| `construir_html.py` | Ensambla las piezas de `fuente/` con los datos y escribe el HTML final. |
| `rejilla.py` | Selección de λ por backtesting de origen móvil, con criterio minimax sobre las series indexadas. Escribe `grid_lambda.json`. |
| `cobertura.py` | Cobertura empírica de la banda de escenarios frente a la del intervalo de predicción. Alimenta la tabla del capítulo 7 del documento. |
| `paridad.py` | Reagrega `compacto.json` con la misma aritmética que el motor JavaScript y escribe `paridad_py.json`, la referencia contra la que se verifica. |
| `ablacion.py` | Contraste de especificación: ejecuta la canalización completa con y sin una dimensión y compara el error en los niveles comunes. Admite `modalidad` o `condicion` como argumento. |
| `preparar_prueba.py` | Genera los dos archivos de ingresantes de prueba, con y sin columna de modalidad. |
| `descriptivos.py` | Recalcula las cifras descriptivas que citan los capítulos 1, 4 y 5 del documento (composición por condición, retención y avance de cada una, decaimiento de la cicatriz, permanencia de turno). No forma parte de la estimación: evita tener que rehacerlas a mano al actualizar la base. |

## Verificación

`fuente/prueba_motor.js` comprueba que el motor JavaScript reproduce la
implementación de Python. Sobre seis semestres proyectados, los totales, las
desviaciones típicas y los desgloses por modalidad y por continuidad coinciden
con una diferencia relativa del orden de 10⁻¹⁶ —el epsilon de la doble
precisión— y las constantes de contracción del orden de 10⁻¹⁵. El umbral del
script es 10⁻⁶ relativo, mucho más laxo que cualquier error de lógica.

`fuente/probar_html.js` abre el HTML generado en un navegador real, comprueba que
no hay errores de consola, que los escenarios son aditivos y que no hay
desbordamiento horizontal ni a 1440 px ni a 400 px.

`fuente/probar_ciclo.js` recorre el ciclo completo de extremo a extremo: descarga
la plantilla, carga un archivo de ingresantes y exporta la proyección.

`fuente/verificar_casos.js` comprueba los casos límite que documenta el capítulo
10: programa nuevo en las tres modalidades y sede nueva con traslados a un ciclo
que todavía no puede ofertar.

```bash
python3 paridad.py              # referencia de Python para la prueba de paridad
python3 preparar_prueba.py      # genera los archivos de entrada de prueba
cd fuente
node prueba_motor.js
node probar_html.js
node probar_ciclo.js
node verificar_casos.js
```

## El documento Word

`documento/` reconstruye `../Modelo_Proyeccion_Matricula.docx` a partir de las
capturas de `documento/capturas/`, que genera `fuente/capturar.js` sobre el HTML
ya compilado. Son 21 figuras.

```bash
cd fuente && node capturar.js      # regenera las figuras del documento
cd ../documento && node doc_construir.js && python3 validate.py
```

`validate.py` comprueba la integridad del paquete OPC: XML bien formado, cada
relación apuntando a una parte existente, cada imagen presente, filas de tabla
homogéneas y apertura correcta con python-docx. `ver_docx.py` produce además un
render aproximado en HTML para inspección visual, porque LibreOffice no puede
abrir docx en este entorno.

Al cambiar cualquier cifra del modelo hay que revisar las tablas del documento:
están escritas a mano en `doc_parte2.js` a `doc_parte4.js` y no se generan desde
`parametros.json`.

## Nota sobre el semestre en curso

Al extraer la base, comprobar si el último semestre tiene la matrícula cerrada.
En la base de 2026 el semestre 2026-II seguía admitiendo altas en la fecha de
extracción, lo que introduce un sesgo aparente en las comparaciones de validación
que apuntan a ese semestre. Está documentado en el apartado 8.4 del documento.
