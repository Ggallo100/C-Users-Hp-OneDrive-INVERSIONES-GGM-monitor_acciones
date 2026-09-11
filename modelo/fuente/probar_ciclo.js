/* Prueba de extremo a extremo: plantilla -> edición -> carga -> exportación. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARCHIVO = 'file://' + path.resolve(__dirname, '..', '..', 'modelo_proyeccion_matricula.html');
const TMP = path.join(__dirname, 'descargas');

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 980 }, acceptDownloads: true });
  const pag = await ctx.newPage();
  const errores = [];
  pag.on('pageerror', e => errores.push('PAGEERROR: ' + e.message));
  pag.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  await pag.goto(ARCHIVO, { waitUntil: 'networkidle' });
  await pag.waitForTimeout(700);

  // 1. Plantilla
  const d1 = await Promise.all([
    pag.waitForEvent('download'),
    pag.click('text=Plantilla'),
  ]);
  const plantilla = path.join(TMP, 'plantilla.xlsx');
  await d1[0].saveAs(plantilla);
  console.log('1. Plantilla descargada:', (fs.statSync(plantilla).size / 1024).toFixed(1), 'KB');

  // 2. Carga del archivo de prueba (generado aparte con openpyxl)
  const entrada = path.join(TMP, 'ingresantes_prueba.xlsx');
  if (!fs.existsSync(entrada)) { console.log('   falta', entrada); await nav.close(); return; }
  await pag.setInputFiles('#archivo', entrada);
  await pag.waitForTimeout(1600);

  const r = await pag.evaluate(() => {
    const P = S.proy, suma = m => { let s = 0; m.forEach(v => s += v); return s; };
    const porPer = P.periodos.map(T => ({
      p: rotuloPeriodo(T), cen: suma(P.cen.get(T)), nuevos: suma(P.nuevos.get(T) || new Map()),
    }));
    // el programa nuevo debe aparecer con matrícula
    let ia = 0;
    const icIA = S.iC.get('INTELIGENCIA ARTIFICIAL');
    P.cen.forEach(m => m.forEach((v, k) => { if (+k.split('|')[1] === icIA) ia += v; }));
    const imAD = S.D.modalidades.indexOf('A distancia');
    const repartoIA = icIA != null ? mezclaNuevos(S.E, S.iS.get('Lima Sur'), icIA, imAD, 1, 1) : null;
    // composición por modalidad de cada semestre proyectado
    const porMod = P.periodos.map(T => {
      const o = { p: rotuloPeriodo(T) };
      S.D.modalidades.forEach((m, im) => { o[m] = 0; });
      P.cen.get(T).forEach((v, k) => { const z = k.split('|'); o[S.D.modalidades[+z[2]]] += v; });
      return o;
    });
    return {
      archivo: S.entrada && S.entrada.nombre, filas: S.entrada && S.entrada.filas.length,
      periodos: S.entrada && S.entrada.periodos.map(rotuloPeriodo),
      nuevas: Array.from(S.carrerasNuevas), avisos: S.entrada.avisos.map(a => a.t + ': ' + a.m),
      porPer, porMod, ia, repartoIA: repartoIA && { mz: repartoIA[0], nivel: repartoIA[2] },
      conModalidad: S.entrada.conModalidad, declaradas: S.entrada.declaradas,
      estimadas: S.entrada.estimadas,
      planIA: icIA != null ? S.planPorIc[icIA] : null,
      horizonte: +document.querySelector('#horizonte').value,
    };
  });
  console.log('\n2. Carga del archivo');
  console.log('   archivo:', r.archivo, '| filas:', r.filas, '| horizonte ajustado a', r.horizonte);
  console.log('   semestres:', r.periodos.join(', '));
  console.log('   programas nuevos:', r.nuevas.join(', ') || '(ninguno)', '| ciclos plan IA:', r.planIA);
  r.avisos.forEach(a => console.log('   aviso ->', a));
  console.log('   reparto de turno de IA:', r.repartoIA && r.repartoIA.mz.map(x => (x * 100).toFixed(1) + '%').join(' / '),
    '| nivel:', r.repartoIA && r.repartoIA.nivel);
  console.log('   matrícula total de INTELIGENCIA ARTIFICIAL en el horizonte:', r.ia.toFixed(1));
  console.log('   modalidad declarada: %s (%s declaradas / %s estimadas)',
    r.conModalidad ? 'sí' : 'no', r.declaradas, r.estimadas);
  console.log('   por semestre:');
  r.porPer.forEach(x => console.log('     %s  total %s  (ingresantes %s)', x.p, x.cen.toFixed(0), x.nuevos.toFixed(0)));
  console.log('   composición por modalidad:');
  r.porMod.forEach(x => console.log('     %s  ' + Object.keys(x).filter(k => k !== 'p')
    .map(k => k + ' ' + x[k].toFixed(0)).join('  '), x.p));

  // 3. Exportación
  const d2 = await Promise.all([
    pag.waitForEvent('download'),
    pag.click('#btExportar'),
  ]);
  const salida = path.join(TMP, 'proyeccion.xlsx');
  await d2[0].saveAs(salida);
  console.log('\n3. Exportación:', (fs.statSync(salida).size / 1024).toFixed(1), 'KB');

  await pag.screenshot({ path: path.join(__dirname, 'capturas', 'con_archivo.png'), fullPage: true });
  await pag.evaluate(() => cambiarPagina('ingresantes'));
  await pag.waitForTimeout(600);
  await pag.screenshot({ path: path.join(__dirname, 'capturas', 'pag_ingresantes.png'), fullPage: true });
  await pag.evaluate(() => cambiarPagina('detalle'));
  await pag.waitForTimeout(600);
  await pag.screenshot({ path: path.join(__dirname, 'capturas', 'pag_detalle.png'), fullPage: true });

  console.log('\nerrores:', errores.length);
  errores.slice(0, 8).forEach(e => console.log('  ', e));
  await nav.close();
})();
