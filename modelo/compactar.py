#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Empaqueta los conteos de transición POR PERIODO en arreglos indexados compactos.

El motor JavaScript reagrega estos conteos aplicando la ponderación de recencia
que elija el usuario y vuelve a calcular las constantes de contracción, de modo
que el modelo se puede reestimar dentro del navegador en vez de venir congelado.

El estado es (sede, carrera, modalidad, ciclo, turno). La modalidad se conserva
entre semestres —el 99,4 % de los continuadores la mantiene—, igual que la sede
y la carrera, así que no necesita matriz de transición propia; pero sí entra en
todas las tablas de conteo porque condiciona con fuerza la continuación, el
avance de ciclo y el turno.
"""
import json
import numpy as np
import pandas as pd
from estimar import (cargar, panel, clasifica_delta, LAG_MAX, DELTAS,
                     varianza_proceso, stock_observado, nuevos_observados)


def compactar():
    df = cargar()
    b, per, idx = panel(df)
    nper = len(per)
    sedes = sorted(b["Sede"].unique())
    carreras = sorted(b["Carrera"].unique())
    modalidades = sorted(b["Modalidad_estudios"].unique())
    turnos = sorted(b["Turno"].unique())
    iS = {v: i for i, v in enumerate(sedes)}
    iC = {v: i for i, v in enumerate(carreras)}
    iM = {v: i for i, v in enumerate(modalidades)}
    iT = {v: i for i, v in enumerate(turnos)}

    # ---- continuación: [is, ic, im, ciclo, par, ip, n0..n3, k0..k3] -------
    cont = {}
    tt = b["t"].values.astype(int)
    rz = b["rezago"].values
    sv, cv = b["Sede"].values, b["Carrera"].values
    mv = b["Modalidad_estudios"].values
    civ = b["Ciclo"].values.astype(int)
    pv = b["par"].values.astype(int)
    for i in range(len(b)):
        key = (iS[sv[i]], iC[cv[i]], iM[mv[i]], civ[i], pv[i], tt[i])
        f = cont.setdefault(key, [0] * (2 * LAG_MAX))
        for L in range(1, LAG_MAX + 1):
            if tt[i] + L <= nper - 1:
                f[L - 1] += 1                       # en riesgo del rezago L
        if not np.isnan(rz[i]):
            L = int(rz[i])
            if 1 <= L <= LAG_MAX:
                f[LAG_MAX + L - 1] += 1             # continuó con rezago L
    filas_cont = [list(k) + v for k, v in sorted(cont.items())]

    # ---- avance de ciclo: [ic, im, ciclo, ip, d(-1..3)] -------------------
    r = b[b["tSig"].notna()].copy()
    r["delta"] = (r["cicloSig"] - r["Ciclo"]).map(clasifica_delta)
    av = (r.groupby(["Carrera", "Modalidad_estudios", "Ciclo", "t", "delta"]).size()
          .unstack("delta", fill_value=0).reindex(columns=DELTAS, fill_value=0))
    filas_av = [[iC[c], iM[m], int(ci), int(t)] + [int(x) for x in av.loc[(c, m, ci, t)].values]
                for (c, m, ci, t) in av.index]

    # ---- turno: [is, im, ciclo, it, ip, destino...] -----------------------
    tu = (r.groupby(["Sede", "Modalidad_estudios", "Ciclo", "Turno", "t", "turnoSig"]).size()
          .unstack("turnoSig", fill_value=0).reindex(columns=turnos, fill_value=0))
    filas_tu = [[iS[s], iM[m], int(ci), iT[t], int(p)] + [int(x) for x in tu.loc[(s, m, ci, t, p)].values]
                for (s, m, ci, t, p) in tu.index]

    # ---- turno de ingresantes: [is, ic, im, ciclo, par, ip, destino...] ---
    n = b[b["esNuevo"] == 1]
    nt = (n.groupby(["Sede", "Carrera", "Modalidad_estudios", "Ciclo", "par", "t", "Turno"]).size()
          .unstack("Turno", fill_value=0).reindex(columns=turnos, fill_value=0))
    filas_nt = [[iS[s], iC[c], iM[m], int(ci), int(pa), int(t)] +
                [int(x) for x in nt.loc[(s, c, m, ci, pa, t)].values]
                for (s, c, m, ci, pa, t) in nt.index]

    # ---- modalidad de ingresantes: [is, ic, ciclo, par, ip, modalidad...] -
    # Sirve cuando el archivo de entrada no declara la modalidad: el reparto se
    # estima con la misma contracción por niveles que el turno.
    nm = (n.groupby(["Sede", "Carrera", "Ciclo", "par", "t", "Modalidad_estudios"]).size()
          .unstack("Modalidad_estudios", fill_value=0).reindex(columns=modalidades, fill_value=0))
    filas_nm = [[iS[s], iC[c], int(ci), int(pa), int(t)] +
                [int(x) for x in nm.loc[(s, c, ci, pa, t)].values]
                for (s, c, ci, pa, t) in nm.index]

    # ---- stock y nuevos observados ---------------------------------------
    st = stock_observado(b)
    nu = nuevos_observados(b)
    filas_st = [[idx[p], iS[k[0]], iC[k[1]], iM[k[2]], k[3], iT[k[4]], int(v)]
                for p in per for k, v in sorted(st[p].items())]
    filas_nu = [[idx[p], iS[k[0]], iC[k[1]], iM[k[2]], k[3], int(v)]
                for p in per for k, v in sorted(nu.get(p, {}).items())]

    # ---- oferta observada: qué modalidades imparte cada sede y carrera ----
    oferta = sorted({(iS[s], iC[c], iM[m])
                     for s, c, m in b[["Sede", "Carrera", "Modalidad_estudios"]]
                     .drop_duplicates().itertuples(index=False)})
    oferta = [list(o) for o in oferta]

    # ---- longitud de plan -------------------------------------------------
    cc = (b[b["t"] < nper - 1].assign(cont=lambda d: (d["rezago"] == 1).astype(int))
          .groupby(["Carrera", "Ciclo"])["cont"].agg(["mean", "count"]))
    plan = {}
    for c in carreras:
        tope = 10
        if c in cc.index.get_level_values(0):
            sub = cc.loc[c]
            altos = [int(ci) for ci in sub.index
                     if sub.loc[ci, "count"] >= 30 and sub.loc[ci, "mean"] >= 0.60]
            if altos:
                tope = max(10, max(altos) + 1)
        plan[c] = int(min(tope, int(b["Ciclo"].max())))

    # ---- apertura de sede -------------------------------------------------
    apertura = {}
    for sede in sedes:
        sub = b[b["Sede"] == sede]
        ini = int(sub["Periodo_real"].min())
        base = int(sub[sub["Periodo_real"] == ini]["Ciclo"].max())
        apertura[sede] = {"inicio": ini, "cicloBase": base,
                          "enMaduracion": bool(base <= 2)}

    return {
        "sedes": sedes, "carreras": carreras, "modalidades": modalidades,
        "turnos": turnos, "periodos": [int(p) for p in per],
        "deltas": DELTAS, "lagMax": LAG_MAX,
        "cicloMax": int(b["Ciclo"].max()),
        "planCiclos": plan, "planDefecto": 10,
        "sedeApertura": apertura, "oferta": oferta,
        "cont": filas_cont, "av": filas_av, "tu": filas_tu,
        "nt": filas_nt, "nm": filas_nm,
        "stock": filas_st, "nuevos": filas_nu,
        "varianza": varianza_proceso(b, nper),
        "meta": {
            "origen": "historico_matriculados_con_fecha_de_matricula.xlsx",
            "registros": int(len(df)), "estudiantes": int(df["cPerCodigo"].nunique()),
            "transiciones": int(b["tSig"].notna().sum()),
        },
    }


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


if __name__ == "__main__":
    d = compactar()
    js = json.dumps(limpia(d), ensure_ascii=False, separators=(",", ":"))
    open("compacto.json", "w", encoding="utf-8").write(js)
    print("Filas: cont=%d av=%d tu=%d nt=%d nm=%d stock=%d nuevos=%d oferta=%d" %
          (len(d["cont"]), len(d["av"]), len(d["tu"]), len(d["nt"]), len(d["nm"]),
           len(d["stock"]), len(d["nuevos"]), len(d["oferta"])))
    print("compacto.json: %.1f KB" % (len(js.encode()) / 1024))
