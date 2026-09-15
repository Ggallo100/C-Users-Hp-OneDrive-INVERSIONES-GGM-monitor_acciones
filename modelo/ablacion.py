#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ablación de una dimensión del estado.

Ejecuta el mismo procedimiento completo —selección de λ por origen móvil
incluida— sobre dos especificaciones idénticas salvo en que la segunda colapsa
la dimensión a una única categoría. La comparación se hace en los niveles de
agregación que existen en ambas, que son los únicos comparables: añadir una
dimensión parte las celdas y sube mecánicamente el error del cruce más fino.

  python3 ablacion.py modalidad     colapsa Modalidad_estudios
  python3 ablacion.py condicion     colapsa la condición de llegada (defecto)
"""
import numpy as np
import pandas as pd
import estimar as E

REJILLA = [1.0, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.4, 0.3]
COMUNES = {"Total": (), "Sede": (0,), "Carrera": (1,), "Sede×Carrera": (0, 1)}


# El último semestre del histórico sigue admitiendo altas en la fecha de
# extracción, de modo que como OBJETIVO del backtesting está censurado: una
# especificación que proyecte de menos parecerá acertar más. Todas las
# comparaciones se informan por duplicado, con y sin ese objetivo.
PARCIAL = 202602


def corre(b, etiqueta):
    per_ = sorted(b["Periodo_real"].unique())
    stock, nuevos = E.stock_observado(b), E.nuevos_observados(b)
    filas = []
    for lam in REJILLA:
        bt = E.backtest(b, per_, stock, nuevos, lam, 0.30)
        cer = bt[bt.periodo != PARCIAL]
        f = {"lam": lam}
        for n in COMUNES:
            f[n] = float(bt[bt.nivel == n]["epap"].mean())
            f[n + "*"] = float(cer[cer.nivel == n]["epap"].mean())
        f["idx"] = None
        f["sesgo"] = float(bt[bt.nivel == "Total"]["sesgo"].mean())
        f["sesgo*"] = float(cer[cer.nivel == "Total"]["sesgo"].mean())
        filas.append(f)
    r = pd.DataFrame(filas).set_index("lam")
    cols = [n + "*" for n in COMUNES]
    # criterio minimax sobre las series indexadas a su propio mínimo, medido
    # sobre los objetivos cerrados
    ind = r[cols] / r[cols].min()
    r["idx"] = ind.max(axis=1)
    lam_sel = float(r["idx"].idxmin())
    print(f"\n=== {etiqueta} ===")
    print("  --- todos los objetivos ---")
    print((r[list(COMUNES)] * 100).round(3).to_string())
    print("  --- excluyendo el semestre parcial %d ---" % PARCIAL)
    print((r[cols] * 100).round(3).to_string())
    print("  sesgo:", r["sesgo"].round(0).to_dict())
    print("  sesgo sin parcial:", r["sesgo*"].round(0).to_dict())
    print("peor sobrecoste relativo:", (r["idx"] * 100).round(2).to_dict())
    print("λ seleccionada (sobre objetivos cerrados):", lam_sel)
    return lam_sel, r.loc[lam_sel]


def colapsa_condicion():
    """
    Deja al modelo sin dimensión de continuidad, de verdad.

    Colapsar la columna del panel histórico ya no basta: desde que la condición
    es la oficial, las tasas de continuación y de avance se estiman sobre el
    panel de la base central, y `construir_parametros` recalcula además la
    condición dentro de la ventana truncada. Hay que intervenir en los tres
    sitios para que la especificación ablacionada no siga viendo la dimensión
    por una puerta trasera:

      1. el panel central, cuya condición se vuelve constante;
      2. `condicion_de`, que si no reintroduciría el reinicio en el histórico
         —el panel que alimenta la dimensión de turno—;
      3. las consultas del modelo, que dejan de pasar la condición a la
         cascada, junto con r y con el flujo de nueva admisión, que forman
         parte de la dimensión que se está quitando.
    """
    UNICA = "Regular"

    bc = E._panel_central().copy()
    bc["condicion"] = UNICA
    bc["condSig"] = np.where(bc["rezago"].notna(), UNICA, None)
    E._CACHE_CENTRAL["b"] = bc

    E.condicion_de = lambda b, g: np.full(len(b), UNICA)

    q0, av0, tu0 = E.Modelo.q, E.Modelo.avance, E.Modelo.turno_trans
    E.Modelo.q = lambda s, sede, car, mo, co, ci, pa, L: q0(s, sede, car, mo, UNICA, ci, pa, L)
    E.Modelo.avance = lambda s, car, mo, co, ci: av0(s, car, mo, UNICA, ci)
    E.Modelo.turno_trans = lambda s, sede, mo, co, ci, tu: tu0(s, sede, mo, UNICA, ci, tu)
    E.Modelo.tasa_recuperado = lambda s, car, mo, co, ci: 0.0
    E.Modelo.nueva_admision = lambda s, par: {}


if __name__ == "__main__":
    import sys
    dim = sys.argv[1] if len(sys.argv) > 1 else "condicion"

    df = E.cargar()
    b, per, idx = E.panel(df)

    lam_c, fc = corre(b, "CON " + dim)

    if dim == "modalidad":
        b2 = b.copy()
        b2["Modalidad_estudios"] = "Única"
        bc = E._panel_central().copy()
        bc["Modalidad_estudios"] = "Única"
        E._CACHE_CENTRAL["b"] = bc
    else:
        b2 = b.copy()
        colapsa_condicion()
    lam_s, fs = corre(b2, "SIN " + dim + " (colapsada)")

    for suf, tit in [("", "TODOS LOS OBJETIVOS"),
                     ("*", "EXCLUYENDO EL SEMESTRE PARCIAL")]:
        print(f"\n=== COMPARACIÓN EN LOS NIVELES COMUNES — {tit} "
              f"(EPAP %, λ elegida por CV en cada caso) ===")
        print(f"{'Nivel':<16}{'sin ' + dim:>16}{'con ' + dim:>16}{'mejora':>12}")
        for n in COMUNES:
            a, c = fs[n + suf] * 100, fc[n + suf] * 100
            print(f"{n:<16}{a:15.3f}%{c:15.3f}%{(a - c) / a * 100:11.1f}%")
        print(f"{'sesgo medio':<16}{fs['sesgo' + suf]:16.0f}{fc['sesgo' + suf]:16.0f}")
    print(f"\n{'λ elegida':<16}{lam_s:16.2f}{lam_c:16.2f}")
