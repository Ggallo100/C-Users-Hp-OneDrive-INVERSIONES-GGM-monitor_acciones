#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Regenera las cifras descriptivas del HISTÓRICO de matriculados que citan los
capítulos 1, 4 y 5 del documento Word: cobertura de la base, composición por
modalidad, rezagos, turno, ciclo terminal y la marca `Desertor`.

OJO CON LA CONDICIÓN. Este módulo trabaja sobre el histórico, que no trae el
campo `Condicion`, de modo que lo que aquí se llame «condición» es la
aproximación de tres categorías derivable del flujo (`estimar.condicion_de`) y
NO la clasificación oficial. Todas las cifras de condición del documento salen
de `cifras_documento.py`, que lee la base central. Las que salen de los
parámetros ya contraídos (anexos A.2 y A.3, tabla de avance del apartado 5.6)
las produce `fase2.py`.

    python3 descriptivos.py > descriptivos.txt
"""
import numpy as np
import pandas as pd

import estimar as E

pd.set_option("display.width", 220)
COND = ["Regular", "Ingresante", "Reinicio"]   # la aproximación, no la oficial


def pc(x):
    return "—" if x is None or (isinstance(x, float) and np.isnan(x)) else \
        ("%.1f %%" % (100 * x)).replace(".", ",")


def mil(n):
    return "{:,}".format(int(round(n))).replace(",", " ")


def titulo(t):
    print("\n" + "=" * 78 + "\n" + t + "\n" + "=" * 78)


def main():
    df = E.cargar()
    b, per, idx = E.panel(df)
    ult = b["t"].max()
    # «Continúa» = se matricula el semestre INMEDIATO siguiente, que es la
    # variable dependiente del GLM del apartado 6.4. `vuelve` recoge además a
    # quien reaparece más tarde, dentro de la ventana de cuatro rezagos.
    b["continua"] = (b["rezago"] == 1).fillna(False)
    b["vuelve"] = b["tSig"].notna()
    b["delta"] = b["cicloSig"] - b["Ciclo"]
    # sólo orígenes cuyo destino es observable dentro de la ventana
    o = b[b["t"] < ult].copy()

    titulo("COMPOSICIÓN DEL HISTÓRICO POR REZAGO (aproximación, no la condición oficial)")
    c = b["condicion"].value_counts()
    for k in COND:
        print("  %-12s %8s   %5.2f %%" % (k, mil(c[k]), 100 * c[k] / len(b)))
    print("  %-12s %8s" % ("TOTAL", mil(len(b))))
    print("\n  Por periodo (recuento y %):")
    t = pd.crosstab(b["Periodo_real"], b["condicion"])[COND]
    print(t.to_string())
    print((t.div(t.sum(axis=1), axis=0) * 100).round(1).to_string())

    titulo("CONDICIÓN DE LLEGADA -> ver cifras_documento.py")
    print("  El histórico no trae el campo `Condicion`, de modo que aquí no se puede")
    print("  clasificar a los continuadores como lo hace la universidad. Todas las cifras")
    print("  de condición del documento —composición por semestre, comportamiento de cada")
    print("  una, reincidencia, r por ciclo y modalidad, anexos A.1, A.3 y A.6— salen de")
    print("  la base central a través de `cifras_documento.py`.")
    print()
    print("  Lo único que el histórico determina por sí solo es el rezago, y de ahí la",)
    print("  categoría de reinicio:")
    d = b[b["tSig"].notna()]
    for L in (1, 2, 3, 4):
        print("    L = %d   %s matrículas" % (L, mil((d["rezago"] == L).sum())))
    print("    regresos tras interrumpir (L>=2): %s" % mil((d["rezago"] >= 2).sum()))

    titulo("PERMANENCIA DE TURNO POR CONDICIÓN (apartados 5.5.1 y 5.7)")
    cn = o[o["vuelve"]]
    for k in COND:
        s = cn[cn["condicion"] == k]
        print("  %-12s %s   (n = %s)" % (k, pc((s["turnoSig"] == s["Turno"]).mean()), mil(len(s))))

    titulo("SALTO DE CICLO AGREGADO (apartado 5.6)")
    tot = len(cn)
    for et, m in (("−1 o menos", cn["delta"] <= -1), ("0", cn["delta"] == 0),
                  ("+1", cn["delta"] == 1), ("+2", cn["delta"] == 2),
                  ("+3 o más", cn["delta"] >= 3)):
        print("  %-12s %s" % (et, pc(m.sum() / tot)))

    titulo("MODALIDAD (apartado 4.2, sin cambios de clasificación)")
    for k, s in cn.groupby("Modalidad_estudios"):
        print("  %-18s avanza +1 %s   repite %s   conserva modalidad %s" % (
            k, pc((s["delta"] == 1).mean()), pc((s["delta"] == 0).mean()),
            pc((s["Modalidad_estudios"] == s["Modalidad_estudios"]).mean())))


if __name__ == "__main__":
    main()
