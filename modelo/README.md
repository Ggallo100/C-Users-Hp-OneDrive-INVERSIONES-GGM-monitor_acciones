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
| Continuidad | siempre | Clasificación oficial de la base central. El rezago fija el reinicio; el reparto regular/recuperado se estima (`r`). |
| Ciclo | 15,1 % | Matriz de avance estimada. El de ingreso se estima cuando el archivo no lo declara. |
| Turno | 21,5 % | Matriz de transición estimada. |

La **continuidad de la matrícula** es la clasificación oficial de la
universidad, tomada del campo `Condicion` de su base central
(`BD_GENERAL_CONSOLIDADO.xlsx`), que registra con qué estado académico cerró el
estudiante el semestre anterior. Son cinco:

| Condición | Definición | Peso |
|---|---|---|
| Ingresante | primera matrícula; lo declara el archivo de entrada | 13–34 % |
| Regular | cerró el semestre anterior ACTIVO, TERMINÓ MALLA o EGRESADO | 61–83 % |
| Recuperado | **no** cerró el semestre anterior (abandono, retiro, inhabilitación) y aun así se matricula al siguiente | 0,52–0,85 % |
| Reinicio | interrumpió uno o más semestres y volvió | 3,2–4,3 % |
| Ingresante nueva admisión | vuelve de una ausencia larga por esa vía; no sale del archivo de entrada, lo genera el modelo | 0,24–0,45 % |

`central.py` reconstruye esa regla y coincide con el campo `Tipo_estudiante`
oficial en el **99,63 %** de 97 162 matrículas. La regla es:

    brecha ≥ 2 semestres            -> Reinicio (o Ingresante nueva admisión)
    brecha 1 y cierre anterior ACTIVO  -> Regular
    brecha 1 y cierre anterior no ACTIVO -> Recuperado
    sin matrícula previa             -> Ingresante

> **El histórico de matriculados no permite reproducirla.** No trae el campo
> `Condicion`, y sin él regular y recuperado no se distinguen. El salto de ciclo
> **no** sirve como sustituto: el 81,8 % de los recuperados repite ciclo, pero
> sólo el 8,1 % de quienes repiten ciclo son recuperados, de modo que esa regla
> da una categoría diez veces mayor que la real. Por eso la continuación, el
> avance y `r` se estiman sobre el panel de la base central, realineado al índice
> de periodos del histórico y truncado en el mismo corte durante el backtesting.
> El turno sigue saliendo del histórico, con la aproximación de tres condiciones
> que sí es derivable de él (`estimar.condicion_de`).

`r = P(recuperado | rezago 1)` es el **único parámetro nuevo** que exige la
clasificación oficial: 0,83 % global, contraído en cascada
`global → ciclo → condición×ciclo → modalidad×condición×ciclo → carrera` con
k = 27,4. La condición de origen es el nivel que más informa: quien llega como
recuperado vuelve a serlo el 21,2 % de las veces frente al 0,6 % de un regular.

Comportamiento comparado (panel de la base central, orígenes con destino
observable):

| Condición | n | Continúa | Avanza | Repite |
|---|---|---|---|---|
| Regular | 56 040 | 85,5 % | 89,2 % | 8,7 % |
| Ingr. nueva admisión | 260 | 72,7 % | 90,0 % | 6,4 % |
| Recuperado | 489 | 63,8 % | 61,2 % | 36,5 % |
| Reinicio | 2 658 | 61,2 % | 79,3 % | 15,0 % |
| Ingresante | 16 328 | 60,7 % | 95,3 % | 4,6 % |

> **Dos semestres de la base central no son utilizables.** En 2023-I todos los
> continuadores figuran como «Reinicio» (7 855) porque es el primer semestre
> cargado; en 2026-II sólo hay 708 filas porque la extracción es del 18 de junio
> de 2026. Los ciclos de verano tampoco. Quedan seis semestres y 97 162
> matrículas, frente a los ocho del histórico.

> **La marca `Desertor` tampoco sirve.** Su regla interna es «no se matriculó el
> semestre inmediato siguiente» —exacta en los seis semestres cerrados, con cero
> excepciones— y por construcción excluye a quien sí se matriculó, que es justo
> el recuperado. Además está congelada a una fecha anterior a la campaña de
> 2026-II. Ver `descriptivos.py`.

