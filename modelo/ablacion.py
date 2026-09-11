#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ablación de la dimensión Modalidad_estudios.

Ejecuta el mismo procedimiento completo —selección de λ por origen móvil
incluida— sobre dos especificaciones idénticas salvo en que la segunda
colapsa la modalidad a una única categoría. La comparación se hace en los
niveles de agregación que existen en ambas, que son los únicos comparables:
añadir una dimensión parte las celdas y sube mecánicamente el error del
cruce más fino.
"""
import numpy as np
import pandas as pd
import estimar as E

REJILLA = [1.0, 0.85, 0.7, 0.65, 0.6, 0.55, 0.5, 0.4, 0.3]
COMUNES = {"Total": (), "Sede": (0,), "Carrera": (1,), "Sede×Carrera": (0, 1)}


def corre(b, etiqueta):
    per_ = sorted(b["Periodo_real"].unique())
    stock, nuevos = E.stock_observado(b), E.nuevos_observados(b)
    filas = []
    for lam in REJILLA:
        bt = E.backtest(b, per_, stock, nuevos, lam, 0.30)
        f = {"lam": lam}
        for n in COMUNES:
            f[n] = float(bt[bt.nivel == n]["epap"].mean())
        f["idx"] = None
        f["sesgo"] = float(bt[bt.nivel == "Total"]["sesgo"].mean())
        filas.append(f)
    r = pd.DataFrame(filas).set_index("lam")
    # criterio: media de las series indexadas a su propio mínimo
    ind = r[list(COMUNES)] / r[list(COMUNES)].min()
    r["idx"] = ind.mean(axis=1)
    lam_sel = float(r["idx"].idxmin())
    print(f"\n=== {etiqueta} ===")
    print((r[list(COMUNES)] * 100).round(3).to_string())
    print("criterio indexado:", r["idx"].round(4).to_dict())
    print("λ seleccionada:", lam_sel)
    return lam_sel, r.loc[lam_sel]


if __name__ == "__main__":
    df = E.cargar()
    b, per, idx = E.panel(df)

    lam_c, fc = corre(b, "CON modalidad")

    b2 = b.copy()
    b2["Modalidad_estudios"] = "Única"
    lam_s, fs = corre(b2, "SIN modalidad (colapsada)")

    print("\n=== COMPARACIÓN EN LOS NIVELES COMUNES (EPAP %, λ elegida por CV en cada caso) ===")
    print(f"{'Nivel':<16}{'sin modalidad':>16}{'con modalidad':>16}{'mejora':>12}")
    for n in COMUNES:
        a, c = fs[n] * 100, fc[n] * 100
        print(f"{n:<16}{a:15.3f}%{c:15.3f}%{(a - c) / a * 100:11.1f}%")
    print(f"{'λ elegida':<16}{lam_s:16.2f}{lam_c:16.2f}")
    print(f"{'sesgo medio':<16}{fs['sesgo']:16.0f}{fc['sesgo']:16.0f}")
