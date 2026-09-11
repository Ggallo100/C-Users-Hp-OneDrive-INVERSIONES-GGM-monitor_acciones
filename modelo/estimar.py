#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Modelo de flujo de cohortes para la proyección de matrícula universitaria.
Implementación de referencia en Python.

Produce `parametros.json`, que consume el motor JavaScript del modelo HTML, y
ejecuta la validación estadística (backtesting de origen móvil) que sustenta
los tres escenarios.

Estructura
----------
1. Panel estudiante-periodo y transiciones de siguiente matrícula.
2. Continuación por rezago   q_L(sede, carrera, ciclo, paridad).
3. Avance de ciclo           A(Δciclo | carrera, ciclo).
4. Transición de turno       T(turno→turno' | sede, ciclo).
5. Mezcla de turno de los ingresantes  M(turno | sede, carrera, ciclo, paridad).
6. Descomposición de varianza: muestral, estacional y choque de periodo.
7. Propagación de varianza predictiva y calibración de escenarios.
8. Backtesting de origen móvil y selección de la semivida de recencia.
"""
import json
import os
import numpy as np
import pandas as pd

RUTA = ("/root/.claude/uploads/44616b33-dba5-571e-87f8-59fe5748354c/"
        "a85cb9c2-historico_matriculados_con_fecha_de_matricula.xlsx")
LAG_MAX = 4
DELTAS = [-1, 0, 1, 2, 3]


# =============================================================================
# 1. Panel y transiciones
# =============================================================================
def cargar():
    try:
        return pd.read_pickle("hist.pkl")
    except Exception:
        df = pd.read_excel(RUTA, sheet_name="Anexar1", engine="openpyxl")
        df.to_pickle("hist.pkl")
        return df


def panel(df):
    """Un registro por estudiante y periodo, con su SIGUIENTE matrícula."""
    per = sorted(int(p) for p in df["Periodo_real"].unique())
    idx = {p: i for i, p in enumerate(per)}
    b = (df[["cPerCodigo", "Periodo_real", "Sede", "Carrera", "Modalidad_estudios",
             "Ciclo", "Turno", "Nuevos"]]
         .drop_duplicates(subset=["cPerCodigo", "Periodo_real"]).copy())
    b["Periodo_real"] = b["Periodo_real"].astype(int)
    b["t"] = b["Periodo_real"].map(idx)
    b["par"] = b["Periodo_real"] % 100
    b["esNuevo"] = b["Nuevos"].fillna(0).astype(int)
    b = b.sort_values(["cPerCodigo", "t"]).reset_index(drop=True)
    g = b.groupby("cPerCodigo")
    # La siguiente APARICIÓN, no el periodo siguiente: así el reingreso tras
    # una pausa se modela como flujo con rezago en vez de perderse.
    b["tSig"] = g["t"].shift(-1)
    b["cicloSig"] = g["Ciclo"].shift(-1)
    b["turnoSig"] = g["Turno"].shift(-1)
    b["rezago"] = b["tSig"] - b["t"]
    return b, per, idx


def clasifica_delta(d):
    return -1 if d <= -1 else (3 if d >= 3 else int(d))


# =============================================================================
# Contracción empírico-Bayes
# =============================================================================
def k_betabinom(exitos, ensayos):
    """
    Constante de contracción del modelo Beta-Binomial por el método de los
    momentos:  k = alfa + beta = p(1-p)/s2_entre - 1.

    Interpretación: k es el tamaño muestral equivalente del prior. Una celda con
    n observaciones pondera n/(n+k) su propia evidencia y k/(n+k) la del padre.
    """
    e = np.asarray(exitos, float)
    n = np.asarray(ensayos, float)
    m = n > 0
    e, n = e[m], n[m]
    if len(n) < 3:
        return 50.0
    pg = e.sum() / n.sum()
    if not (0 < pg < 1):
        return 50.0
    p = e / n
    w = n / n.sum()
    var_obs = float(np.sum(w * (p - pg) ** 2))
    var_mue = float(np.sum(w * pg * (1 - pg) / n))
    entre = var_obs - var_mue
    if entre <= 1e-9:
        return 1e4
    return float(min(max(pg * (1 - pg) / entre - 1, 1.0), 1e4))


def k_dirichlet(mat):
    """Contracción para composiciones, vía la categoría de mayor masa."""
    mat = np.asarray(mat, float)
    n = mat.sum(axis=1)
    if (n > 0).sum() < 3:
        return 20.0
    j = int(np.argmax(mat.sum(axis=0)))
    return k_betabinom(mat[:, j], n)


# =============================================================================
# 2-5. Tablas de conteo (ponderadas por recencia)
# =============================================================================
def pesos(b, tmax, lam):
    """Peso exponencial de recencia: lam^(tmax - t). lam=1 pondera por igual."""
    return np.power(float(lam), tmax - b["t"].values)


def tabla_continuacion(b, nper, lam):
    """
    Conteos ponderados de continuación por (sede, carrera, ciclo, par) y rezago.

    Censura: un origen en t entra en el conjunto de riesgo del rezago L sólo si
    t+L cae dentro de la ventana observada; sin ese control los rezagos largos
    quedarían sesgados a la baja.
    """
    w = pesos(b, nper - 1, lam)
    tt = b["t"].values
    rz = b["rezago"].values
    sede = b["Sede"].values
    carr = b["Carrera"].values
    cic = b["Ciclo"].values.astype(int)
    par = b["par"].values.astype(int)
    filas = {}
    for i in range(len(b)):
        f = filas.setdefault((sede[i], carr[i], cic[i], par[i]),
                             [np.zeros(LAG_MAX), np.zeros(LAG_MAX)])
        for L in range(1, LAG_MAX + 1):
            if tt[i] + L <= nper - 1:
                f[0][L - 1] += w[i]
        if not np.isnan(rz[i]):
            L = int(rz[i])
            if 1 <= L <= LAG_MAX:
                f[1][L - 1] += w[i]
    return [{"sede": k[0], "carrera": k[1], "ciclo": k[2], "par": k[3],
             "n": v[0], "k": v[1]} for k, v in filas.items()]


def tabla_avance(b, nper, lam):
    r = b[b["tSig"].notna()].copy()
    r["w"] = pesos(r, nper - 1, lam)
    r["delta"] = (r["cicloSig"] - r["Ciclo"]).map(clasifica_delta)
    return (r.groupby(["Carrera", "Ciclo", "delta"])["w"].sum()
            .unstack("delta", fill_value=0.0).reindex(columns=DELTAS, fill_value=0.0))


def tabla_turno(b, turnos, nper, lam):
    r = b[b["tSig"].notna()].copy()
    r["w"] = pesos(r, nper - 1, lam)
    return (r.groupby(["Sede", "Ciclo", "Turno", "turnoSig"])["w"].sum()
            .unstack("turnoSig", fill_value=0.0).reindex(columns=turnos, fill_value=0.0))


def tabla_nuevos_turno(b, turnos, nper, lam_n):
    n = b[b["esNuevo"] == 1].copy()
    n["w"] = pesos(n, nper - 1, lam_n)
    return (n.groupby(["Sede", "Carrera", "Ciclo", "par", "Turno"])["w"].sum()
            .unstack("Turno", fill_value=0.0).reindex(columns=turnos, fill_value=0.0))


# =============================================================================
# 6. Descomposición de varianza
# =============================================================================
def varianza_proceso(b, nper):
    """
    Separa la volatilidad de la continuación en tres componentes:

      1. Muestral   p(1-p)/n : ruido binomial de cada celda; se diluye al
                    agregar, luego no explica la incertidumbre del total.
      2. Estacional : diferencia sistemática entre el primer y el segundo
                    semestre. Es PREDECIBLE y ya está en el punto central,
                    porque q_L condiciona en la paridad del periodo de origen.
      3. Choque de periodo : lo que resta tras descontar ciclo y estacionalidad.
                    Es común a todas las cohortes del mismo periodo y por eso
                    NO se cancela al agregar: es el motor de los escenarios.

    Modelo auxiliar: GLM binomial con enlace logit,
        logit P(continúa) = mu + a_ciclo + g_periodo
    La paridad queda anidada en el periodo (incluirla aparte daría un diseño de
    rango deficiente), así que se extrae después proyectando los efectos de
    periodo sobre la paridad; el residuo es el choque estocástico.
    """
    import statsmodels.api as sm
    import statsmodels.formula.api as smf
    from scipy import stats

    r = b[b["t"] < nper - 1].copy()
    r["cont"] = (r["rezago"] == 1).fillna(False).astype(int)
    r["ciclo_f"] = r["Ciclo"].astype(str)
    r["periodo_f"] = r["Periodo_real"].astype(str)

    mod = smf.glm("cont ~ C(ciclo_f) + C(periodo_f)", data=r,
                  family=sm.families.Binomial()).fit()
    base = smf.glm("cont ~ C(ciclo_f)", data=r, family=sm.families.Binomial()).fit()

    per_o = sorted(r["Periodo_real"].unique())
    coef = mod.params
    ef = np.array([0.0] + [float(coef.get(f"C(periodo_f)[T.{p}]", 0.0)) for p in per_o[1:]])
    ef -= ef.mean()

    par_o = np.array([p % 100 for p in per_o])
    est = {q: float(ef[par_o == q].mean()) if (par_o == q).any() else 0.0 for q in (1, 2)}
    cen = np.mean(list(est.values()))
    est = {q: v - cen for q, v in est.items()}
    resid = ef - np.array([est[q] for q in par_o])
    gl = max(len(ef) - 2, 1)
    sigma_choque = float(np.sqrt(np.sum(resid ** 2) / gl))

    lr = float(2 * (mod.llf - base.llf))
    gl_lr = int(len(per_o) - 1)
    agg = r.groupby("Periodo_real")["cont"].mean()
    npp = r.groupby("Periodo_real")["cont"].size()
    var_obs = float(agg.var(ddof=1))
    var_mue = float(np.mean(agg * (1 - agg) / npp))

    return {
        "sigma_logit_choque": sigma_choque,
        "sigma_logit_total": float(np.std(ef, ddof=1)),
        "gl_choque": gl,
        "estacional_logit": {str(k): float(v) for k, v in est.items()},
        "efectos_periodo": {str(p): float(e) for p, e in zip(per_o, ef)},
        "tasa_agregada": {str(k): float(v) for k, v in agg.items()},
        "var_observada": var_obs, "var_muestral": var_mue,
        "var_proceso": max(var_obs - var_mue, 0.0),
        "lr_periodo": lr, "gl_lr": gl_lr,
        "p_periodo": float(stats.chi2.sf(lr, gl_lr)),
        "n_periodos": int(len(agg)), "n_obs": int(len(r)),
        "devianza": float(mod.deviance), "gl": int(mod.df_resid),
        "pseudo_r2": float(1 - mod.deviance / mod.null_deviance),
        "llf": float(mod.llf), "aic": float(mod.aic),
    }


# =============================================================================
# Construcción del paquete de parámetros
# =============================================================================
def construir_parametros(b, per, hasta=None, lam=0.50, lam_n=0.30):
    if hasta is None:
        hasta = per[-1]
    per_u = [p for p in per if p <= hasta]
    nper = len(per_u)
    idx = {p: i for i, p in enumerate(per_u)}

    bb = b[b["Periodo_real"] <= hasta].copy()
    bb["t"] = bb["Periodo_real"].map(idx)
    bb = bb.sort_values(["cPerCodigo", "t"])
    g = bb.groupby("cPerCodigo")
    bb["tSig"] = g["t"].shift(-1)
    bb["cicloSig"] = g["Ciclo"].shift(-1)
    bb["turnoSig"] = g["Turno"].shift(-1)
    bb["rezago"] = bb["tSig"] - bb["t"]

    turnos = sorted(bb["Turno"].unique())
    sedes = sorted(bb["Sede"].unique())
    carreras = sorted(bb["Carrera"].unique())
    ciclo_max = int(bb["Ciclo"].max())
    R4 = lambda v: [round(float(x), 4) for x in v]

    # --- continuación ------------------------------------------------------
    tab = tabla_continuacion(bb, nper, lam)
    dfc = pd.DataFrame(tab)
    for L in range(LAG_MAX):
        dfc[f"n{L}"] = dfc["n"].str[L]
        dfc[f"k{L}"] = dfc["k"].str[L]
    cols = [f"n{L}" for L in range(LAG_MAX)] + [f"k{L}" for L in range(LAG_MAX)]
    niv = {
        "carrera": dfc.groupby(["carrera", "ciclo", "par"])[cols].sum(),
        "ciclopar": dfc.groupby(["ciclo", "par"])[cols].sum(),
        "ciclo": dfc.groupby(["ciclo"])[cols].sum(),
    }
    glob = dfc[cols].sum()

    def a_dict(d):
        out = {}
        for key in d.index:
            kk = "|".join(str(x) for x in (key if isinstance(key, tuple) else (key,)))
            out[kk] = {"n": R4([d[f"n{L}"][key] for L in range(LAG_MAX)]),
                       "k": R4([d[f"k{L}"][key] for L in range(LAG_MAX)])}
        return out

    cont_celda = {f"{r['sede']}|{r['carrera']}|{r['ciclo']}|{r['par']}":
                  {"n": R4(r["n"]), "k": R4(r["k"])} for r in tab}
    ks = {"celda": [], "carrera": [], "ciclopar": [], "ciclo": []}
    for L in range(LAG_MAX):
        ks["celda"].append(k_betabinom(dfc[f"k{L}"], dfc[f"n{L}"]))
        ks["carrera"].append(k_betabinom(niv["carrera"][f"k{L}"], niv["carrera"][f"n{L}"]))
        ks["ciclopar"].append(k_betabinom(niv["ciclopar"][f"k{L}"], niv["ciclopar"][f"n{L}"]))
        ks["ciclo"].append(k_betabinom(niv["ciclo"][f"k{L}"], niv["ciclo"][f"n{L}"]))

    # --- avance de ciclo ---------------------------------------------------
    av = tabla_avance(bb, nper, lam)
    av_celda = {f"{c}|{ci}": R4(av.loc[(c, ci)].values) for (c, ci) in av.index}
    avc = av.groupby(level="Ciclo").sum()
    av_ciclo = {str(ci): R4(avc.loc[ci].values) for ci in avc.index}

    # --- turno -------------------------------------------------------------
    tu = tabla_turno(bb, turnos, nper, lam)
    tu_celda = {f"{s}|{ci}|{t}": R4(tu.loc[(s, ci, t)].values) for (s, ci, t) in tu.index}
    tus = tu.groupby(level=["Sede", "Turno"]).sum()
    tu_sede = {f"{s}|{t}": R4(tus.loc[(s, t)].values) for (s, t) in tus.index}

    # --- mezcla de turno de ingresantes ------------------------------------
    nt = tabla_nuevos_turno(bb, turnos, nper, lam_n)
    nt_celda = {f"{s}|{c}|{ci}|{pa}": R4(nt.loc[(s, c, ci, pa)].values)
                for (s, c, ci, pa) in nt.index}
    g1 = nt.groupby(level=["Sede", "Carrera", "par"]).sum()
    g2 = nt.groupby(level=["Sede", "Carrera"]).sum()
    g3 = nt.groupby(level=["Sede", "par"]).sum()
    g4 = nt.groupby(level=["Sede"]).sum()

    # --- longitud de plan --------------------------------------------------
    # Un ciclo con continuación alta implica que el plan sigue más allá; el
    # último ciclo con continuación alta + 1 es el ciclo terminal. Las carreras
    # censuradas (programas nuevos, sin cohortes avanzadas) conservan el valor
    # por defecto de 10 ciclos.
    cc = (bb[bb["t"] < nper - 1].assign(cont=lambda d: (d["rezago"] == 1).astype(int))
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
        plan[c] = int(min(tope, ciclo_max))

    # Apertura de sede: el ciclo máximo de su primer semestre observado revela
    # si la sede arrancó en la ventana de datos o es anterior a ella.
    apertura = {}
    for sede in sedes:
        sub = bb[bb["Sede"] == sede]
        ini = int(sub["Periodo_real"].min())
        base = int(sub[sub["Periodo_real"] == ini]["Ciclo"].max())
        apertura[sede] = {"inicio": ini, "cicloBase": base,
                          "enMaduracion": bool(base <= 2)}

    return {
        "periodos": per_u, "turnos": turnos, "sedes": sedes, "carreras": carreras,
        "cicloMax": ciclo_max, "planCiclos": plan, "planDefecto": 10,
        "sedeApertura": apertura,
        "deltas": DELTAS, "lagMax": LAG_MAX, "lambda": lam, "lambdaNuevos": lam_n,
        "cont_celda": cont_celda,
        "cont_carrera": a_dict(niv["carrera"]),
        "cont_ciclopar": a_dict(niv["ciclopar"]),
        "cont_ciclo": a_dict(niv["ciclo"]),
        "cont_global": [float(glob[f"k{L}"]) / max(float(glob[f"n{L}"]), 1e-9)
                        for L in range(LAG_MAX)],
        "k_celda": ks["celda"], "k_carrera": ks["carrera"],
        "k_ciclopar": ks["ciclopar"], "k_ciclo": ks["ciclo"],
        "av_celda": av_celda, "av_ciclo": av_ciclo, "av_global": R4(av.sum().values),
        "k_avance": k_dirichlet(np.array(list(av_celda.values()), float)),
        "tu_celda": tu_celda, "tu_sede": tu_sede,
        "k_turno": k_dirichlet(np.array(list(tu_celda.values()), float)),
        "nt_celda": nt_celda,
        "nt_carrera_par": {f"{s}|{c}|{pa}": R4(g1.loc[(s, c, pa)].values)
                           for (s, c, pa) in g1.index},
        "nt_carrera": {f"{s}|{c}": R4(g2.loc[(s, c)].values) for (s, c) in g2.index},
        "nt_sede_par": {f"{s}|{pa}": R4(g3.loc[(s, pa)].values) for (s, pa) in g3.index},
        "nt_sede": {f"{s}": R4(g4.loc[s].values) for s in g4.index},
        "nt_global": R4(nt.sum().values),
        "k_nuevos": k_dirichlet(np.array(list(nt_celda.values()), float)),
    }


# =============================================================================
# 7. Motor de proyección con propagación de varianza
# =============================================================================
def anterior(periodo, L):
    a, s = divmod(periodo, 100)
    for _ in range(L):
        a, s = (a - 1, 2) if s == 1 else (a, 1)
    return a * 100 + s


def indice_periodo(periodo):
    """Posición absoluta del semestre en la recta temporal: 2023-I -> 4046."""
    a, sem = divmod(periodo, 100)
    return a * 2 + (sem - 1)


def siguiente(periodo, L=1):
    a, s = divmod(periodo, 100)
    for _ in range(L):
        a, s = (a, 2) if s == 1 else (a + 1, 1)
    return a * 100 + s


class Modelo:
    """Replica exactamente la lógica del motor JavaScript del modelo HTML."""

    def __init__(self, par, factor_k=1.0):
        self.p = par
        self.turnos = par["turnos"]
        self.fk = factor_k
        self._cq = {}

    # --- parámetros contraídos --------------------------------------------
    def q(self, sede, carrera, ciclo, parid, L):
        """Tasa de continuación contraída y su tamaño muestral efectivo."""
        ck = (sede, carrera, ciclo, parid, L)
        if ck in self._cq:
            return self._cq[ck]
        p = self.p
        i = L - 1
        cl = str(min(ciclo, p["cicloMax"]))
        cadena = [
            (p["cont_ciclo"].get(cl), p["k_ciclo"][i] * self.fk),
            (p["cont_ciclopar"].get(f"{cl}|{parid}"), p["k_ciclopar"][i] * self.fk),
            (p["cont_carrera"].get(f"{carrera}|{cl}|{parid}"), p["k_carrera"][i] * self.fk),
            (p["cont_celda"].get(f"{sede}|{carrera}|{cl}|{parid}"), p["k_celda"][i] * self.fk),
        ]
        est = p["cont_global"][i]
        nef = 0.0
        for nivel, k in cadena:
            if nivel is None:
                continue
            n, kk = nivel["n"][i], nivel["k"][i]
            if n <= 0:
                continue
            est = (kk + k * est) / (n + k)
            nef = n + k
        est = min(max(est, 1e-9), 1 - 1e-9)
        self._cq[ck] = (est, max(nef, 1.0))
        return self._cq[ck]

    def _comp(self, celda, padre, k):
        """Composición contraída hacia el padre (Dirichlet-Multinomial)."""
        pad = np.asarray(padre, float)
        sp = pad.sum()
        pad = pad / sp if sp > 0 else np.full(len(pad), 1.0 / len(pad))
        if celda is None:
            return pad, k
        c = np.asarray(celda, float)
        v = (c + k * pad) / (c.sum() + k)
        s = v.sum()
        return (v / s if s > 0 else pad), c.sum() + k

    def tope_sede(self, sede, T):
        """
        Ciclo máximo que una sede puede ofrecer en el semestre T.

        Una sede recién abierta despliega su plan de estudios semestre a
        semestre: en el de apertura sólo existe el ciclo 1, un semestre después
        el 2, y así sucesivamente. Sin este tope la proyección colocaría
        estudiantes en ciclos que la sede todavía no imparte, porque la matriz
        de avance permite saltos de +2 y +3 y el archivo de ingresantes puede
        declarar traslados a ciclos superiores.

        Las sedes consolidadas devuelven un tope inoperante.
        """
        ap = self.p.get("sedeApertura", {}).get(sede)
        if not ap or not ap.get("enMaduracion"):
            return 10 ** 6
        # Antes de la apertura el tope sería negativo; 0 expresa que la sede
        # aún no ofrece ningún ciclo.
        return max(0, ap["cicloBase"] + (indice_periodo(T) - indice_periodo(ap["inicio"])))

    def avance(self, carrera, ciclo):
        p = self.p
        cl = str(min(ciclo, p["cicloMax"]))
        pad = p["av_ciclo"].get(cl, p["av_global"])
        return self._comp(p["av_celda"].get(f"{carrera}|{cl}"), pad, p["k_avance"] * self.fk)

    def turno_trans(self, sede, ciclo, turno):
        p = self.p
        cl = str(min(ciclo, p["cicloMax"]))
        pad = p["tu_sede"].get(f"{sede}|{turno}")
        if pad is None:
            v = np.zeros(len(self.turnos))
            v[self.turnos.index(turno)] = 1.0
            return v, 1e6
        return self._comp(p["tu_celda"].get(f"{sede}|{cl}|{turno}"), pad,
                          p["k_turno"] * self.fk)

    def mezcla_nuevos(self, sede, carrera, ciclo, parid):
        """
        Estimación matemática del reparto por turno de los ingresantes.
        Escalera de contracción: global -> sede -> (sede,par) -> (sede,carrera)
        -> (sede,carrera,par) -> celda. Una carrera NUEVA, sin historia propia,
        se queda en el nivel de sede, que sí la tiene.
        """
        p = self.p
        cl = str(min(ciclo, p["cicloMax"]))
        k = p["k_nuevos"] * self.fk
        cadena = [
            p["nt_sede"].get(sede),
            p["nt_sede_par"].get(f"{sede}|{parid}"),
            p["nt_carrera"].get(f"{sede}|{carrera}"),
            p["nt_carrera_par"].get(f"{sede}|{carrera}|{parid}"),
            p["nt_celda"].get(f"{sede}|{carrera}|{cl}|{parid}"),
        ]
        v = np.asarray(p["nt_global"], float)
        v = v / max(v.sum(), 1e-9)
        nef = k
        for nivel in cadena:
            if nivel is None:
                continue
            c = np.asarray(nivel, float)
            if c.sum() <= 0:
                continue
            v, nef = self._comp(c, v, k)
        return v, nef

    # --- proyección --------------------------------------------------------
    def proyectar(self, stock0, nuevos, periodos, shock=0.0, varianza=False):
        """
        stock0  : {periodo: {(sede,carrera,ciclo,turno): valor}} historia inicial.
        nuevos  : {periodo: {(sede,carrera,ciclo): cantidad}}.
        shock   : desplazamiento sistémico en escala logit sobre q_L.
        varianza: si True devuelve también la varianza INDEPENDIENTE por celda.

        Descomposición de la incertidumbre:
          - SISTÉMICA: se obtiene reproyectando con shock != 0. Es común a todas
            las celdas, luego se suma linealmente al agregar.
          - INDEPENDIENTE (varianza V): realización multinomial, incertidumbre
            de parámetro y varianza propagada del stock de origen. Se suma en
            cuadratura al agregar.
        """
        p = self.p
        hist = {k: dict(v) for k, v in stock0.items()}
        hvar = {k: {kk: 0.0 for kk in v} for k, v in stock0.items()}
        res, resv = {}, {}
        for T in periodos:
            parid = T % 100
            dest, dvar = {}, {}
            for L in range(1, LAG_MAX + 1):
                Tori = anterior(T, L)
                st = hist.get(Tori)
                if not st:
                    continue
                vr = hvar.get(Tori, {})
                parO = Tori % 100
                for (sede, carrera, ciclo, turno), val in st.items():
                    if val <= 0:
                        continue
                    qq, nq = self.q(sede, carrera, ciclo, parO, L)
                    if shock:
                        lo = np.log(qq / (1 - qq)) + shock
                        qq = 1.0 / (1.0 + np.exp(-lo))
                    if qq <= 0:
                        continue
                    av, na = self.avance(carrera, ciclo)
                    tt, nt = self.turno_trans(sede, ciclo, turno)
                    tope = min(p["planCiclos"].get(carrera, p["planDefecto"]),
                               self.tope_sede(sede, T))
                    vx = vr.get((sede, carrera, ciclo, turno), 0.0)
                    for di, d in enumerate(DELTAS):
                        if av[di] <= 0:
                            continue
                        c2 = min(max(ciclo + d, 1), tope)
                        for ti, t2 in enumerate(self.turnos):
                            if tt[ti] <= 0:
                                continue
                            phi = qq * av[di] * tt[ti]
                            key = (sede, carrera, c2, t2)
                            dest[key] = dest.get(key, 0.0) + val * phi
                            if varianza:
                                v_real = val * phi * (1 - phi)
                                v_par = (val ** 2) * (phi ** 2) * (
                                    (1 - qq) / (qq * nq)
                                    + (1 - av[di]) / (av[di] * na)
                                    + (1 - tt[ti]) / (tt[ti] * nt))
                                dvar[key] = dvar.get(key, 0.0) + v_real + v_par + vx * phi ** 2
            for (sede, carrera, ciclo), cant in nuevos.get(T, {}).items():
                if cant <= 0:
                    continue
                # El ingresante tampoco puede entrar a un ciclo que la sede aún
                # no imparte ni que exceda el plan de la carrera.
                ciclo = min(ciclo, p["planCiclos"].get(carrera, p["planDefecto"]),
                            self.tope_sede(sede, T))
                mz, nm = self.mezcla_nuevos(sede, carrera, ciclo, parid)
                for ti, t2 in enumerate(self.turnos):
                    if mz[ti] <= 0:
                        continue
                    key = (sede, carrera, ciclo, t2)
                    dest[key] = dest.get(key, 0.0) + cant * mz[ti]
                    if varianza:
                        dvar[key] = dvar.get(key, 0.0) + cant * mz[ti] * (1 - mz[ti]) \
                            + (cant ** 2) * mz[ti] * (1 - mz[ti]) / nm
            res[T], resv[T] = dest, dvar
            hist[T], hvar[T] = dest, dvar
        return (res, resv) if varianza else res


# =============================================================================
# 8. Datos observados, métricas y backtesting
# =============================================================================
def stock_observado(b):
    t = b.groupby(["Periodo_real", "Sede", "Carrera", "Ciclo", "Turno"]).size()
    out = {}
    for (p, s, c, ci, tu), v in t.items():
        out.setdefault(int(p), {})[(s, c, int(ci), tu)] = float(v)
    return out


def nuevos_observados(b):
    n = b[b["esNuevo"] == 1].groupby(["Periodo_real", "Sede", "Carrera", "Ciclo"]).size()
    out = {}
    for (p, s, c, ci), v in n.items():
        out.setdefault(int(p), {})[(s, c, int(ci))] = float(v)
    return out


def agrega(d, ix):
    out = {}
    for k, v in d.items():
        kk = tuple(k[i] for i in ix)
        out[kk] = out.get(kk, 0.0) + v
    return out


NIVELES = {"Total": (), "Sede": (0,), "Carrera": (1,), "Sede×Carrera": (0, 1),
           "Sede×Carrera×Ciclo": (0, 1, 2), "Sede×Carrera×Ciclo×Turno": (0, 1, 2, 3)}


def epap(real, prev):
    """Error porcentual absoluto ponderado (WAPE)."""
    claves = set(real) | set(prev)
    num = sum(abs(prev.get(k, 0.0) - real.get(k, 0.0)) for k in claves)
    den = sum(real.get(k, 0.0) for k in claves)
    return num / max(den, 1e-9)


def backtest(b, per, stock, nuevos, lam, lam_n, factor_k=1.0, desde=4):
    """Origen móvil: reestima con datos hasta `hasta` y proyecta el resto."""
    filas = []
    for corte in range(desde, len(per)):
        hasta, fut = per[corte], per[corte + 1:]
        if not fut:
            break
        par = construir_parametros(b, per, hasta=hasta, lam=lam, lam_n=lam_n)
        mod = Modelo(par, factor_k)
        st0 = {p: stock[p] for p in per if p <= hasta}
        pr = mod.proyectar(st0, nuevos, fut)
        for h, T in enumerate(fut, start=1):
            for nom, ix in NIVELES.items():
                filas.append({"hasta": hasta, "periodo": T, "h": h, "nivel": nom,
                              "epap": epap(agrega(stock[T], ix), agrega(pr[T], ix)),
                              "sesgo": sum(pr[T].values()) - sum(stock[T].values())})
    return pd.DataFrame(filas)


# =============================================================================
if __name__ == "__main__":
    df = cargar()
    b, per, idx = panel(df)
    stock, nuevos = stock_observado(b), nuevos_observados(b)
    print("Periodos:", per, "| transiciones:", int(b["tSig"].notna().sum()))
    # Los valores por defecto (lam=0,50 y lam_n=0,30) son los que este mismo
    # barrido selecciona; se recorre la rejilla para poder reproducir la elección.

    print("\n=== SELECCIÓN DE λ (recencia) POR BACKTESTING DE ORIGEN MÓVIL ===")
    print(f"{'lambda':>7} {'EPAP Total':>11} {'EPAP S×C':>10} {'EPAP S×C×Ci':>12} {'sesgo':>9}")
    rej = []
    for lam in [1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.6, 0.5]:
        bt = backtest(b, per, stock, nuevos, lam, 0.75)
        fila = {"lam": lam,
                "total": float(bt[bt.nivel == "Total"]["epap"].mean()),
                "sc": float(bt[bt.nivel == "Sede×Carrera"]["epap"].mean()),
                "sci": float(bt[bt.nivel == "Sede×Carrera×Ciclo"]["epap"].mean()),
                "sesgo": float(bt[bt.nivel == "Total"]["sesgo"].mean())}
        rej.append(fila)
        print(f"{lam:7.2f} {fila['total']*100:10.2f}% {fila['sc']*100:9.2f}%"
              f" {fila['sci']*100:11.2f}% {fila['sesgo']:9.0f}")
    rj = pd.DataFrame(rej)
    LAM = float(rj.loc[rj["total"].idxmin(), "lam"])
    print(f"\nλ seleccionada (mínimo EPAP del total): {LAM}")
    json.dump({"grid": rej, "elegida": LAM},
              open("seleccion_lambda.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
