/* Prueba del modelo HTML en navegador real: errores de consola, coherencia de
   los números y capturas para el documento. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARCHIVO = 'file:///home/user/C-Users-Hp-OneDrive-INVERSIONES-GGM-monitor_acciones/modelo_proyeccion_matricula.html';
const CAPT = path.join(__dirname, 'capturas');

(async () => {
  fs.mkdirSync(CAPT, { recursive: true });
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--font-render-hinting=none'] });
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 2 });
  const pag = await ctx.newPage();
  const errores = [], avisos = [];
  pag.on('console', m => { if (m.type() === 'error') errores.push(m.text()); if (m.type() === 'warning') avisos.push(m.text()); });
  pag.on('pageerror', e => errores.push('PAGEERROR: ' + e.message));

  await pag.goto(ARCHIVO, { waitUntil: 'networkidle' });
  await pag.waitForTimeout(900);

  console.log('--- errores de consola:', errores.length);
  errores.slice(0, 12).forEach(e => console.log('   ', e));

  // Coherencia de los números presentados
  const r = await pag.evaluate(() => {
    const P = S.proy;
    const suma = m => { let s = 0; m.forEach(v => s += v); return s; };
    const T0 = P.periodos[0];
    const cen = suma(P.cen.get(T0)), alt = suma(P.alt.get(T0)), baj = suma(P.baj.get(T0));
    // aditividad: el total de un escenario debe ser la suma de sus celdas
    let porSede = 0;
    S.sedes.forEach((_, is) => {
      P.cen.get(T0).forEach((v, k) => { if (+k.split('|')[0] === is) porSede += v; });
    });
    // ingresantes reflejados
    const nuevos = suma(P.nuevos.get(T0));
    let enCiclo1 = 0;
    P.cen.get(T0).forEach((v, k) => { if (+k.split('|')[2] === 1) enCiclo1 += v; });
    return {
      periodos: P.periodos.map(rotuloPeriodo), cen, alt, baj, porSede, nuevos, enCiclo1,
      z: P.z, sigma: P.sigma, conf: P.conf,
      kpis: Array.from(document.querySelectorAll('#kpis .vl')).map(e => e.textContent),
      filasResumen: document.querySelectorAll('#tbResumen tbody tr').length,
      filasDetalle: document.querySelectorAll('#tbDetalle tbody tr').length,
      filasCeldas: document.querySelectorAll('#tbCeldas tbody tr').length,
      svgs: document.querySelectorAll('svg.gr').length,
      carreras: S.carreras.length, sedes: S.sedes.length,
    };
  });
  console.log('\n--- estado ---');
  console.log('  periodos proyectados:', r.periodos.join(', '));
  console.log('  total ' + r.periodos[0] + ': pes %s / mod %s / opt %s', r.baj.toFixed(1), r.cen.toFixed(1), r.alt.toFixed(1));
  console.log('  aditividad por sede: %s (dif %s)', r.porSede.toFixed(6), Math.abs(r.porSede - r.cen).toExponential(2));
  console.log('  ingresantes %s · en ciclo 1 %s', r.nuevos.toFixed(0), r.enCiclo1.toFixed(1));
  console.log('  z=%s sigma=%s conf=%s', r.z.toFixed(4), r.sigma.toFixed(5), r.conf);
  console.log('  KPIs:', r.kpis.join(' | '));
  console.log('  filas resumen/detalle/celdas:', r.filasResumen, r.filasDetalle, r.filasCeldas, '| svg:', r.svgs);

  // Desbordamiento horizontal
  const ancho = await pag.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth }));
  console.log('  scrollWidth %s vs innerWidth %s %s', ancho.doc, ancho.win, ancho.doc > ancho.win + 1 ? '⚠ DESBORDA' : 'OK');

  // Capturas de cada pestaña
  const paginas = [['resumen', 'Resumen'], ['detalle', 'Detalle de la proyección'],
  ['ingresantes', 'Ingresantes'], ['modelo', 'Modelo y validación']];
  for (const [id] of paginas) {
    await pag.evaluate(x => cambiarPagina(x), id);
    await pag.waitForTimeout(700);
    await pag.screenshot({ path: path.join(CAPT, 'pag_' + id + '.png'), fullPage: true });
  }

  // Móvil
  const pag2 = await ctx.newPage();
  await pag2.setViewportSize({ width: 400, height: 860 });
  await pag2.goto(ARCHIVO, { waitUntil: 'networkidle' });
  await pag2.waitForTimeout(800);
  const a2 = await pag2.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth }));
  console.log('  móvil 400px: scrollWidth %s vs %s %s', a2.doc, a2.win, a2.doc > a2.win + 1 ? '⚠ DESBORDA' : 'OK');
  await pag2.screenshot({ path: path.join(CAPT, 'movil.png'), fullPage: false });

  // Modo oscuro
  await pag.evaluate(() => alternarTema());
  await pag.evaluate(() => cambiarPagina('resumen'));
  await pag.waitForTimeout(700);
  await pag.screenshot({ path: path.join(CAPT, 'oscuro.png'), fullPage: false });
  await pag.evaluate(() => alternarTema());

  console.log('\n--- errores finales:', errores.length);
  errores.slice(0, 10).forEach(e => console.log('   ', e));
  await nav.close();
  console.log('Capturas en', CAPT);
})();
