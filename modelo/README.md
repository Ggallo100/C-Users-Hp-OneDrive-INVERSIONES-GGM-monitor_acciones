# Canalización de estimación del modelo de proyección de matrícula

El modelo se entrega compilado en `../modelo_proyeccion_matricula.html`, que
funciona sin instalación y lleva dentro los conteos de transición y el motor de
cálculo. Esta carpeta contiene lo necesario para **regenerarlo con una base
histórica actualizada**, que es lo que hay que hacer al cerrar cada semestre.

## Cuándo hace falta regenerar

El HTML puede reestimarse a sí mismo desde «Parámetros avanzados»: recalcula la
ponderación de recencia y las constantes de contracción sobre los conteos que ya
lleva dentro. Lo que **no** puede hacer solo es incorporar semestres nuevos. Para
eso hay que volver a ejecutar esta canalización.

## Requisitos

```
pip install pandas numpy scipy statsmodels openpyxl
node --version    # para las pruebas del motor (opcional)
```

## Pasos

Desde esta carpeta, con la ruta del Excel histórico actualizada en `RUTA`
(constante al inicio de `estimar.py`):

```bash
python3 estimar.py       # 1. barrido de λ por backtesting de origen móvil
python3 fase2.py         # 2. varianza, calibración de escenarios y parametros.json
python3 compactar.py     # 3. conteos por periodo en formato compacto
python3 construir_html.py  # 4. ensambla el HTML final
```

El paso 1 imprime la rejilla de λ y selecciona el valor que minimiza el error
fuera de muestra. Si el λ seleccionado cambia respecto de 0,50, hay que
actualizarlo en la constante `LAM` de `fase2.py` y en el valor por defecto del
control del HTML (`p6_interfaz.js`), y volver a ejecutar desde el paso 2.

## Qué hace cada archivo

| Archivo | Cometido |
|---|---|
| `estimar.py` | Implementación de referencia: panel de transiciones, contracción empírico-Bayes, GLM de descomposición de varianza, motor de proyección y backtesting. Es la fuente de verdad contra la que se verifica el motor JavaScript. |
| `fase2.py` | Calibra el factor de inflación de varianza κ contra la cobertura observada y escribe `parametros.json`. |
| `compactar.py` | Empaqueta los conteos de transición por periodo en arreglos indexados (~120 KB) que se incrustan en el HTML. |
| `construir_html.py` | Ensambla las piezas de `fuente/` con los datos y escribe el HTML final. |

## Verificación

`fuente/prueba_motor.js` comprueba que el motor JavaScript reproduce la
implementación de Python sobre el mismo conjunto de parámetros. Las estimaciones
puntuales deben coincidir en el orden de 10⁻¹⁰ y las constantes de contracción
en sus diez primeros decimales; la desviación típica tolera ~10⁻⁷ relativo por el
orden de acumulación en coma flotante.

`fuente/probar_html.js` abre el HTML generado en un navegador real, comprueba que
no hay errores de consola, que los escenarios son aditivos y que no hay
desbordamiento horizontal ni a 1440 px ni a 400 px.

```bash
cd fuente
node prueba_motor.js
node probar_html.js
```

## Nota sobre el semestre en curso

Al extraer la base, comprobar si el último semestre tiene la matrícula cerrada.
En la base de 2026 el semestre 2026-II seguía admitiendo altas en la fecha de
extracción, lo que introduce un sesgo aparente en las comparaciones de validación
que apuntan a ese semestre. Está documentado en el apartado 8.4 del documento.
