#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cobertura empírica de las DOS magnitudes que entrega el modelo, que responden a
preguntas distintas y no deben confundirse:

  banda de escenarios     sólo el desplazamiento sistémico ±z·σ. Es coherente y
                          aditiva —sirve para planificar capacidad— pero no
                          pretende cubrir el dato observado.
  intervalo de predicción sistémico ⊕ varianza independiente. Sí pretende
                          cubrirlo, y la calibración de κ se hace contra esto.

La comparación entre ambas es la evidencia de que la distinción no es retórica.
Escribe `cobertura.json`, que alimenta la tabla del capítulo 7 del documento.
"""
import json
import os

import numpy as np
import pandas as pd
from scipy import stats

import estimar as E
from fase2 import LAM, LAM_N, NIVEL_CONF, semiamplitud

AQUI = os.path.dirname(os.path.abspath(__file__))


def evaluar(b, per, stock, nuevos, kappa, desde=4):
    filas = []
    for corte in range(desde, len(per)):
        hasta, fut = per[corte], per[corte + 1:]
        if not fut:
            break
        par = E.construir_parametros(b, per, hasta=hasta, lam=LAM, lam_n=LAM_N)
        vp = E.varianza_proceso(b[b["Periodo_real"] <= hasta], corte + 1)
        sig = vp["sigma_logit_choque"]
        z = float(stats.t.ppf(0.5 + NIVEL_CONF / 2, df=max(vp["gl_choque"], 1)))
        mod = E.Modelo(par)
        st0 = {p: stock[p] for p in per if p <= hasta}
        cen, var = mod.proyectar(st0, nuevos, fut, varianza=True)
        alt = mod.proyectar(st0, nuevos, fut, shock=+sig)
        baj = mod.proyectar(st0, nuevos, fut, shock=-sig)
        for h, T in enumerate(fut, start=1):
            for nom, ix in E.NIVELES.items():
                ra, ca = E.agrega(stock[T], ix), E.agrega(cen[T], ix)
                va, aa, ba = E.agrega(var[T], ix), E.agrega(alt[T], ix), E.agrega(baj[T], ix)
                claves = set(ra) | set(ca)
                dsis = dpre = 0
                for k in claves:
                    c, real = ca.get(k, 0.0), ra.get(k, 0.0)
                    lo, hi = min(ba.get(k, 0.0), aa.get(k, 0.0)), max(ba.get(k, 0.0), aa.get(k, 0.0))
                    if lo - 1e-9 <= real <= hi + 1e-9:
                        dsis += 1
                    hw = semiamplitud((aa.get(k, 0.0) - ba.get(k, 0.0)) / 2,
                                      va.get(k, 0.0), z, kappa)
                    if c - hw - 1e-9 <= real <= c + hw + 1e-9:
                        dpre += 1
                n = max(len(claves), 1)
                filas.append({"h": h, "nivel": nom,
                              "sistemica": dsis / n, "prediccion": dpre / n})
    return pd.DataFrame(filas)


if __name__ == "__main__":
    df = E.cargar()
    b, per, idx = E.panel(df)
    stock, nuevos = E.stock_observado(b), E.nuevos_observados(b)
    par = json.load(open(os.path.join(AQUI, "parametros.json"), encoding="utf-8"))
    kappa = par["escenarios"]["kappa"]

    cb = evaluar(b, per, stock, nuevos, kappa)
    out = {}
    for campo in ("sistemica", "prediccion"):
        out[campo] = {n: {int(h): float(v)
                          for h, v in g.groupby("h")[campo].mean().items()}
                      for n, g in cb.groupby("nivel")}
    json.dump(out, open(os.path.join(AQUI, "cobertura.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    print("=== COBERTURA MEDIA SOBRE LOS TRES HORIZONTES (nominal %.0f %%) ===" % (NIVEL_CONF * 100))
    print("%-46s %12s %12s" % ("Nivel", "escenarios", "predicción"))
    for n in E.NIVELES:
        g = cb[cb.nivel == n]
        print("%-46s %11.1f%% %11.1f%%" % (n, g.sistemica.mean() * 100, g.prediccion.mean() * 100))
    fino = [n for n in E.NIVELES if n.count("×") >= 3]
    print("\nmedia de los niveles desagregados (predicción): %.1f %%"
          % (cb[cb.nivel.isin(fino)].prediccion.mean() * 100))
