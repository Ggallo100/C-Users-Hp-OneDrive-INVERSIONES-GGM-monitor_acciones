#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Todas las cifras de la clasificación oficial que cita el documento Word.

Existe para que el texto del documento no se escriba de memoria: cada tabla
del apartado 3.3, 4.3 y del anexo A.3 sale de aquí, de la base central, que
es la autoridad sobre la condición del estudiante.
"""
import numpy as np
import pandas as pd

import central

pd.set_option("display.width", 200)

b = central.panel(central.cargar())
v = central.ventana(b)          # sin 2023-I ni 2026-II
ORD = central.CONDICIONES


def pct(x):
    return "%.2f %%" % (100 * x)


print("=" * 78)
print("1. COMPOSICIÓN POR CONDICIÓN Y SEMESTRE (base central)")
print("=" * 78)
t = pd.crosstab(v["Periodo_real"], v["condicion"]).reindex(columns=ORD).fillna(0)
t["TOTAL"] = t.sum(axis=1)
print(t.astype(int).to_string())
print("\n--- en porcentaje de la matrícula del semestre ---")
p = t[ORD].div(t["TOTAL"], axis=0)
print((100 * p).round(2).to_string())
print("\n--- rango (mín-máx) por condición ---")
for c in ORD:
    print("  %-26s %s  -  %s   (media %s)"
          % (c, pct(p[c].min()), pct(p[c].max()), pct(p[c].mean())))

print("\n--- continuadores solamente (sin Ingresante) ---")
cont = t[["Regular", "Recuperado", "Reinicio", "Ingresante nueva admisión"]]
pc = cont.div(cont.sum(axis=1), axis=0)
print((100 * pc).round(2).to_string())
for c in cont.columns:
    print("  %-26s %s  -  %s   (media %s)"
          % (c, pct(pc[c].min()), pct(pc[c].max()), pct(pc[c].mean())))

print("\n" + "=" * 78)
print("2. COINCIDENCIA CON Tipo_estudiante OFICIAL")
print("=" * 78)
x = pd.crosstab(v["Tipo_estudiante"], v["condicion"]).reindex(columns=ORD).fillna(0)
print(x.astype(int).to_string())
ok = (v["condicion"] == v["Tipo_estudiante"]).mean()
print("\n  coincidencia global %.2f %%   (n = %d)" % (100 * ok, len(v)))
dis = v[v["condicion"] != v["Tipo_estudiante"]]
print("  discrepancias: %d" % len(dis))
print(dis.groupby(["Tipo_estudiante", "condicion"]).size()
         .sort_values(ascending=False).head(8).to_string())

print("\n" + "=" * 78)
print("3. COMPORTAMIENTO POR CONDICIÓN DE ORIGEN (panel de estimación)")
print("=" * 78)
e = central.panel_estimacion()
e = e[e["Periodo_real"] != e["Periodo_real"].max()]     # el último no observa futuro
fil = []
for c in ORD:
    g = e[e["condicion"] == c]
    if not len(g):
        continue
    sig = g["rezago"] == 1
    cont_r = sig.mean()
    avan = g.loc[sig, "cicloSig"] - g.loc[sig, "Ciclo"]
    fil.append({
        "Condición": c, "n": len(g),
        "continúa": cont_r,
        "avanza": (avan >= 1).mean() if len(avan) else np.nan,
        "repite": (avan == 0).mean() if len(avan) else np.nan,
        "retrocede": (avan < 0).mean() if len(avan) else np.nan,
        "vuelve L>=2": (g["rezago"] >= 2).mean(),
        "no vuelve": g["rezago"].isna().mean(),
    })
f = pd.DataFrame(fil).set_index("Condición")
print(pd.concat([f[["n"]].astype(int),
                 (100 * f.drop(columns="n")).round(2)], axis=1).to_string())

print("\n--- reincidencia: condición de LLEGADA según la de ORIGEN (rezago 1) ---")
r1 = e[e["rezago"] == 1]
rc = pd.crosstab(r1["condicion"], r1["condSig"], normalize="index")
print((100 * rc.reindex(index=ORD, columns=ORD).fillna(0)).round(2).to_string())

print("\n" + "=" * 78)
print("4. r = P(Recuperado | rezago 1)")
print("=" * 78)
print("  global  %.4f %%   (n = %d, k = %d)"
      % (100 * (r1["condSig"] == "Recuperado").mean(), len(r1),
         (r1["condSig"] == "Recuperado").sum()))
print("\n--- por condición de origen ---")
for c in ORD:
    g = r1[r1["condicion"] == c]
    if len(g):
        print("  %-26s %7.2f %%   (n = %6d)"
              % (c, 100 * (g["condSig"] == "Recuperado").mean(), len(g)))
print("\n--- por ciclo de origen ---")
cl = r1.assign(cl=r1["Ciclo"].clip(upper=12))
g = cl.groupby("cl").apply(
    lambda d: pd.Series({"n": len(d),
                         "r": 100 * (d["condSig"] == "Recuperado").mean()}),
    include_groups=False)
print(g.round(2).to_string())
print("\n--- por modalidad ---")
g = r1.groupby("Modalidad_estudios").apply(
    lambda d: pd.Series({"n": len(d),
                         "r": 100 * (d["condSig"] == "Recuperado").mean()}),
    include_groups=False)
print(g.round(2).to_string())

print("\n" + "=" * 78)
print("5. CONTINUACIÓN POR CONDICIÓN Y CICLO (anexo A.3)")
print("=" * 78)
e1 = e.assign(cl=e["Ciclo"].clip(upper=12))
tab = e1.pivot_table(index="cl", columns="condicion",
                     values="rezago", aggfunc=lambda s: 100 * (s == 1).mean())
print(tab.reindex(columns=ORD).round(1).to_string())
print("\n  n por celda:")
print(e1.pivot_table(index="cl", columns="condicion", values="t", aggfunc="size")
        .reindex(columns=ORD).fillna(0).astype(int).to_string())

print("\n" + "=" * 78)
print("6. RECUPERADO POR CICLO  y  CICATRIZ DEL REINICIO")
print("=" * 78)
rec = v[v["condicion"] == "Recuperado"]
d = pd.DataFrame({
    "recuperados": rec.groupby(rec["Ciclo"].clip(upper=12)).size(),
    "matrícula": v.groupby(v["Ciclo"].clip(upper=12)).size()})
d["% del ciclo"] = (100 * d["recuperados"] / d["matrícula"]).round(2)
d["% de los rec."] = (100 * d["recuperados"] / d["recuperados"].sum()).round(2)
print(d.fillna(0).to_string())
print("\n  ciclos 1-4 concentran el %.1f %% de los recuperados"
      % (100 * rec["Ciclo"].le(4).mean()))

print("\n--- cicatriz: continuación en los semestres posteriores a un reinicio ---")
ri = e[e["condicion"] == "Reinicio"][["cod", "t"]].rename(columns={"t": "t0"})
m = e.merge(ri, on="cod")
m = m[(m["t"] >= m["t0"]) & (m["t"] <= m["t0"] + 3)]
m["h"] = m["t"] - m["t0"]
print(m.groupby("h").apply(
    lambda d: pd.Series({"n": len(d), "continúa %": 100 * (d["rezago"] == 1).mean()}),
    include_groups=False).round(2).to_string())
reg = e[e["condicion"] == "Regular"]
print("  referencia regular: %.2f %%" % (100 * (reg["rezago"] == 1).mean()))

print("\n" + "=" * 78)
print("7. INGRESANTE NUEVA ADMISIÓN")
print("=" * 78)
na = v[v["condicion"] == "Ingresante nueva admisión"]
print("  total %d en %d semestres" % (len(na), v["Periodo_real"].nunique()))
print(na.groupby(["Periodo_real"]).size().to_string())
print("\n  por paridad (media por semestre):")
ns = na.groupby("par")["Periodo_real"].nunique()
print((na.groupby("par").size() / ns).round(2).to_string())
print("\n  CV de la serie por paridad:")
for pa in (1, 2):
    s = na[na["par"] == pa].groupby("Periodo_real").size()
    print("    paridad %d: n=%s  media %.1f  CV %.1f %%"
          % (pa, list(s.values), s.mean(), 100 * s.std(ddof=1) / s.mean()))
print("\n  por sede / modalidad / ciclo:")
print(na.groupby("Sede").size().to_string())
print(na.groupby("Modalidad_estudios").size().to_string())
print((100 * na["Ciclo"].clip(upper=12).value_counts(normalize=True)
       .sort_index()).round(1).to_string())
print("\n  comportamiento: continúa %.1f %%, avanza %.1f %%, repite %.1f %%"
      % tuple(100 * np.array([
          (e.loc[e["condicion"] == "Ingresante nueva admisión", "rezago"] == 1).mean(),
          ((e.loc[(e["condicion"] == "Ingresante nueva admisión")
                  & (e["rezago"] == 1), "cicloSig"]
            - e.loc[(e["condicion"] == "Ingresante nueva admisión")
                    & (e["rezago"] == 1), "Ciclo"]) >= 1).mean(),
          ((e.loc[(e["condicion"] == "Ingresante nueva admisión")
                  & (e["rezago"] == 1), "cicloSig"]
            - e.loc[(e["condicion"] == "Ingresante nueva admisión")
                    & (e["rezago"] == 1), "Ciclo"]) == 0).mean()])))

print("\n" + "=" * 78)
print("8. CONTINUACIÓN GLOBAL POR REZAGO (anexo A.6)")
print("=" * 78)
n = len(e)
for L in range(1, 5):
    print("  L = %d   %.2f %%" % (L, 100 * (e["rezago"] == L).mean()))
print("  no vuelve %.2f %%  (n = %d)" % (100 * e["rezago"].isna().mean(), n))
