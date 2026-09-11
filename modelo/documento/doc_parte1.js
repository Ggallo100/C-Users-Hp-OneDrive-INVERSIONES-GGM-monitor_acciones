/* Documento Word del modelo de proyección de matrícula — utilidades y estilo. */
const fs = require('fs');
const path = require('path');
const D = require('docx');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, ImageRun,
  TableOfContents, Header, Footer, PageNumber, LevelFormat, convertInchesToTwip,
  VerticalAlign, PositionalTab, PositionalTabAlignment, PositionalTabLeader,
} = D;

const CAPT = path.join(__dirname, 'capturas');

/* Paleta institucional, legible también impresa en escala de grises. */
const AZUL = '12233F';
const AMBAR = 'C07E00';
const GRIS = '52514E';
const GRIS2 = '898781';
const FONDO = 'F2F1ED';
const LINEA = 'D0CFC8';

/* ---- ancho útil de la página A4 con márgenes de 1 pulgada ---- */
const ANCHO_TABLA = 9026;   // DXA

const p = (texto, o) => {
  o = o || {};
  return new Paragraph({
    alignment: o.al,
    spacing: { before: o.antes != null ? o.antes : 0, after: o.despues != null ? o.despues : 120, line: o.linea || 276 },
    indent: o.sangria,
    border: o.borde,
    shading: o.fondo ? { type: ShadingType.CLEAR, fill: o.fondo } : undefined,
    children: (Array.isArray(texto) ? texto : [texto]).map(t =>
      typeof t === 'string'
        ? new TextRun({ text: t, size: o.tam || 21, color: o.color || '000000', font: o.fuente })
        : t),
  });
};

const neg = (t, o) => new TextRun(Object.assign({ text: t, bold: true, size: 21 }, o || {}));
const txt = (t, o) => new TextRun(Object.assign({ text: t, size: 21 }, o || {}));
const cur = (t, o) => new TextRun(Object.assign({ text: t, italics: true, size: 21 }, o || {}));
const mono = (t, o) => new TextRun(Object.assign({ text: t, font: 'Consolas', size: 19 }, o || {}));

const h1 = t => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 180 },
  children: [new TextRun({ text: t, bold: true, size: 30, color: AZUL })],
});
const h2 = t => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 140 },
  children: [new TextRun({ text: t, bold: true, size: 25, color: AZUL })],
});
const h3 = t => new Paragraph({
  heading: HeadingLevel.HEADING_3, spacing: { before: 240, after: 120 },
  children: [new TextRun({ text: t, bold: true, size: 22, color: GRIS })],
});

/** Bloque monoespaciado sobre fondo tenue: ecuaciones y fórmulas. */
const formula = lineas => (Array.isArray(lineas) ? lineas : [lineas]).map((l, i, a) =>
  new Paragraph({
    spacing: { before: i === 0 ? 140 : 0, after: i === a.length - 1 ? 160 : 0, line: 260 },
    shading: { type: ShadingType.CLEAR, fill: FONDO },
    indent: { left: 200, right: 200 },
    children: [new TextRun({ text: l || ' ', font: 'Consolas', size: 18 })],
  }));

/** Párrafo destacado con filete lateral. */
const nota = (etiqueta, texto) => new Paragraph({
  spacing: { before: 160, after: 180, line: 276 },
  shading: { type: ShadingType.CLEAR, fill: FONDO },
  indent: { left: 160, right: 160 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: AMBAR, space: 8 } },
  children: [new TextRun({ text: etiqueta + ' ', bold: true, size: 21 }),
  new TextRun({ text: texto, size: 21 })],
});

const vinetas = items => items.map(t => new Paragraph({
  numbering: { reference: 'vinetas', level: 0 },
  spacing: { after: 90, line: 276 },
  children: (Array.isArray(t) ? t : [txt(t)]),
}));

const numerada = items => items.map(t => new Paragraph({
  numbering: { reference: 'numeros', level: 0 },
  spacing: { after: 90, line: 276 },
  children: (Array.isArray(t) ? t : [txt(t)]),
}));

/* ---- tablas ---- */
const SIN_BORDE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const borde = (pos, color, size) => ({ style: BorderStyle.SINGLE, size: size || 4, color: color || LINEA });

