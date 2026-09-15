#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lectura y clasificación de la base central de la universidad
(`BD_GENERAL_CONSOLIDADO.xlsx`), que es la AUTORIDAD sobre la condición del
estudiante.

Por qué existe este módulo
--------------------------
El histórico de matriculados no permite reproducir la clasificación oficial.
La distinción entre REGULAR y RECUPERADO no la da el flujo de matrícula sino
el campo `Condicion`: el estado académico con que el estudiante cerró el
semestre anterior. Un estudiante que abandonó, se retiró o quedó inhabilitado
y aun así se matricula al semestre siguiente es un recuperado; el que cerró
activo es un regular. El salto de ciclo está correlacionado —el 81,8 % de los
recuperados repite ciclo— pero no es la definición.

La regla, reconstruida y contrastada contra `Tipo_estudiante` con un 99,1 %
de coincidencia sobre los seis semestres limpios:

    Ingresante                 primera matrícula
    Ingresante nueva admisión  reingreso por NUEVA ADMISIÓN tras ausencia larga
    Regular                    brecha 1 y el semestre anterior cerró ACTIVO
    Recuperado                 brecha 1 y el semestre anterior NO cerró activo
    Reinicio                   brecha de dos o más semestres

Dos artefactos de la base y cómo se tratan
------------------------------------------
1. En 2023-I todos los continuadores figuran como «Reinicio» (7 855): es el
   primer semestre cargado y el clasificador no ve la matrícula anterior.
   `Ultima_matricula` demuestra que 7 463 de ellos venían de 2022-II, o sea
   que eran regulares. El periodo se excluye de la estimación.
2. Los ciclos de verano (202300, 202400, …) figuran íntegramente como
   «Reinicio» (3 512). No son semestres regulares y se excluyen.

