#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comprobación de integridad del .docx generado.

LibreOffice no puede abrir docx en este entorno, así que la validación se hace
sobre el paquete OPC: que todas las partes sean XML bien formado, que cada
relación apunte a una parte existente, que cada imagen referenciada esté en el
paquete, que las tablas tengan filas homogéneas y que python-docx —que aplica
su propio esquema— logre abrirlo y recorrerlo.
"""
import os
import sys
import zipfile
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOC = os.path.join(RAIZ, 'Modelo_Proyeccion_Matricula.docx')

fallos = []


def comprueba(cond, msg):
    if not cond:
        fallos.append(msg)


z = zipfile.ZipFile(DOC)
nombres = set(z.namelist())

# 1. Todas las partes XML son XML bien formado
partes = [n for n in nombres if n.endswith(('.xml', '.rels'))]
for n in partes:
    try:
        ET.fromstring(z.read(n))
    except ET.ParseError as e:
        fallos.append(f'XML mal formado en {n}: {e}')
print(f'1. {len(partes)} partes XML analizadas')

# 2. Las relaciones apuntan a partes existentes
n_rels = 0
for n in [x for x in nombres if x.endswith('.rels')]:
    base = os.path.dirname(os.path.dirname(n))
    for r in ET.fromstring(z.read(n)):
        n_rels += 1
        if r.get('TargetMode') == 'External':
            continue
        destino = os.path.normpath(os.path.join(base, r.get('Target')))
        comprueba(destino in nombres, f'{n}: relación {r.get("Id")} apunta a {destino}, que no existe')
print(f'2. {n_rels} relaciones verificadas')

# 3. Cada imagen referenciada en el documento existe en el paquete
rels = {r.get('Id'): r.get('Target')
        for r in ET.fromstring(z.read('word/_rels/document.xml.rels'))}
raiz = ET.fromstring(z.read('word/document.xml'))
body = raiz.find(W + 'body')
emb = [b.get(R + 'embed')
       for b in raiz.iter('{http://schemas.openxmlformats.org/drawingml/2006/picture}blipFill')]
emb = [e.get(R + 'embed') for e in raiz.iter(
    '{http://schemas.openxmlformats.org/drawingml/2006/main}blip')]
for rid in emb:
    comprueba(rid in rels, f'imagen con rId {rid} sin relación')
    if rid in rels:
        comprueba(os.path.normpath('word/' + rels[rid]) in nombres,
                  f'imagen {rels[rid]} no está en el paquete')
print(f'3. {len(emb)} imágenes referenciadas, {len(set(emb))} distintas')

# 4. Tablas con filas homogéneas
tablas = body.findall(W + 'tbl')
for i, t in enumerate(tablas, 1):
    anchos = t.find(W + 'tblGrid')
    ncol = len(anchos.findall(W + 'gridCol')) if anchos is not None else None
    for j, fila in enumerate(t.findall(W + 'tr'), 1):
        n = 0
        for c in fila.findall(W + 'tc'):
            sp = c.find(W + 'tcPr/' + W + 'gridSpan')
            n += int(sp.get(W + 'val')) if sp is not None else 1
        comprueba(ncol is None or n == ncol,
                  f'tabla {i}, fila {j}: {n} celdas frente a {ncol} columnas de la rejilla')
print(f'4. {len(tablas)} tablas con filas homogéneas')

# 5. python-docx abre el documento y lo recorre entero
try:
    import docx
    d = docx.Document(DOC)
    np = len(d.paragraphs)
    nt = len(d.tables)
    ncel = sum(len(r.cells) for t in d.tables for r in t.rows)
    txt = sum(len(p.text) for p in d.paragraphs)
    print(f'5. python-docx: {np} párrafos, {nt} tablas, {ncel} celdas, {txt} caracteres')
    comprueba(np > 200, 'muy pocos párrafos')
    comprueba(nt > 20, 'muy pocas tablas')
except Exception as e:                                   # noqa: BLE001
    fallos.append(f'python-docx no puede abrir el documento: {e}')

# 6. Encabezados: numeración correlativa por capítulo
h1 = [p for p in ET.fromstring(z.read('word/document.xml')).iter(W + 'p')
      if (p.find(W + 'pPr/' + W + 'pStyle') is not None
          and p.find(W + 'pPr/' + W + 'pStyle').get(W + 'val') in ('Heading1',))]


def texto(p):
    return ''.join(t.text or '' for t in p.iter(W + 't'))


print('6. Capítulos:', ' · '.join(texto(p) for p in h1))

print()
if fallos:
    print('VALIDACIÓN FALLIDA:')
    for f in fallos:
        print('  -', f)
    sys.exit(1)
print('All validations PASSED')
