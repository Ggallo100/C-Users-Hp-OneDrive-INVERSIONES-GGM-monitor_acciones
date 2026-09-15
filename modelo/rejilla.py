#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Selección de la ponderación de recencia λ por backtesting de origen móvil.

Cada serie de EPAP se indexa a su propio mínimo, porque el error del cruce más
fino es veinte veces mayor que el del total y dominaría cualquier media directa.
Sobre esas series indexadas el criterio es MINIMAX: se elige la λ que minimiza
el peor sobrecoste relativo entre todos los niveles.

La media de las series indexadas —el criterio de la revisión anterior— resulta
sensible a qué nivel tiene el mayor recorrido relativo, que no es el mismo en
todas las especificaciones: aquí el total varía un 26 % entre los extremos de la
rejilla y el cruce fino sólo un 3 %, de modo que la media la decide el total.
El minimax no tiene ese sesgo: acota lo que pierde el nivel peor servido. Ambos
criterios se informan, y en esta estimación coinciden en la práctica.

Escribe `grid_lambda.json`, que se incrusta en el HTML para que el usuario
pueda ver la curva que justifica el valor por defecto.
"""
import json
import os

import numpy as np
import pandas as pd

import estimar as E

AQUI = os.path.dirname(os.path.abspath(__file__))
REJILLA = [1.0, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.4, 0.3]
LAM_N = 0.30

# Series que entran en el criterio, con la clave corta que usa el HTML.
SERIES = {
    "total": "Total",
    "cond": "Condición",
    "mod": "Modalidad",
    "sc": "Sede×Carrera",
    "scm": "Sede×Carrera×Modalidad",
    "scmc": "Sede×Carrera×Modalidad×Condición",
    "sci": "Sede×Carrera×Modalidad×Condición×Ciclo",
    "turno": "Sede×Carrera×Modalidad×Condición×Ciclo×Turno",
}


# El último semestre del histórico sigue admitiendo altas en la fecha de
# extracción. Como OBJETIVO del backtesting está censurado: cualquier ajuste
# que proyecte de menos parecerá acertar más, y λ es justamente la palanca que
# baja el nivel proyectado. Seleccionar λ contra un objetivo censurado sesgaría
# la elección hacia el olvido, así que el criterio se calcula sobre los
# objetivos cerrados y la serie completa se informa al lado.
PARCIAL = 202602


def main():
    df = E.cargar()
    b, per, idx = E.panel(df)
    stock, nuevos = E.stock_observado(b), E.nuevos_observados(b)

    filas = []
    for lam in REJILLA:
        bt = E.backtest(b, per, stock, nuevos, lam, LAM_N)
        cer = bt[bt.periodo != PARCIAL]
        f = {"lam": lam}
        for corto, nivel in SERIES.items():
            f[corto] = float(cer[cer.nivel == nivel]["epap"].mean())
            f[corto + "_todo"] = float(bt[bt.nivel == nivel]["epap"].mean())
        f["sesgo"] = float(cer[cer.nivel == "Total"]["sesgo"].mean())
        f["sesgo_todo"] = float(bt[bt.nivel == "Total"]["sesgo"].mean())
        filas.append(f)
        print("λ=%.2f  " % lam + "  ".join("%s %.3f%%" % (c, f[c] * 100) for c in SERIES)
              + "  sesgo %+.0f" % f["sesgo"]
              + "   | con parcial: total %.3f%% sesgo %+.0f"
                % (f["total_todo"] * 100, f["sesgo_todo"]), flush=True)

    r = pd.DataFrame(filas).set_index("lam")
    ind = r[list(SERIES)] / r[list(SERIES)].min()
    r["media"] = ind.mean(axis=1)
    r["peor"] = ind.max(axis=1)
    lam_sel = float(r["peor"].idxmin())
    lam_media = float(r["media"].idxmin())

    print("\n=== EPAP con TODOS los objetivos, incluido el semestre parcial ===")
    print((r[[c + "_todo" for c in SERIES]] * 100).round(3).to_string())
    print("\n=== series indexadas sobre objetivos CERRADOS (100 = mejor λ de ese nivel) ===")
    print((ind * 100).round(2).to_string())
    print("\n=== criterios ===")
    print(pd.DataFrame({"peor nivel": (r["peor"] * 100).round(2),
                        "media": (r["media"] * 100).round(2)}).to_string())
    print("\nλ por minimax: %.2f   (por media indexada: %.2f)" % (lam_sel, lam_media))
    print("λ óptima de cada nivel: %s"
          % {n: float(r[n].idxmin()) for n in SERIES})
    if lam_sel == REJILLA[-1]:
        print("AVISO: el óptimo cae en el borde INFERIOR de la rejilla. Suele"
              " indicar que falta una variable relevante: el estimador intenta"
              " olvidar deprisa una deriva que no puede ver.")
    elif lam_sel == REJILLA[0]:
        print("NOTA: el óptimo cae en el borde SUPERIOR (λ = 1, sin descuento)."
              " No es un síntoma de misespecificación sino lo contrario: no"
              " queda deriva que perseguir y al estimador le conviene toda la"
              " muestra. Es además el modelo más simple.")
    for f_ in filas:
        f_["media"] = float(r.loc[f_["lam"], "media"])
        f_["peor"] = float(r.loc[f_["lam"], "peor"])

    json.dump({"grid": filas, "elegida": lam_sel, "elegidaMedia": lam_media,
               "elegidaNuevos": LAM_N},
              open(os.path.join(AQUI, "grid_lambda.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("grid_lambda.json escrito")


if __name__ == "__main__":
    main()
