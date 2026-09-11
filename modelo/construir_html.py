#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ensambla el modelo HTML autocontenido a partir de las piezas."""
import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = "/home/user/C-Users-Hp-OneDrive-INVERSIONES-GGM-monitor_acciones/modelo_proyeccion_matricula.html"


def leer(n):
    return open(os.path.join(AQUI, n), encoding="utf-8").read()


def main():
    D = json.load(open(os.path.join(AQUI, "compacto.json"), encoding="utf-8"))
    P = json.load(open(os.path.join(AQUI, "parametros.json"), encoding="utf-8"))
    G = json.load(open(os.path.join(AQUI, "grid_lambda.json"), encoding="utf-8"))

    D["escenarios"] = {k: v for k, v in P["escenarios"].items() if k != "calibracion"}
    D["escenarios"]["calibracion"] = P["escenarios"]["calibracion"]
    D["validacion"] = P["validacion"]
    D["gridLambda"] = G["grid"]
    D["lambdaElegida"] = G["elegida"]
    D["lambdaNuevosElegida"] = G.get("elegidaNuevos", 0.30)
    D["cobertura"] = json.load(open(os.path.join(AQUI, "cobertura.json"), encoding="utf-8"))

    payload = json.dumps(D, ensure_ascii=False, separators=(",", ":"))
    # El JSON se incrusta como literal de objeto; </script> dentro de una cadena
    # cerraría la etiqueta antes de tiempo.
    payload = payload.replace("</", "<\\/")

    partes = [
        leer("p1_cabecera.html"),
        leer("p2_cuerpo.html"),
        "<script>\nconst DATOS = " + payload + ";\n</script>\n",
        "<script>\n",
        leer("p3_motor.js"), "\n",
        leer("p4_excel.js"), "\n",
        leer("p5_graficos.js"), "\n",
        leer("p6_interfaz.js"), "\n",
        leer("p7_exportar.js"), "\n",
        "iniciar();\n</script>\n</body>\n</html>\n",
    ]
    html = "".join(partes)
    open(SALIDA, "w", encoding="utf-8").write(html)
    print("Escrito:", SALIDA)
    print("Tamaño: %.1f KB" % (len(html.encode()) / 1024))
    print("Payload: %.1f KB" % (len(payload.encode()) / 1024))


if __name__ == "__main__":
    main()
