/* Comprueba los casos límite que documenta el capítulo 10 del Word. */
const { chromium } = require('playwright');
const path = require('path');
const ARCHIVO = 'file://' + path.resolve(__dirname, '..', '..', 'modelo_proyeccion_matricula.html');

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const pag = await (await nav.newContext({ viewport: { width: 1440, height: 980 } })).newPage();
  const err = [];
  pag.on('pageerror', e => err.push(e.message));
  await pag.goto(ARCHIVO, { waitUntil: 'networkidle' });
  await pag.setInputFiles('#archivo', path.join(__dirname, 'descargas', 'ingresantes_prueba.xlsx'));
  await pag.waitForTimeout(1800);

  const r = await pag.evaluate(() => {
    const P = S.proy, D = S.D;
    const isE = S.iS.get('Lima Este'), icIA = S.iC.get('INTELIGENCIA ARTIFICIAL');
    const salida = { avisosEste: [], porCicloEste: {}, iaPorModa: {}, iaNivel: {}, apertura: {} };
    salida.avisosEste = S.entrada.avisos.map(a => a.m);
    salida.recortes = (S.entrada.recortes || []).map(x => JSON.stringify(x));
    salida.apertura = S.aperturaPorIs && S.aperturaPorIs[isE];
    P.periodos.forEach(T => {
      const m = {}; const ia = {};
      P.cen.get(T).forEach((v, k) => {
        const z = k.split('|').map(Number);
        if (z[0] === isE) m[z[3]] = (m[z[3]] || 0) + v;
        if (z[1] === icIA) ia[D.modalidades[z[2]]] = (ia[D.modalidades[z[2]]] || 0) + v;
      });
      salida.porCicloEste[rotuloPeriodo(T)] = m;
      salida.iaPorModa[rotuloPeriodo(T)] = ia;
    });
    ['A distancia', 'Presencial', 'Semi Presencial'].forEach(mm => {
      const im = D.modalidades.indexOf(mm);
      const q = mezclaNuevos(S.E, S.iS.get('Lima Sur'), icIA, im, 1, 1);
      salida.iaNivel[mm] = { nivel: q[2], mezcla: q[0].map(x => +(x * 100).toFixed(1)) };
    });
    return salida;
  });
  console.log('--- SEDE NUEVA: Lima Este ---');
  console.log('apertura detectada:', JSON.stringify(r.apertura));
  r.avisosEste.forEach(a => console.log('  aviso:', a));
  Object.entries(r.porCicloEste).forEach(([T, m]) => console.log('  %s  ciclos:', T, m));
  console.log('\n--- PROGRAMA NUEVO: INTELIGENCIA ARTIFICIAL ---');
  Object.entries(r.iaPorModa).forEach(([T, m]) => console.log('  %s  %s', T,
    Object.entries(m).map(([k, v]) => k + ' ' + v.toFixed(1)).join('   ')));
  console.log('  reparto de turno estimado (Diurno / Mañana / Noche / Tarde):');
  Object.entries(r.iaNivel).forEach(([m, o]) => console.log('    %s  %s  nivel: %s',
    m.padEnd(17), o.mezcla.map(x => x.toFixed(1) + ' %').join(' / '), o.nivel));
  console.log('\nerrores:', err.length); err.forEach(e => console.log('  ', e));
  await nav.close();
})();
