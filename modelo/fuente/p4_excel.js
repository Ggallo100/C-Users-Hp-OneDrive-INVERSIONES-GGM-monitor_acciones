/* ==========================================================================
   LECTURA DE .XLSX Y .CSV
   El lector reproduce el del Tablero de Matrícula v1.9, ya endurecido contra
   las celdas vacías autocerradas que escribe Excel.
   ========================================================================== */

function leerCSV(texto) {
  const sep = (texto.split('\n')[0].match(/;/g) || []).length >=
    (texto.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const filas = [];
  let fila = [], campo = '', enComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (enComillas) {
      if (ch === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else enComillas = false; }
      else campo += ch;
    } else if (ch === '"') enComillas = true;
    else if (ch === sep) { fila.push(campo); campo = ''; }
    else if (ch === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (ch !== '\r') campo += ch;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  if (!filas.length) throw new Error('El archivo CSV está vacío');
  return { cabecera: filas[0], filas: filas.slice(1).filter(f => f.some(v => String(v).trim() !== '')) };
}

/** Lector mínimo de .xlsx: descomprime el zip y lee la primera hoja. */
async function leerXLSX(buffer) {
  const archivos = await descomprimirZip(new Uint8Array(buffer));
  const dec = new TextDecoder('utf-8');
  const nombreHoja = Object.keys(archivos)
    .filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  if (!nombreHoja) throw new Error('El archivo no parece un Excel válido');

  let compartidas = [];
  if (archivos['xl/sharedStrings.xml']) {
    const xml = dec.decode(archivos['xl/sharedStrings.xml']);
    compartidas = Array.from(xml.matchAll(/<si>([\s\S]*?)<\/si>/g)).map(m =>
      Array.from(m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map(t => desescapaXml(t[1])).join(''));
  }

  const hoja = dec.decode(archivos[nombreHoja]);
  const filas = [];
  /* Una celda vacía con formato la escribe Excel autocerrada: <c r="N5" s="1"/>.
     La alternativa autocerrada debe probarse ANTES de abrir cuerpo, o el cuerpo
     se estira hasta el </c> de la celda siguiente y los valores se desplazan. */
  const RE_FILA = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
  const RE_CELDA = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  for (const mf of hoja.matchAll(RE_FILA)) {
    const celdas = [];
    for (const mc of (mf[2] || '').matchAll(RE_CELDA)) {
      const attr = mc[1] || '', cuerpo = mc[2] || '';
      const ref = /r="([A-Z]+)\d+"/.exec(attr);
      const col = ref ? letrasACol(ref[1]) : celdas.length;
      const tipo = /t="([^"]+)"/.exec(attr);
      let valor = '';
      if (tipo && tipo[1] === 'inlineStr') {
        valor = Array.from(cuerpo.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g))
          .map(t => desescapaXml(t[1])).join('');
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(cuerpo);
        valor = v ? desescapaXml(v[1]) : '';
        /* Una cadena compartida puede ser legítimamente «0» o vacía: se
           comprueba que el índice exista en lugar de usar `|| ''`. */
        if (tipo && tipo[1] === 's') {
          const c = compartidas[+valor];
          valor = c === undefined ? '' : c;
        }
      }
      celdas[col] = valor;
    }
    for (let i = 0; i < celdas.length; i++) if (celdas[i] === undefined) celdas[i] = '';
    filas.push(celdas);
  }
  if (filas.length < 2) throw new Error('La hoja no contiene datos');
  return { cabecera: filas[0], filas: filas.slice(1).filter(f => f.some(v => String(v).trim() !== '')) };
}

function letrasACol(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
  return n - 1;
}
function desescapaXml(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&');
}

/** Descompresor ZIP mínimo (métodos 0 y 8) usando DecompressionStream. */
async function descomprimirZip(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let fin = -1;
  for (let i = u8.length - 22; i >= 0 && i > u8.length - 66000; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error('No se encontró el índice del archivo comprimido');
  const nEntradas = dv.getUint16(fin + 10, true);
  let p = dv.getUint32(fin + 16, true);
  const salida = {};
  for (let e = 0; e < nEntradas; e++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const metodo = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nomLen = dv.getUint16(p + 28, true);
    const extLen = dv.getUint16(p + 30, true);
    const comLen = dv.getUint16(p + 32, true);
    const desplaza = dv.getUint32(p + 42, true);
    const nombre = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nomLen));
    p += 46 + nomLen + extLen + comLen;
    if (!/^xl\/(worksheets\/sheet\d+|sharedStrings|workbook)\.xml$/.test(nombre)) continue;
    const lNom = dv.getUint16(desplaza + 26, true);
    const lExt = dv.getUint16(desplaza + 28, true);
    const ini = desplaza + 30 + lNom + lExt;
    const crudo = u8.subarray(ini, ini + compSize);
    salida[nombre] = metodo === 0 ? crudo : await inflar(crudo);
  }
  return salida;
}

