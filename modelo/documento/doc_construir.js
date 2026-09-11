/* Ensambla el documento Word del modelo de proyección de matrícula. */
const fs = require('fs');
const path = require('path');
const U = require('./doc_parte1.js');
const C2 = require('./doc_parte2.js');
const C3 = require('./doc_parte3.js');
const C4 = require('./doc_parte4.js');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, PageNumber,
  LevelFormat, BorderStyle, convertInchesToTwip, AZUL, GRIS2, LINEA,
} = U;

const RAIZ = path.resolve(__dirname, '..', '..');
const SALIDA = path.join(RAIZ, 'Modelo_Proyeccion_Matricula.docx');

const hijos = [].concat(
  C2.portada(),
  C2.indice(),
  C2.resumenEjecutivo(),
  C2.encargo(),
  C2.baseHistorica(),
  C2.hallazgos(),
  C3.especificacion(),
  C3.herramientas(),
  C3.escenarios(),
  C4.validacion(),
  C4.manual(),
  C4.programasNuevos(),
  C4.limitaciones(),
  C4.anexos(),
);

const doc = new Document({
  creator: 'Universidad Autónoma del Perú',
  title: 'Modelo de proyección de matrícula semestral',
  description: 'Especificación técnica, sustento econométrico y manual de uso',
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 21, color: '000000' }, paragraph: { spacing: { line: 276 } } },
      heading1: { run: { font: 'Calibri', size: 30, bold: true, color: AZUL } },
      heading2: { run: { font: 'Calibri', size: 25, bold: true, color: AZUL } },
      heading3: { run: { font: 'Calibri', size: 22, bold: true, color: '52514E' } },
    },
  },
  numbering: {
    config: [
      {
        reference: 'vinetas',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 400, hanging: 200 } } },
        }],
      },
      {
        reference: 'numeros',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 440, hanging: 260 } } },
        }],
      },
    ],
  },
  features: { updateFields: true },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1), bottom: convertInchesToTwip(0.9),
          left: convertInchesToTwip(1), right: convertInchesToTwip(1),
        },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINEA, space: 6 } },
          children: [new TextRun({
            text: 'Modelo de proyección de matrícula semestral · Universidad Autónoma del Perú',
            size: 16, color: GRIS2,
          })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRIS2 })],
        })],
      }),
    },
    children: hijos,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(SALIDA, buf);
  console.log('Escrito:', SALIDA);
  console.log('Tamaño: %s KB', (buf.length / 1024).toFixed(0));
  console.log('Elementos de contenido:', hijos.length);
});
