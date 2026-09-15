/*
 * Comprueba la ruta en que el archivo de ingresantes NO declara el ciclo.
 *
 * El modelo debe repartirlos entre los ciclos en que el histórico registra
 * convalidaciones, conservando exactamente el total declarado. Se contrasta
 * contra el mismo archivo con el ciclo declarado: el total de ingresantes ha
 * de coincidir y el reparto por ciclo ha de parecerse al observado.
 */
const { chromium } = require('playwright');
const path = require('path');
const ARCHIVO = 'file://' + path.resolve(__dirname, '..', '..', 'modelo_proyeccion_matricula.html');
const DESC = path.join(__dirname, 'descargas');

async function cargar(pag, archivo) {
  await pag.setInputFiles('#archivo', path.join(DESC, archivo));
  await pag.waitForTimeout(1800);
  return pag.evaluate(() => {
    const P = S.proy;
    const out = { total: 0, porCiclo: {}, avisos: S.entrada.avisos.map(a => a.m) };
    const T = P.periodos[0];
    P.cen.get(T).forEach((v, k) => {
      const z = k.split('|').map(Number);
      if (z[3] === 0) {                       // sólo ingresantes
        out.porCiclo[z[4]] = (out.porCiclo[z[4]] || 0) + v;
        out.total += v;
      }
    });
    return out;
  });
}

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const pag = await (await nav.newContext({ viewport: { width: 1440, height: 980 } })).newPage();
  const err = [];
  pag.on('pageerror', e => err.push(e.message));
  await pag.goto(ARCHIVO, { waitUntil: 'networkidle' });

  const con = await cargar(pag, 'ingresantes_prueba.xlsx');
  const sin = await cargar(pag, 'ingresantes_sin_ciclo.xlsx');

  console.log('--- con ciclo declarado ---');
  console.log('  ingresantes del primer semestre: %s', con.total.toFixed(0));
  console.log('  por ciclo:', JSON.stringify(con.porCiclo));
  console.log('\n--- sin columna Ciclo ---');
  console.log('  ingresantes del primer semestre: %s', sin.total.toFixed(0));
  console.log('  por ciclo:', JSON.stringify(sin.porCiclo));
  const aviso = sin.avisos.find(m => /sin ciclo declarado/.test(m));
  console.log('  aviso:', aviso || '(NINGUNO)');

  const dif = Math.abs(con.total - sin.total);
  const c1 = (sin.porCiclo[1] || 0) / sin.total;
  const nCiclos = Object.keys(sin.porCiclo).length;
  console.log('\n--- comprobaciones ---');
  const pruebas = [
    ['el total de ingresantes se conserva', dif < 1e-6],
    ['aparece el aviso de reparto', !!aviso],
    ['el ciclo 1 concentra entre el 92 % y el 99 %', c1 > 0.92 && c1 < 0.99],
    ['se reparte en más de un ciclo', nCiclos > 1],
    ['sin errores de consola', err.length === 0],
  ];
  pruebas.forEach(([t, ok]) => console.log('  %s  %s', ok ? 'OK  ' : 'FALLA', t));
  console.log('\n  ciclo 1 = %s %%   ciclos distintos = %d', (100 * c1).toFixed(2), nCiclos);
  if (err.length) console.log('  errores:', err);
  await nav.close();
  process.exit(pruebas.every(p => p[1]) ? 0 : 1);
})();