Además 2026-II sólo trae 708 filas —la extracción es del 18 de junio de 2026,
anterior a esa campaña— así que tampoco entra.
"""
import os
import re

import numpy as np
import pandas as pd

AQUI = os.path.dirname(os.path.abspath(__file__))
RUTA = ("/root/.claude/uploads/44616b33-dba5-571e-87f8-59fe5748354c/"
        "637b4abd-BD_GENERAL_CONSOLIDADO.xlsx")
CACHE = os.path.join(AQUI, "central.pkl")

# Condiciones con que un semestre puede CERRARSE sin ruptura. El resto
# —ABANDONO DE CICLO, RETIRADO, INHABILITADO— convierte en recuperado a quien
# se vuelve a matricular al semestre siguiente.
CIERRE_ACTIVO = {"ACTIVO", "TERMINÓ MALLA CURRICULAR", "EGRESADO"}

# Nomenclatura de la base central -> la del modelo.
MODALIDAD = {"A DISTANCIA": "A distancia", "PRESENCIAL": "Presencial",
             "SEMIPRESENCIAL": "Semi Presencial"}

CONDICIONES = ["Ingresante", "Regular", "Recuperado", "Reinicio",
               "Ingresante nueva admisión"]

# Periodos que no entran en la estimación, por los motivos del encabezado.
EXCLUIDOS = {202301, 202602}


def cargar(ruta=RUTA):
    """Lee la base central con caché en disco."""
    if os.path.exists(CACHE):
        return pd.read_pickle(CACHE)
    cols = ["ARCHIVO", "Sede", "Carrera", "Modalidad_estudios", "Codigo_estudiante",
            "Ciclo_estudiante", "Tipo_estudiante", "Condicion", "Modalidad_ingreso",
            "Ultima_matricula", "Semestre_ingreso", "Fecha_matricula", "Edad"]
    df = pd.read_excel(ruta, usecols=cols)
    df.to_pickle(CACHE)
    return df


def panel(df):
    """
    Un registro por estudiante y semestre, con su condición de llegada.

    El código de estudiante viene como entero en unos semestres y como cadena
    en otros; sin normalizarlo el panel parte al mismo estudiante en dos y las
    brechas salen mal.
    """
    b = df.copy()
    b["Periodo_real"] = (b["ARCHIVO"].astype(str)
                         .str.extract(r"Requisitos_(\d{6})_")[0].astype(int))
    b = b[b["Periodo_real"] % 100 != 0]                 # fuera los ciclos de verano
    b["cod"] = (b["Codigo_estudiante"].astype(str).str.strip()
                .str.replace(r"\.0$", "", regex=True))
    b["Modalidad_estudios"] = b["Modalidad_estudios"].map(MODALIDAD)
    b["Ciclo"] = b["Ciclo_estudiante"].astype(int)
    b["t"] = (b["Periodo_real"] // 100) * 2 + (b["Periodo_real"] % 100 - 1)
    b["par"] = b["Periodo_real"] % 100
    b = b.drop_duplicates(["cod", "t"]).sort_values(["cod", "t"]).reset_index(drop=True)

    g = b.groupby("cod", sort=False)
    b["tSig"] = g["t"].shift(-1)
    b["cicloSig"] = g["Ciclo"].shift(-1)
    b["rezago"] = b["tSig"] - b["t"]
    b["brecha"] = b["t"] - g["t"].shift(1)
    b["cierreAnt"] = g["Condicion"].shift(1)
    # `Ultima_matricula` alcanza más atrás que la ventana cargada: para un
    # ingresante es el propio semestre y para el resto, el de su matrícula
    # anterior. Es lo que permite distinguir a un reingreso antiguo de un
    # ingresante genuino en los semestres del arranque.
    um = pd.to_numeric(b["Ultima_matricula"], errors="coerce")
    b["previaFuera"] = (um.notna() & (um < b["Periodo_real"])
                        & b["brecha"].isna()).values
    b["condicion"] = condicion_de(b)
    b["esNuevo"] = b["condicion"].isin(
        ["Ingresante", "Ingresante nueva admisión"]).astype(int)
    b["condSig"] = b.groupby("cod", sort=False)["condicion"].shift(-1)
    return b


def panel_estimacion(df=None):
    """
    Panel listo para estimar: sin el semestre parcial y sin 2023-I.

    2026-II sólo trae 708 filas, de modo que dejarlo dentro censuraría todos
    los orígenes de 2026-I —parecería que nadie continuó— y hundiría las tasas.
    Se elimina ANTES de calcular el futuro de cada estudiante, no después.
    """
    b = panel(cargar() if df is None else df)
    b = b[b["Periodo_real"] != 202602].sort_values(["cod", "t"]).copy()
    g = b.groupby("cod", sort=False)
    b["tSig"] = g["t"].shift(-1)
    b["cicloSig"] = g["Ciclo"].shift(-1)
    b["condSig"] = g["condicion"].shift(-1)
    b["rezago"] = b["tSig"] - b["t"]
    return b[b["Periodo_real"] != 202301]


def condicion_de(b):
    """
    Condición de llegada, según la regla oficial reconstruida.

    `brecha` NaN significa que el estudiante no tiene matrícula anterior dentro
    de la ventana: o es un ingresante genuino, o su matrícula previa es anterior
    a 2023-I. La modalidad de ingreso NUEVA ADMISIÓN distingue el segundo caso,
    que es justamente lo que la universidad llama «ingresante nueva admisión».
    """
    nueva = b["Modalidad_ingreso"].eq("NUEVA ADMISIÓN").values
    br = b["brecha"].values
    sin_previa = np.isnan(br)
    fuera = b["previaFuera"].values          # volvió de antes de la ventana
    activo = b["cierreAnt"].isin(CIERRE_ACTIVO).values
    vuelve = np.where(nueva, "Ingresante nueva admisión", "Reinicio")
    return np.where(
        sin_previa,
        np.where(fuera, vuelve,
                 np.where(nueva, "Ingresante nueva admisión", "Ingresante")),
        np.where(br >= 2, vuelve, np.where(activo, "Regular", "Recuperado")))


def ventana(b):
    """Semestres utilizables para estimar."""
    return b[~b["Periodo_real"].isin(EXCLUIDOS)]


if __name__ == "__main__":
    d = cargar()
    b = panel(d)
    v = ventana(b)
    print("filas totales %d   ventana utilizable %d" % (len(b), len(v)))
    print("\n=== condición reconstruida vs Tipo_estudiante oficial ===")
    t = pd.crosstab(v["Tipo_estudiante"], v["condicion"])
    print(t.to_string())
    ok = (v["condicion"] == v["Tipo_estudiante"]).mean()
    print("\n  coincidencia %.2f %%" % (100 * ok))
    print("\n=== por periodo ===")
    print(pd.crosstab(v["Periodo_real"], v["condicion"]).to_string())
