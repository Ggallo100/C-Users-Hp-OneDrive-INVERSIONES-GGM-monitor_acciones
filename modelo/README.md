# Canalización de estimación del modelo de proyección de matrícula

El modelo se entrega compilado en `../modelo_proyeccion_matricula.html`, que
funciona sin instalación y lleva dentro los conteos de transición y el motor de
cálculo. Esta carpeta contiene lo necesario para **regenerarlo con una base
histórica actualizada**, que es lo que hay que hacer al cerrar cada semestre, y
para **reconstruir el documento Word** que lo explica.

## Dimensiones del estado

El estado del modelo es `(sede, carrera, modalidad de estudios, ciclo, turno)`.
La sede, la carrera y la modalidad se conservan a lo largo de la proyección —el
99,4 % de los continuadores mantiene su modalidad de un semestre al siguiente—;
el ciclo y el turno llevan matriz de transición estimada. La modalidad entra en
la escalera de contracción entre el ciclo y la carrera y condiciona las tres
probabilidades de la recursión: continuación, avance de ciclo y turno.

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
python3 estimar.py         # 1. barrido de λ por backtesting de origen móvil
python3 fase2.py           # 2. varianza, calibración de escenarios y parametros.json
python3 compactar.py       # 3. conteos por periodo en formato compacto
python3 construir_html.py  # 4. ensambla el HTML final
```

El paso 1 imprime la rejilla de λ y selecciona el valor que minimiza el error
fuera de muestra. El criterio es la media de las series de EPAP indexadas cada
una a su propio mínimo, porque el error del cruce más fino es veinte veces mayor
que el del total y dominaría cualquier media directa. Si el λ seleccionado cambia
respecto de 0,65, hay que actualizarlo en la constante `LAM` de `fase2.py` y en
el valor por defecto del control del HTML (`fuente/p2_cuerpo.html`), y volver a
ejecutar desde el paso 2.

> Un λ seleccionado en el **borde** de la rejilla es señal de que falta una
> variable relevante en la especificación, no de que convenga estrechar más la
> ventana. Ocurría antes de incorporar la modalidad: la recencia estaba haciendo
> de variable omitida. Ver `ablacion.py` y el apartado 6.5 del documento.

## Qué hace cada archivo

| Archivo | Cometido |
|---|---|
| `estimar.py` | Implementación de referencia: panel de transiciones, contracción empírico-Bayes, GLM de descomposición de varianza, motor de proyección y backtesting. Es la fuente de verdad contra la que se verifica el motor JavaScript. |
| `fase2.py` | Calibra el factor de inflación de varianza κ contra la cobertura observada y escribe `parametros.json`. |
| `compactar.py` | Empaqueta los conteos de transición por periodo en arreglos indexados (~215 KB) que se incrustan en el HTML, incluida la tabla de oferta `(sede, carrera, modalidad)`. |
| `construir_html.py` | Ensambla las piezas de `fuente/` con los datos y escribe el HTML final. |
| `ablacion.py` | Contraste de especificación: ejecuta la canalización completa con y sin la dimensión de modalidad y compara el error en los niveles de agregación comunes. |
| `preparar_prueba.py` | Genera los dos archivos de ingresantes de prueba, con y sin columna de modalidad. |

## Verificación

`fuente/prueba_motor.js` comprueba que el motor JavaScript reproduce la
implementación de Python sobre el mismo conjunto de parámetros. Las estimaciones
puntuales deben coincidir en el orden de 10⁻¹⁰ y las constantes de contracción
en sus diez primeros decimales; la desviación típica tolera ~10⁻⁷ relativo por el
orden de acumulación en coma flotante.

`fuente/probar_html.js` abre el HTML generado en un navegador real, comprueba que
no hay errores de consola, que los escenarios son aditivos y que no hay
desbordamiento horizontal ni a 1440 px ni a 400 px.

`fuente/probar_ciclo.js` recorre el ciclo completo de extremo a extremo: descarga
la plantilla, carga un archivo de ingresantes y exporta la proyección.

`fuente/verificar_casos.js` comprueba los casos límite que documenta el capítulo
10: programa nuevo en las tres modalidades y sede nueva con traslados a un ciclo
que todavía no puede ofertar.

```bash
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
ya compilado.

```bash
cd fuente && node capturar.js      # regenera las 19 figuras del documento
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
