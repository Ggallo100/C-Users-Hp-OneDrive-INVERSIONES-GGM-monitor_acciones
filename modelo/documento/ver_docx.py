#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Render aproximado del .docx a HTML para inspección visual.

No sustituye a Word: reproduce el contenido (párrafos, encabezados, tablas,
imágenes y sombreados) sobre páginas A4 simuladas, para comprobar que nada
falta ni se desborda. LibreOffice no puede abrir docx en este entorno.
"""
import base64
import html
import os
import zipfile
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
DOC = 'Modelo_Proyeccion_Matricula.docx'

z = zipfile.ZipFile(DOC)
rels = {}
for r in ET.fromstring(z.read('word/_rels/document.xml.rels')):
    rels[r.get('Id')] = r.get('Target')

raiz = ET.fromstring(z.read('word/document.xml'))
body = raiz.find(W + 'body')


def texto_de(el):
    out = []
    for t in el.iter():
        if t.tag == W + 't':
            out.append(t.text or '')
        elif t.tag == W + 'tab':
            out.append('\t')
    return ''.join(out)


def runs_html(el):
    partes = []
    for r in el.findall(W + 'r'):
        rPr = r.find(W + 'rPr')
        est = []
        if rPr is not None:
            if rPr.find(W + 'b') is not None:
                est.append('font-weight:700')
            if rPr.find(W + 'i') is not None:
                est.append('font-style:italic')
            c = rPr.find(W + 'color')
            if c is not None and c.get(W + 'val') not in (None, 'auto'):
                est.append('color:#' + c.get(W + 'val'))
            s = rPr.find(W + 'sz')
            if s is not None:
                est.append('font-size:%.1fpt' % (int(s.get(W + 'val')) / 2))
            f = rPr.find(W + 'rFonts')
            if f is not None and f.get(W + 'ascii') == 'Consolas':
                est.append("font-family:'Courier New',monospace")
                est.append('white-space:pre')
        t = ''.join(x.text or '' for x in r.iter(W + 't'))
        # imagen
        for bl in r.iter(A + 'blip'):
            rid = bl.get(R + 'embed')
            destino = rels.get(rid)
            if destino:
                datos = z.read('word/' + destino)
                b64 = base64.b64encode(datos).decode()
                ancho = 6.25 * 96
                for ext in r.iter(A + 'ext'):
                    if ext.get('cx'):
                        ancho = int(ext.get('cx')) / 914400 * 96
                        break
                partes.append('<img src="data:image/png;base64,%s" style="width:%.0fpx">' % (b64, ancho))
        if t:
            partes.append('<span style="%s">%s</span>' % (';'.join(est), html.escape(t)))
        if r.find(W + 'br') is not None:
            partes.append('<hr class="salto">')
    return ''.join(partes)


def parrafo_html(pel):
    pPr = pel.find(W + 'pPr')
    estilo, clases = [], []
    nombre = None
    if pPr is not None:
        ps = pPr.find(W + 'pStyle')
        if ps is not None:
            nombre = ps.get(W + 'val')
        j = pPr.find(W + 'jc')
        if j is not None:
            estilo.append('text-align:' + {'center': 'center', 'right': 'right', 'both': 'justify'}
                          .get(j.get(W + 'val'), 'left'))
        sh = pPr.find(W + 'shd')
        if sh is not None and sh.get(W + 'fill') not in (None, 'auto'):
            estilo.append('background:#' + sh.get(W + 'fill'))
            estilo.append('padding:3px 10px')
        sp = pPr.find(W + 'spacing')
        if sp is not None:
            antes = int(sp.get(W + 'before') or 0) / 20 * 96 / 72
            desp = int(sp.get(W + 'after') or 0) / 20 * 96 / 72
            estilo.append('margin-top:%.1fpx;margin-bottom:%.1fpx' % (antes, desp))
        ind = pPr.find(W + 'ind')
        if ind is not None:
            if ind.get(W + 'left'):
                estilo.append('margin-left:%.1fpx' % (int(ind.get(W + 'left')) / 20 * 96 / 72))
            if ind.get(W + 'right'):
                estilo.append('margin-right:%.1fpx' % (int(ind.get(W + 'right')) / 20 * 96 / 72))
        bd = pPr.find(W + 'pBdr')
        if bd is not None and bd.find(W + 'left') is not None:
            estilo.append('border-left:3px solid #C07E00;padding-left:9px')
        if pPr.find(W + 'numPr') is not None:
            clases.append('lista')
    cuerpo = runs_html(pel)
    if nombre and nombre.startswith('Heading'):
        n = nombre.replace('Heading', '')
        return '<h%s style="%s">%s</h%s>' % (n, ';'.join(estilo), cuerpo, n)
    if not cuerpo.strip():
        return '<p style="%s">&nbsp;</p>' % ';'.join(estilo)
    return '<p class="%s" style="%s">%s</p>' % (' '.join(clases), ';'.join(estilo), cuerpo)


def tabla_html(tbl):
    grid = tbl.find(W + 'tblGrid')
    anchos = [int(c.get(W + 'w')) for c in grid.findall(W + 'gridCol')] if grid is not None else []
    tot = sum(anchos) or 9026
    filas = []
    for tr in tbl.findall(W + 'tr'):
        celdas = []
        for i, tc in enumerate(tr.findall(W + 'tc')):
            tcPr = tc.find(W + 'tcPr')
            est = []
            span = 1
            if tcPr is not None:
                sh = tcPr.find(W + 'shd')
                if sh is not None and sh.get(W + 'fill') not in (None, 'auto'):
                    est.append('background:#' + sh.get(W + 'fill'))
                gs = tcPr.find(W + 'gridSpan')
                if gs is not None:
                    span = int(gs.get(W + 'val'))
            w = sum(anchos[i:i + span]) if i < len(anchos) else 0
            est.append('width:%.2f%%' % (w / tot * 100))
            cont = ''.join(parrafo_html(pp) for pp in tc.findall(W + 'p'))
            celdas.append('<td colspan="%d" style="%s">%s</td>' % (span, ';'.join(est), cont))
        filas.append('<tr>' + ''.join(celdas) + '</tr>')
    return '<table>' + ''.join(filas) + '</table>'


partes = []
for el in body:
    if el.tag == W + 'p':
        partes.append(parrafo_html(el))
    elif el.tag == W + 'tbl':
        partes.append(tabla_html(el))

HTML = """<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><style>
body{background:#5a5a58;margin:0;padding:24px;font-family:Calibri,'Carlito',sans-serif}
.hoja{background:#fff;width:794px;margin:0 auto 22px;padding:96px;box-shadow:0 2px 14px rgba(0,0,0,.4)}
p{margin:0;font-size:10.5pt;line-height:1.38}
h1{font-size:15pt;color:#12233F;margin:18px 0 9px}
h2{font-size:12.5pt;color:#12233F;margin:15px 0 7px}
h3{font-size:11pt;color:#52514E;margin:12px 0 6px}
table{border-collapse:collapse;width:100%;margin:8px 0 4px;font-size:9pt}
td{border-top:1px solid #D0CFC8;border-bottom:1px solid #D0CFC8;padding:3px 5px;vertical-align:middle}
td p{margin:0;font-size:9pt}
img{display:block;margin:6px auto;max-width:100%}
hr.salto{border:none;border-top:2px dashed #c33;margin:22px 0}
p.lista{margin-left:26px;text-indent:-13px}
p.lista::before{content:'• ';font-weight:700}
</style></head><body><div class="hoja">""" + ''.join(partes) + '</div></body></html>'

open('vista.html', 'w', encoding='utf-8').write(HTML)
print('vista.html: %.0f KB' % (len(HTML.encode()) / 1024))
