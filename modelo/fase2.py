#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fase 2: escenarios, calibración de cobertura y exportación de parámetros.

El intervalo predictivo de cualquier agregado A combina dos componentes:

    semiamplitud(A) = z * raiz( D_A^2 + kappa^2 * V_A )

  D_A : sensibilidad SISTÉMICA. Efecto sobre A de un choque de un sigma en la
        tasa de continuación, en escala logit. Es común a todas las celdas, de
        modo que al agregar se suma LINEALMENTE (por eso entra como D_A^2 y no
        como suma de cuadrados).
  V_A : varianza INDEPENDIENTE acumulada (realización multinomial, error de
        parámetro y varianza propagada del stock). Al agregar se suma en
        CUADRATURA, por eso se diluye en los totales y domina en las celdas
        pequeñas.
  kappa: factor de inflación de varianza, calibrado por backtesting para que la
        cobertura empírica del intervalo nominal coincida con la declarada.
  z    : cuantil t de Student con los grados de libertad del choque de periodo
        (pocos periodos observados: la t es más ancha que la normal).
"""
import json
import numpy as np
import pandas as pd
from scipy import stats
from estimar import (cargar, panel, stock_observado, nuevos_observados,
                     construir_parametros, varianza_proceso, Modelo,
                     agrega, epap, NIVELES, siguiente)

LAM, LAM_N = 0.65, 0.30
NIVEL_CONF = 0.80


def semiamplitud(D, V, z, kappa):
    return z * np.sqrt(D ** 2 + (kappa ** 2) * V)


def evaluar_cobertura(b, per, stock, nuevos, kappa, z_conf=NIVEL_CONF, desde=4):
    """Cobertura empírica del intervalo en el backtesting de origen móvil."""
    filas = []
    for corte in range(desde, len(per)):
        hasta, fut = per[corte], per[corte + 1:]
        if not fut:
            break
        par = construir_parametros(b, per, hasta=hasta, lam=LAM, lam_n=LAM_N)
        vp = varianza_proceso(b[b["Periodo_real"] <= hasta], corte + 1)
        sig = vp["sigma_logit_choque"]
        z = float(stats.t.ppf(0.5 + z_conf / 2, df=max(vp["gl_choque"], 1)))
        mod = Modelo(par)
        st0 = {p: stock[p] for p in per if p <= hasta}
        cen, var = mod.proyectar(st0, nuevos, fut, varianza=True)
        alt = mod.proyectar(st0, nuevos, fut, shock=+sig)
        baj = mod.proyectar(st0, nuevos, fut, shock=-sig)
        for h, T in enumerate(fut, start=1):
            for nom, ix in NIVELES.items():
                ra = agrega(stock[T], ix)
                ca = agrega(cen[T], ix)
                va = agrega(var[T], ix)
                aa = agrega(alt[T], ix)
                ba = agrega(baj[T], ix)
                claves = set(ra) | set(ca)
                dentro = 0
                for k in claves:
                    c = ca.get(k, 0.0)
                    D = (aa.get(k, 0.0) - ba.get(k, 0.0)) / 2
                    hw = semiamplitud(D, va.get(k, 0.0), z, kappa)
                    if c - hw - 1e-9 <= ra.get(k, 0.0) <= c + hw + 1e-9:
                        dentro += 1
                filas.append({"hasta": hasta, "periodo": T, "h": h, "nivel": nom,
                              "dentro": dentro, "total": len(claves),
                              "cob": dentro / max(len(claves), 1)})
    return pd.DataFrame(filas)


if __name__ == "__main__":
    df = cargar()
    b, per, idx = panel(df)
    stock, nuevos = stock_observado(b), nuevos_observados(b)

    # ------------------------------------------------------------------
    # Calibración del factor de inflación kappa
    # ------------------------------------------------------------------
    print("=== CALIBRACIÓN DE kappa (cobertura nominal 80%) ===")
    print(f"{'kappa':>6} " + " ".join(f"{n[:13]:>14}" for n in NIVELES))
    reg = []
    for kap in [1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0]:
        cb = evaluar_cobertura(b, per, stock, nuevos, kap)
        fila = {"kappa": kap}
        for n in NIVELES:
            fila[n] = float(cb[cb.nivel == n]["cob"].mean())
        reg.append(fila)
        print(f"{kap:6.1f} " + " ".join(f"{fila[n]*100:13.1f}%" for n in NIVELES))
    rk = pd.DataFrame(reg).set_index("kappa")

    # kappa que acerca la cobertura media de los niveles desagregados al nominal
    objetivo = NIVEL_CONF
    niv_fino = ["Sede×Carrera×Modalidad", "Sede×Carrera×Modalidad×Ciclo",
                "Sede×Carrera×Modalidad×Ciclo×Turno"]
    err = (rk[niv_fino].mean(axis=1) - objetivo).abs()
    KAPPA = float(err.idxmin())
    print(f"\nkappa seleccionada: {KAPPA}"
          f"  (cobertura media en niveles desagregados "
          f"{rk.loc[KAPPA, niv_fino].mean()*100:.1f}%)")

    # ------------------------------------------------------------------
    # Parámetros definitivos
    # ------------------------------------------------------------------
    par = construir_parametros(b, per, lam=LAM, lam_n=LAM_N)
    vp = varianza_proceso(b, len(per))
    par["varianza"] = vp
    par["escenarios"] = {
        "kappa": KAPPA,
        "nivelConfianza": NIVEL_CONF,
        "sigma": vp["sigma_logit_choque"],
        "gl": vp["gl_choque"],
        "z": float(stats.t.ppf(0.5 + NIVEL_CONF / 2, df=max(vp["gl_choque"], 1))),
        "calibracion": reg,
    }

    cb = evaluar_cobertura(b, per, stock, nuevos, KAPPA)
    cob_fin = {n: {int(h): float(v)
                   for h, v in cb[cb.nivel == n].groupby("h")["cob"].mean().items()}
               for n in NIVELES}

    # backtesting de error con los hiperparámetros definitivos
    from estimar import backtest
    bt = backtest(b, per, stock, nuevos, LAM, LAM_N)
    epap_niv = {n: {int(h): float(v)
                    for h, v in bt[bt.nivel == n].groupby("h")["epap"].mean().items()}
                for n in NIVELES}
    tot = bt[bt.nivel == "Total"][["hasta", "periodo", "h", "epap", "sesgo"]]

    par["validacion"] = {
        "epap": epap_niv, "cobertura": cob_fin,
        "detalleTotal": tot.to_dict("records"),
        "lambda": LAM, "lambdaNuevos": LAM_N,
        "epapGlobal": {n: float(bt[bt.nivel == n]["epap"].mean()) for n in NIVELES},
        "sesgoMedio": float(tot["sesgo"].mean()),
        "sesgoSin2602": float(tot[tot.periodo != 202602]["sesgo"].mean()),
        "origenes": int(tot["hasta"].nunique()), "puntos": int(len(tot)),
    }
    par["meta"] = {
        "origen": "historico_matriculados_con_fecha_de_matricula.xlsx",
        "registros": int(len(df)), "estudiantes": int(df["cPerCodigo"].nunique()),
        "transiciones": int(b["tSig"].notna().sum()),
        "ultimoPeriodo": int(per[-1]), "primerPeriodo": int(per[0]),
    }

    # Stock observado del histórico: arranque de la recursión
    par["stockHistorico"] = {
        str(p): [[k[0], k[1], k[2], k[3], k[4], int(v)] for k, v in sorted(stock[p].items())]
        for p in per}
    par["nuevosHistorico"] = {
        str(p): [[k[0], k[1], k[2], k[3], int(v)] for k, v in sorted(nuevos.get(p, {}).items())]
        for p in per}

    print("\n=== EPAP por nivel y horizonte (%) ===")
    print(pd.DataFrame(epap_niv).T.mul(100).round(2).to_string())
    print("\n=== COBERTURA calibrada (%) ===")
    print(pd.DataFrame(cob_fin).T.mul(100).round(1).to_string())
    print("\n=== VARIANZA ===")
    print("sigma choque (logit) = %.5f  gl=%d  z(80%%)=%.3f" %
          (vp["sigma_logit_choque"], vp["gl_choque"], par["escenarios"]["z"]))
    print("estacional (logit)   =", {k: round(v, 4) for k, v in vp["estacional_logit"].items()})
    print("LR periodo=%.1f gl=%d p=%.3g | pseudo-R2=%.4f | n=%d" %
          (vp["lr_periodo"], vp["gl_lr"], vp["p_periodo"], vp["pseudo_r2"], vp["n_obs"]))
    print("var: observada=%.3g muestral=%.3g proceso=%.3g" %
          (vp["var_observada"], vp["var_muestral"], vp["var_proceso"]))
    print("\nk contracción rezago1: celda=%.1f carrera=%.1f ciclopar=%.1f ciclo=%.1f" %
          (par["k_celda"][0], par["k_carrera"][0], par["k_ciclopar"][0], par["k_ciclo"][0]))
    print("k_avance=%.1f k_turno=%.1f k_nuevos=%.1f" %
          (par["k_avance"], par["k_turno"], par["k_nuevos"]))
    print("q_L global:", [round(x, 5) for x in par["cont_global"]])
    print("Sesgo medio total: %.0f  (excl. 2026-2: %.0f)" %
          (par["validacion"]["sesgoMedio"], par["validacion"]["sesgoSin2602"]))

    def limpia(o):
        if isinstance(o, dict):
            return {str(k): limpia(v) for k, v in o.items()}
        if isinstance(o, (list, tuple)):
            return [limpia(v) for v in o]
        if isinstance(o, np.integer):
            return int(o)
        if isinstance(o, np.floating):
            return round(float(o), 6)
        return o

    with open("parametros.json", "w", encoding="utf-8") as f:
        json.dump(limpia(par), f, ensure_ascii=False, separators=(",", ":"))
    import os
    print("\nparametros.json:", round(os.path.getsize("parametros.json") / 1024, 1), "KB")