async function inflar(datos) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Este navegador no puede descomprimir .xlsx; usa CSV o actualiza el navegador');
  }
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([datos]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/* ==========================================================================
   ESCRITURA DE .XLSX
   ========================================================================== */
const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = TABLA_CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/** Empaquetado ZIP por el método «almacenado»: sin dependencias externas. */
function crearZip(archivos) {
  const partes = [], central = [];
  let desplaza = 0;
  const cod = new TextEncoder();
  for (const a of archivos) {
    const nombre = cod.encode(a.nombre);
    const crc = crc32(a.datos);
    const lh = new Uint8Array(30 + nombre.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true);
    dv.setUint16(8, 0, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, a.datos.length, true);
    dv.setUint32(22, a.datos.length, true);
    dv.setUint16(26, nombre.length, true);
    lh.set(nombre, 30);
    partes.push(lh, a.datos);

    const cd = new Uint8Array(46 + nombre.length);
    const dc = new DataView(cd.buffer);
    dc.setUint32(0, 0x02014b50, true);
    dc.setUint16(4, 20, true); dc.setUint16(6, 20, true);
    dc.setUint16(8, 0x0800, true); dc.setUint16(10, 0, true);
    dc.setUint32(16, crc, true);
    dc.setUint32(20, a.datos.length, true);
    dc.setUint32(24, a.datos.length, true);
    dc.setUint16(28, nombre.length, true);
    dc.setUint32(42, desplaza, true);
    cd.set(nombre, 46);
    central.push(cd);
    desplaza += lh.length + a.datos.length;
  }
  const tamCentral = central.reduce((s, c) => s + c.length, 0);
  const fin = new Uint8Array(22);
  const df = new DataView(fin.buffer);
  df.setUint32(0, 0x06054b50, true);
  df.setUint16(8, archivos.length, true);
  df.setUint16(10, archivos.length, true);
  df.setUint32(12, tamCentral, true);
  df.setUint32(16, desplaza, true);
  return new Blob(partes.concat(central, [fin]), {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

function escXml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    /* Los caracteres de control rompen el XML de Excel sin aviso. */
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}
function colLetra(n) {
  let s = '';
  n += 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; }
  return s;
}

/**
 * Construye un .xlsx con varias hojas.
 * hojas: [{nombre, filas:[[celda,...],...], anchos:[n,...], titulo?}]
 * Cada celda puede ser un número, una cadena, o {v, e} donde `e` es el estilo
 * (0 normal, 1 cabecera, 2 entero, 3 dos decimales, 4 porcentaje, 5 título).
 */
function construirXlsx(hojas) {
  const cod = new TextEncoder();
  const txt = s => ({ datos: cod.encode(s) });
  const arch = [];

  const estilos =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="3">' +
    '<numFmt numFmtId="164" formatCode="#,##0"/>' +
    '<numFmt numFmtId="165" formatCode="#,##0.00"/>' +
    '<numFmt numFmtId="166" formatCode="0.0%"/>' +
    '</numFmts>' +
    '<fonts count="4">' +
    '<font><sz val="10"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="13"/><color rgb="FF12233F"/><name val="Calibri"/></font>' +
    '<font><i/><sz val="9"/><color rgb="FF898781"/><name val="Calibri"/></font>' +
    '</fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF12233F"/><bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left/><right/><top/><bottom style="thin"><color rgb="FFD0CFC8"/></bottom><diagonal/></border>' +
    '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="6">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  arch.push(Object.assign({ nombre: '[Content_Types].xml' }, txt(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    hojas.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) +
      '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') +
    '</Types>')));

  arch.push(Object.assign({ nombre: '_rels/.rels' }, txt(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>')));

  arch.push(Object.assign({ nombre: 'xl/workbook.xml' }, txt(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"' +
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    hojas.map((h, i) => '<sheet name="' + escXml(h.nombre.slice(0, 31)) +
      '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') +
    '</sheets></workbook>')));

  arch.push(Object.assign({ nombre: 'xl/_rels/workbook.xml.rels' }, txt(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    hojas.map((_, i) => '<Relationship Id="rId' + (i + 1) +
      '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"' +
      ' Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') +
    '<Relationship Id="rId' + (hojas.length + 1) +
    '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>')));

  arch.push(Object.assign({ nombre: 'xl/styles.xml' }, txt(estilos)));

  hojas.forEach((h, ih) => {
    const partes = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'];
    /* La vista (con el panel inmovilizado) va ANTES de <cols> y <sheetData>:
       Excel rechaza el archivo si los elementos van desordenados. */
    if (h.inmovilizar) {
      partes.push('<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + h.inmovilizar +
        '" topLeftCell="A' + (h.inmovilizar + 1) +
        '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>');
    }
    if (h.anchos && h.anchos.length) {
      partes.push('<cols>' + h.anchos.map((w, i) =>
        '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>');
    }
    partes.push('<sheetData>');
    h.filas.forEach((fila, ir) => {
      if (!fila) return;
      const celdas = [];
      fila.forEach((c, ic) => {
        if (c === null || c === undefined || c === '') return;
        const obj = (typeof c === 'object' && c !== null && 'v' in c) ? c : { v: c, e: 0 };
        let v = obj.v, e = obj.e || 0;
        const ref = colLetra(ic) + (ir + 1);
        const sAttr = e ? ' s="' + e + '"' : '';
        if (typeof v === 'number' && isFinite(v)) {
          celdas.push('<c r="' + ref + '"' + sAttr + '><v>' + v + '</v></c>');
        } else {
          celdas.push('<c r="' + ref + '"' + sAttr + ' t="inlineStr"><is><t xml:space="preserve">' +
            escXml(v) + '</t></is></c>');
        }
      });
      if (celdas.length) partes.push('<row r="' + (ir + 1) + '">' + celdas.join('') + '</row>');
    });
    partes.push('</sheetData></worksheet>');
    arch.push(Object.assign({ nombre: 'xl/worksheets/sheet' + (ih + 1) + '.xml' }, txt(partes.join(''))));
  });

  return crearZip(arch);
}