> **El backtesting se mide contra objetivos cerrados.** El último semestre del
> histórico sigue admitiendo altas, así que como objetivo está censurado por
> abajo y premia a cualquier especificación que proyecte de menos. `rejilla.py` y
> `ablacion.py` informan las dos series y seleccionan sobre la cerrada. Con ella:
> EPAP del total 1,04 %, sesgo −10; con el semestre parcial dentro, 1,51 % y
> +199.

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
| `central.py` | Lee la base central de la universidad y reconstruye la clasificación oficial de la condición. Es la autoridad sobre regular / recuperado / reinicio / ingresante nueva admisión, y el panel que produce alimenta la continuación, el avance y `r`. Ejecutado directamente imprime el contraste contra `Tipo_estudiante`. |
| `rejilla.py` | Selección de λ por backtesting de origen móvil, con criterio minimax sobre las series indexadas, medido sobre los objetivos cerrados. Escribe `grid_lambda.json`. |
| `cobertura.py` | Cobertura empírica de la banda de escenarios frente a la del intervalo de predicción. Alimenta la tabla del capítulo 7 del documento. |
| `paridad.py` | Reagrega `compacto.json` con la misma aritmética que el motor JavaScript y escribe `paridad_py.json`, la referencia contra la que se verifica. |
| `ablacion.py` | Contraste de especificación: ejecuta la canalización completa con y sin una dimensión y compara el error en los niveles comunes, con y sin el semestre parcial como objetivo. Admite `modalidad` o `condicion` como argumento. |
| `preparar_prueba.py` | Genera los dos archivos de ingresantes de prueba, con y sin columna de modalidad. |
| `repartir_ingresantes.py` | Reparte un total de ingresantes por semestre, sede, carrera y modalidad entre los ciclos donde el histórico registra convalidaciones. Excel de entrada sin columna Ciclo, Excel de salida con ella, listo para cargar en el modelo. Sin argumentos escribe sólo el cuadro de tasas aplicadas. |
| `tablas_condicion.py` | Genera `../tablas_continuadores.xlsx`: la matrícula clasificada por la condición **oficial** de la base central a lo largo de los seis semestres utilizables, abierta por carrera, por modalidad y por ciclo, más una hoja de detalle en formato largo para tablas dinámicas. |
| `cifras_documento.py` | Recalcula todas las cifras de la clasificación oficial que cita el documento: composición por condición y semestre, contraste con `Tipo_estudiante`, comportamiento y reincidencia de cada condición, `r` por ciclo y modalidad, anexos A.1, A.3 y A.6, y el flujo de nueva admisión. Escribe `cifras_documento.txt`. |
| `descriptivos.py` | Recalcula las cifras descriptivas del **histórico** que citan los capítulos 1, 4 y 5 (cobertura, composición por modalidad, rezagos, turno, ciclo terminal, la marca `Desertor`). Lo que llame «condición» es la aproximación de tres categorías, no la oficial: para esa usar `cifras_documento.py`. |

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

`fuente/probar_sin_ciclo.js` carga el mismo archivo de ingresantes con y sin la
columna `Ciclo` y comprueba que el reparto estimado conserva el total exacto y
reproduce el perfil observado.

```bash
python3 paridad.py              # referencia de Python para la prueba de paridad
python3 preparar_prueba.py      # genera los archivos de entrada de prueba
cd fuente
node prueba_motor.js
node probar_html.js
node probar_ciclo.js
node verificar_casos.js
node probar_sin_ciclo.js
```

## El ciclo de ingreso de los ingresantes

El archivo de entrada puede omitir la columna `Ciclo`. El 96,2 % de los
ingresantes históricos entra en el primero, pero 1 205 no: son convalidaciones
de estudios previos, y la edad media lo confirma —26,2 años en el ciclo 1 frente
a 34,0 en el 4—. El reparto se estima en dos partes, porque los datos se
comportan distinto en cada una:

| | Qué mide | Cuánto varía | Contracción |
|---|---|---|---|
| **Nivel** | P(entra por encima del ciclo 1) | del 0,2 % de Obstetricia al 19,7 % de Contabilidad; χ² = 1 643 con 17 g.l. | Beta-Binomial, cascada global → paridad → modalidad·paridad → carrera·paridad → carrera·modalidad·paridad → celda |
| **Forma** | P(ciclo \| entra alto) | casi universal: 57 % al 2, 21 % al 3, 13 % al 4, 9 % al 5+ | Dirichlet, cascada global → modalidad → carrera → carrera·modalidad |

La paridad entra en el nivel y no por capricho: la cuota es del 2,5 % al 2,7 % en
los primeros semestres y del 4,9 % al 5,9 % en los segundos, pero el recuento de
convalidados es estable (129 a 172 de media) mientras que la campaña de ciclo 1
se duplica. Lo que cambia es el denominador.

El reparto respeta tres topes —el ciclo terminal del plan, la maduración de una
sede nueva y la de un programa nuevo— y usa el método del resto mayor para que la
suma coincida exactamente con el total declarado.

Un **programa sin historia** merece mención aparte: en el semestre en que aparece
por primera vez sólo imparte el ciclo 1, de modo que todos sus ingresantes van
ahí; despliega un ciclo más en cada semestre siguiente, conforme avanza su
primera cohorte. Es la misma maduración que la de una sede nueva y responde al
mismo hecho físico: no se puede convalidar hacia un ciclo que todavía no existe.
El ciclo base es el mayor declarado en el semestre de apertura, por si el
programa se lanza convalidando desde otro afín.

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
En la base del 14 de septiembre de 2026 el semestre 2026-II seguía admitiendo
altas, aunque ya al 99 % de su campaña: faltan del orden de doscientas
matrículas. Eso deja un sesgo residual de +126 estudiantes en las comparaciones
de validación que apuntan a ese semestre. El apartado 8.4 del documento lo
documenta y contrasta las dos extracciones de esta misma base —la del 10 y la del
14 de septiembre— para mostrar el efecto: 196 matrículas nuevas redujeron ese
sesgo a la mitad y el error del total una cuarta parte.
