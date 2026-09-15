#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Regenera las cifras descriptivas que citan los capítulos 1, 4 y 5 del documento
Word, para no tenerlas que recalcular a mano cuando cambia la base histórica.

No forma parte de la canalización de estimación: sólo lee el panel y agrega.
Las cifras que salen de los parámetros ya contraídos (anexos A.2 y A.3, tabla
de avance por condición del apartado 5.6) las produce `fase2.py`.

    python3 descriptivos.py > descriptivos.txt
"""
import numpy as np
import pandas as pd

import estimar as E

pd.set_option("display.width", 220)
COND = ["Regular", "Ingresante", "Reiniciado", "Recuperado"]


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

    titulo("COMPOSICIÓN DE LA MATRÍCULA (apartados 1.1 y 4.3)")
    c = b["condicion"].value_counts()
    for k in COND:
        print("  %-12s %8s   %5.2f %%" % (k, mil(c[k]), 100 * c[k] / len(b)))
    print("  %-12s %8s" % ("TOTAL", mil(len(b))))
    print("\n  Por periodo (recuento y %):")
    t = pd.crosstab(b["Periodo_real"], b["condicion"])[COND]
    print(t.to_string())
    print((t.div(t.sum(axis=1), axis=0) * 100).round(1).to_string())

    titulo("TABLA 4.3  Comportamiento segun la continuidad de la matricula")
    print("  %-12s %9s %14s %12s %10s %12s" %
          ("Condición", "Observ.", "Continúa T+1", "Avanza +1", "Repite", "Retrocede"))
    for k in COND:
        s = o[o["condicion"] == k]
        cont = s[s["vuelve"]]
        print("  %-12s %9s %14s %12s %10s %12s" % (
            k, mil(len(s)), pc(s["continua"].mean()),
            pc((cont["delta"] == 1).mean()), pc((cont["delta"] == 0).mean()),
            pc((cont["delta"] <= -1).mean())))

    titulo("CONTINUACIÓN POR CICLO Y CONDICIÓN (apartado 4.3)")
    tc = o.pivot_table(index="Ciclo", columns="condicion", values="continua",
                       aggfunc=["mean", "size"])
    m = (tc["mean"][COND] * 100).round(1)
    n = tc["size"][COND]
    m.columns = [x[:4] for x in m.columns]
    n.columns = [x[:4] + "_n" for x in n.columns]
    print(pd.concat([m, n], axis=1).to_string())

    titulo("TABLA 4.3.1  Decaimiento de la cicatriz (solo interrupciones reales)")
    # Antigüedad desde la última interrupción REAL: el reiniciado es el único
    # que dejó de estar matriculado. El recuperado nunca se fue, así que no
    # abre una cicatriz; se mide aparte.
    cond = b["condicion"].values
    est = b["cPerCodigo"].values
    ant = np.full(len(b), -1)
    k = -1
    for i in range(len(b)):
        if i == 0 or est[i] != est[i - 1]:
            k = -1
        if cond[i] == "Reiniciado":
            k = 0
        elif k >= 0:
            k += 1
        ant[i] = k
    b["antig"] = ant
    o = b[b["t"] < ult]
    fp, fn = [], []
    for j in (0, 1, 2):
        s = o[o["antig"] == j]
        fp.append(pc(s["continua"].mean())); fn.append(mil(len(s)))
    # Base de comparación: continuadores que nunca interrumpieron. Se excluye
    # al ingresante, cuya tasa es baja por motivos ajenos a la cicatriz.
    s = o[(o["antig"] < 0) & (o["condicion"] != "Ingresante")]
    fp.append(pc(s["continua"].mean())); fn.append(mil(len(s)))
    print("  %-30s %10s %10s %10s %16s" % ("Semestres desde el regreso",
                                           "0", "1", "2", "Nunca interrumpió"))
    print("  %-30s %10s %10s %10s %16s" % ("Continúa al semestre sig.", *fp))
    print("  %-30s %10s %10s %10s %16s" % ("Observaciones", *fn))
    reg_post = o[(o["antig"].isin([1, 2])) & (o["condicion"] == "Regular")]
    print("\n  regulares que en realidad vienen de una interrupción reciente:")
    print("  %s de %s regulares (%s)" % (
        mil(len(reg_post)), mil(len(o[o["condicion"] == "Regular"])),
        pc(len(reg_post) / len(o[o["condicion"] == "Regular"]))))
    print("  su tasa de continuación: %s   frente al %s del regular medio" % (
        pc(reg_post["continua"].mean()),
        pc(o[o["condicion"] == "Regular"]["continua"].mean())))

    titulo("EL RECUPERADO NO PIERDE MATRÍCULA: PIERDE TIEMPO")
    cn0 = o[o["vuelve"]]
    print("  Distribución completa del salto de ciclo por condición de llegada")
    print("  %-12s %10s %10s %10s %10s %10s" %
          ("Condición", "≤ −1", "0 repite", "+1", "+2", "≥ +3"))
    for kk in COND:
        s = cn0[cn0["condicion"] == kk]
        print("  %-12s %10s %10s %10s %10s %10s" % (
            kk, pc((s["delta"] <= -1).mean()), pc((s["delta"] == 0).mean()),
            pc((s["delta"] == 1).mean()), pc((s["delta"] == 2).mean()),
            pc((s["delta"] >= 3).mean())))
    # ¿el recuperado encadena repeticiones?
    sig = b.groupby("cPerCodigo")["condicion"].shift(-1)
    b["condSig"] = sig
    oo = b[(b["t"] < ult) & b["vuelve"]]
    print("\n  Condición del semestre SIGUIENTE, según la de llegada:")
    t2 = pd.crosstab(oo["condicion"], oo["condSig"], normalize="index") * 100
    print(t2.round(1).to_string())
    rec = oo[oo["condicion"] == "Recuperado"]
    print("\n  De los recuperados que continúan, vuelven a repetir ciclo: %s" %
          pc((rec["condSig"] == "Recuperado").mean()))
    print("  De los regulares que continúan, pasan a repetir ciclo:      %s" %
          pc((oo[oo["condicion"] == "Regular"]["condSig"] == "Recuperado").mean()))
    # cuántos semestres pierde de media un recuperado sobre 6 semestres
    print("\n  Avance medio de ciclos por semestre matriculado (continuadores):")
    for kk in COND:
        s = cn0[cn0["condicion"] == kk]
        print("    %-12s %.3f ciclos/semestre" % (kk, s["delta"].mean()))

    titulo("CONTINUACIÓN EN EL CICLO 1 Y EN EL CICLO 9 (apartado 4.3)")
    for cl in (1, 2, 9):
        fila = []
        for kk in COND:
            s = o[(o["Ciclo"] == cl) & (o["condicion"] == kk)]
            fila.append("%s %s (n=%s)" % (kk[:4], pc(s["continua"].mean()) if len(s) else "—", mil(len(s))))
        print("  ciclo %-3d %s" % (cl, "   ".join(fila)))

    titulo("TABLA 5.5  Rezago x salto -> condicion de destino")
    d = b[b["tSig"].notna()].copy()
    d["mismo"] = d["delta"] == 0
    ultp = per[-1]
    pesoT = b[b["Periodo_real"] == ultp]["condicion"].value_counts()
    nT = len(b[b["Periodo_real"] == ultp])
    print("  %-10s %-22s %-14s %10s %10s" %
          ("Rezago", "Salto de ciclo", "Condición", "Matrículas", "Peso 26-II"))
    r1 = d[d["rezago"] == 1]
    print("  %-10s %-22s %-14s %10s %10s" % ("L = 1", "Δ ≠ 0", "Regular",
          mil((~r1["mismo"]).sum()), pc(pesoT["Regular"] / nT)))
    print("  %-10s %-22s %-14s %10s %10s" % ("L = 1", "Δ = 0 (mismo ciclo)",
          "Recuperado", mil(r1["mismo"].sum()), pc(pesoT["Recuperado"] / nT)))
    for L in (2, 3, 4):
        s = d[d["rezago"] == L]
        print("  %-10s %-22s %-14s %10s %10s" % ("L = %d" % L, "cualquiera",
              "Reiniciado", mil(len(s)), pc(pesoT["Reiniciado"] / nT) if L == 2 else ""))
    print("  %-10s %-22s %-14s %10s %10s" % ("(archivo)", "—", "Ingresante",
          mil((b["esNuevo"] == 1).sum()), pc(pesoT["Ingresante"] / nT)))
    print("\n  regresos tras interrumpir (L>=2): %s" % mil((d["rezago"] >= 2).sum()))
    print("  matrículas consecutivas al mismo ciclo (L=1, Δ=0): %s" % mil(r1["mismo"].sum()))
    print("  de los que se matriculan consecutivamente, repiten ciclo: %s" %
          pc(r1["mismo"].mean()))

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
