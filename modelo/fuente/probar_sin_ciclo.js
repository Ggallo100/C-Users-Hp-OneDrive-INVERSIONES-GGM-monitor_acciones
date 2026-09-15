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

async function cargar(pag, archivo, carrera) {
  await pag.setInputFiles('#archivo', path.join(DESC, archivo));
  await pag.waitForTimeout(1800);
  return pag.evaluate((nom) => {
    const P = S.proy;
    const ic = nom ? S.iC.get(nom) : null;
    const out = { total: 0, porCiclo: {}, porSemestre: {},
      avisos: S.entrada.avisos.map(a => a.m) };
    P.periodos.forEach((T, i) => {
      const m = {};
      P.cen.get(T).forEach((v, k) => {
        const z = k.split('|').map(Number);
        if (z[3] !== 0) return;               // sólo ingresantes
        if (ic !== null && z[1] !== ic) return;
        m[z[4]] = (m[z[4]] || 0) + v;
        if (i === 0) {
          out.porCiclo[z[4]] = (out.porCiclo[z[4]] || 0) + v;
          out.total += v;
        }
      });
      out.porSemestre[rotuloPeriodo(T)] = m;
    });
    return out;
  }, carrera || null);
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

  /* Programa NUEVO sin ciclo declarado: en su semestre de apertura sólo
     existe el ciclo 1, así que todos sus ingresantes tienen que caer ahí. */
  const pn = await cargar(pag, 'ingresantes_programa_nuevo.xlsx', 'INTELIGENCIA ARTIFICIAL');
  const sems = Object.keys(pn.porSemestre);
  console.log('\n--- programa nuevo sin ciclo declarado (INTELIGENCIA ARTIFICIAL) ---');
  sems.slice(0, 4).forEach(t => console.log('  ' + t.padEnd(9) + ' %s',
    JSON.stringify(Object.fromEntries(Object.entries(pn.porSemestre[t])
      .map(([c, v]) => [c, +v.toFixed(1)])))));
  const ciclosApertura = Object.keys(pn.porSemestre[sems[0]]);
  const ciclosSegundo = Object.keys(pn.porSemestre[sems[1]]);

  const dif = Math.abs(con.total - sin.total);
  const c1 = (sin.porCiclo[1] || 0) / sin.total;
  const nCiclos = Object.keys(sin.porCiclo).length;
  console.log('\n--- comprobaciones ---');
  const pruebas = [
    ['el total de ingresantes se conserva', dif < 1e-6],
    ['aparece el aviso de reparto', !!aviso],
    ['el ciclo 1 concentra entre el 92 % y el 99 %', c1 > 0.92 && c1 < 0.99],
    ['se reparte en más de un ciclo', nCiclos > 1],
    ['el programa nuevo sólo ocupa el ciclo 1 al abrir',
      ciclosApertura.length === 1 && ciclosApertura[0] === '1'],
    ['y despliega un ciclo más al semestre siguiente',
      ciclosSegundo.length === 2],
    ['sin errores de consola', err.length === 0],
  ];
  pruebas.forEach(([t, ok]) => console.log('  %s  %s', ok ? 'OK  ' : 'FALLA', t));
  console.log('\n  ciclo 1 = %s %%   ciclos distintos = %d', (100 * c1).toFixed(2), nCiclos);
  if (err.length) console.log('  errores:', err);
  await nav.close();
  process.exit(pruebas.every(p => p[1]) ? 0 : 1);
})();