function celda(contenido, o) {
  o = o || {};
  const hijos = (Array.isArray(contenido) ? contenido : [contenido]).map(c =>
    typeof c === 'string'
      ? new Paragraph({
        alignment: o.al || AlignmentType.LEFT,
        spacing: { before: 40, after: 40, line: 240 },
        children: [new TextRun({
          text: c, size: o.tam || 18, bold: o.negrita,
          color: o.color || (o.cabecera ? 'FFFFFF' : '000000'),
          font: o.mono ? 'Consolas' : undefined,
        })],
      })
      : c);
  return new TableCell({
    width: { size: o.ancho, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: o.fondo || (o.cabecera ? AZUL : 'FFFFFF') },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: o.span,
    borders: {
      top: o.cabecera ? SIN_BORDE : borde('top'),
      bottom: o.cabecera ? SIN_BORDE : borde('bottom'),
      left: SIN_BORDE, right: SIN_BORDE,
    },
    children: hijos,
  });
}

/**
 * Tabla de datos. `anchos` en DXA debe sumar ANCHO_TABLA.
 * `filas[0]` es la cabecera; `alineaciones` indica por columna.
 */
function tabla(anchos, cabecera, filas, o) {
  o = o || {};
  const al = o.al || anchos.map((_, i) => i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT);
  const cuerpo = [
    new TableRow({
      tableHeader: true,
      children: cabecera.map((c, i) => celda(String(c), {
        ancho: anchos[i], cabecera: true, negrita: true,
        al: o.alCab ? o.alCab[i] : al[i], tam: o.tam || 17,
      })),
    }),
  ];
  filas.forEach((f, ir) => {
    if (f.__sub) {
      cuerpo.push(new TableRow({
        children: [celda(f.__sub, {
          ancho: ANCHO_TABLA, span: anchos.length, fondo: FONDO,
          negrita: true, tam: o.tam || 18,
        })],
      }));
      return;
    }
    cuerpo.push(new TableRow({
      children: f.map((c, i) => celda(c == null ? '' : String(c), {
        ancho: anchos[i], al: al[i], tam: o.tam || 18,
        fondo: ir % 2 === 1 ? 'FBFBF9' : 'FFFFFF',
        negrita: o.negritaFila && o.negritaFila(f, ir),
        mono: o.mono && o.mono.indexOf(i) >= 0,
      })),
    }));
  });
  return new Table({
    columnWidths: anchos,
    width: { size: ANCHO_TABLA, type: WidthType.DXA },
    rows: cuerpo,
  });
}

/* ---- imágenes ---- */
function dimPng(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/**
 * Inserta una captura escalada al ancho útil, con su pie numerado.
 * `maxAlto` recorta la altura para que la figura no desborde la página.
 */
let nFig = 0;
function figura(archivo, pie, o) {
  o = o || {};
  const buf = fs.readFileSync(path.join(CAPT, archivo));
  const d = dimPng(buf);
  const anchoMax = o.ancho || 600;
  let w = anchoMax, h = Math.round(d.h * anchoMax / d.w);
  const altoMax = o.maxAlto || 700;
  if (h > altoMax) { h = altoMax; w = Math.round(d.w * altoMax / d.h); }
  nFig++;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 60 },
      children: [new ImageRun({ data: buf, type: 'png', transformation: { width: w, height: h } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
      children: [
        new TextRun({ text: 'Figura ' + nFig + '. ', bold: true, size: 17, color: GRIS }),
        new TextRun({ text: pie, size: 17, color: GRIS }),
      ],
    }),
  ];
}

let nTab = 0;
function pieTabla(t) {
  nTab++;
  return new Paragraph({
    spacing: { before: 80, after: 220 },
    children: [
      new TextRun({ text: 'Tabla ' + nTab + '. ', bold: true, size: 17, color: GRIS }),
      new TextRun({ text: t, size: 17, color: GRIS }),
    ],
  });
}

const salto = () => new Paragraph({ children: [new PageBreak()] });

module.exports = {
  D, Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, ImageRun,
  TableOfContents, Header, Footer, PageNumber, LevelFormat, convertInchesToTwip,
  PositionalTab, PositionalTabAlignment, PositionalTabLeader,
  AZUL, AMBAR, GRIS, GRIS2, FONDO, LINEA, ANCHO_TABLA,
  p, neg, txt, cur, mono, h1, h2, h3, formula, nota, vinetas, numerada,
  tabla, celda, figura, pieTabla, salto,
  reiniciarContadores: () => { nFig = 0; nTab = 0; },
};
