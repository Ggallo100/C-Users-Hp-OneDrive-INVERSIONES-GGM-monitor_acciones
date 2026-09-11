#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera los dos archivos de ingresantes de prueba en `fuente/descargas/`:

  ingresantes_prueba.xlsx          con la columna Modalidad
  ingresantes_sin_modalidad.xlsx   sin ella, para comprobar la compatibilidad
                                   con la plantilla anterior

La base es el último ingreso observado de cada paridad, tomado de
`compacto.json`, proyectado a los cuatro semestres siguientes. Sobre esa base se
añaden los dos casos límite que documenta el capítulo 10 del Word: un programa
nuevo en las tres modalidades y en las dos sedes, y una sede nueva con una fila
de traslados a un ciclo que todavía no puede ofertar.
"""
import json
import os

import openpyxl

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "fuente", "descargas")
CAB = ["Periodo", "Sede", "Carrera", "Modalidad", "Ciclo", "Nuevos", "CiclosPlan"]


def rotulo(p):
    return "%d-%s" % (p // 100, "I" if p % 100 == 1 else "II")


def mover(p, n):
    """Avanza n semestres sobre la nomenclatura AAAA-I / AAAA-II."""
    i = (p // 100) * 2 + (p % 100 - 1) + n
    return (i // 2) * 100 + (i % 2) + 1


def base(D, futuros):
    """Repite el último ingreso observado del semestre de la misma paridad."""
    porPeriodo = {}
    for ip, is_, ic, im, ci, v in D["nuevos"]:
        porPeriodo.setdefault(D["periodos"][ip], []).append((is_, ic, im, ci, v))
    filas = []
    for T in futuros:
        misma = [p for p in D["periodos"] if p % 100 == T % 100]
        for is_, ic, im, ci, v in porPeriodo[misma[-1]]:
            filas.append([rotulo(T), D["sedes"][is_], D["carreras"][ic],
                          D["modalidades"][im], ci, int(round(v)), None])
    return filas


def casos_limite(futuros):
    """Programa nuevo en las tres modalidades y sede nueva en despliegue."""
    ia = []
    for T, f in zip(futuros, (1.0, 0.55, 1.0, 0.55)):
        for sede, moda, n in (("Lima Sur", "A distancia", 60),
                              ("Lima Sur", "Presencial", 40),
                              ("Lima Sur", "Semi Presencial", 20),
                              ("Lima Norte", "Presencial", 25),
                              ("Lima Norte", "Semi Presencial", 10)):
            ia.append([rotulo(T), sede, "INTELIGENCIA ARTIFICIAL", moda, 1,
                       round(n * f), 8])
    # La sede abre en el tercer semestre proyectado; la fila de ciclo 4 del
    # cuarto debe recortarse al ciclo 2, que es hasta donde llega su plan.
    T3, T4 = rotulo(futuros[2]), rotulo(futuros[3])
    este = [
        [T3, "Lima Este", "ADMINISTRACIÓN DE EMPRESAS", "Presencial", 1, 90, None],
        [T3, "Lima Este", "INGENIERÍA INDUSTRIAL", "Presencial", 1, 70, None],
        [T4, "Lima Este", "ADMINISTRACIÓN DE EMPRESAS", "Presencial", 1, 50, None],
        [T4, "Lima Este", "ADMINISTRACIÓN DE EMPRESAS", "Presencial", 4, 30, None],
    ]
    return ia + este


def escribe(ruta, filas, con_modalidad):
    w = openpyxl.Workbook()
    s = w.active
    s.title = "Ingresantes"
    cab = CAB if con_modalidad else [c for c in CAB if c != "Modalidad"]
    s.append(cab)
    for f in filas:
        s.append(f if con_modalidad else [f[0], f[1], f[2], f[4], f[5], f[6]])
    w.save(ruta)
    print("%s -> %d filas, %d columnas" % (ruta, len(filas), len(cab)))


def main():
    os.makedirs(SALIDA, exist_ok=True)
    D = json.load(open(os.path.join(AQUI, "compacto.json"), encoding="utf-8"))
    futuros = [mover(D["periodos"][-1], i) for i in range(1, 5)]
    filas = base(D, futuros) + casos_limite(futuros)
    escribe(os.path.join(SALIDA, "ingresantes_prueba.xlsx"), filas, True)
    escribe(os.path.join(SALIDA, "ingresantes_sin_modalidad.xlsx"), filas, False)


if __name__ == "__main__":
    main()
