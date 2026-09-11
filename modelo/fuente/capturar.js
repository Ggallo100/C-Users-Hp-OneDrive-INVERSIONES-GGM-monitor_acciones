/* Capturas limpias, por sección, para el documento Word. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const ARCHIVO = 'file://' + REPO + '/modelo_proyeccion_matricula.html';
const CAPT = path.join(REPO, 'modelo', 'documento', 'capturas');
const ENTRADA = path.join(__dirname, 'descargas', 'ingresantes_prueba.xlsx');
const SIN_MOD = path.join(__dirname, 'descargas', 'ingresantes_sin_modalidad.xlsx');

(async () => {
  fs.mkdirSync(CAPT, { recursive: true });
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await nav.newContext({ viewport: { width: 1380, height: 900 }, deviceScaleFactor: 2, acceptDownloads: true });
  const pag = await ctx.newPage();
  const errores = [];
  pag.on('pageerror', e => errores.push(e.message));
  await pag.goto(ARCHIVO, { waitUntil: 'networkidle' });
  await pag.waitForTimeout(700);

  // Guarda la plantilla en el repositorio
  const d = await Promise.all([pag.waitForEvent('download'), pag.click('text=Plantilla')]);
  await d[0].saveAs(path.join(REPO, 'plantilla_ingresantes.xlsx'));
  console.log('plantilla_ingresantes.xlsx guardada en el repositorio');

  // Carga el archivo de ingresantes de prueba
  await pag.setInputFiles('#archivo', ENTRADA);
  await pag.waitForTimeout(4200);   // el aviso emergente dura 3,6 s

  const tomar = async (nombre, selector, opts) => {
    opts = opts || {};
    if (opts.pagina) { await pag.evaluate(x => cambiarPagina(x), opts.pagina); await pag.waitForTimeout(650); }
    if (opts.antes) { await pag.evaluate(opts.antes); await pag.waitForTimeout(450); }
    const el = selector ? await pag.$(selector) : null;
    const ruta = path.join(CAPT, nombre + '.png');
    if (el) await el.screenshot({ path: ruta });
    else await pag.screenshot({ path: ruta, fullPage: !!opts.completa });
    const st = fs.statSync(ruta);
    console.log('  %s  %s KB', nombre.padEnd(28), (st.size / 1024).toFixed(0));
  };

  console.log('\nCapturas:');
  // 1. Cabecera y controles
  await tomar('01_cabecera', null, { pagina: 'resumen' });
  // 2. Indicadores
  await tomar('02_kpis', '#kpis');
  // 3. Serie con banda
  await tomar('03_serie', '#tjSerie');
  // 4. Composición y sede
  await tomar('04_composicion', '#tjComposicion');
  // 5. Tabla resumen
  await tomar('04b_modalidad_serie', '#tjModalidadSerie');
  await tomar('05_tabla_resumen', '#tjResumen');
  // 6. Detalle: filtros y cruce
  await tomar('06_detalle_filtros', '#tjFiltros', { pagina: 'detalle' });
  await tomar('07_detalle_cruce', '#tjCruce');
  await tomar('08_detalle_celdas', '#tjCeldas');
  // 9. Ingresantes
  await tomar('09_ingresantes_estado', '#tjArchivo', { pagina: 'ingresantes' });
  await tomar('10_ingresantes_turno', '#tjTurnoNuevos');
  // 11. Modelo
  await tomar('11_ecuacion', '#tjEcuacion', { pagina: 'modelo' });
  await tomar('11a_modalidad', '#tjModalidadModelo');
  await tomar('11b_maduracion', '#tjMaduracion');
  await tomar('12_continuacion', '#tjContinuacion');
  await tomar('13_turno_periodo', '#tjTurnoPeriodo');
  await tomar('14_incertidumbre', '#tjIncertidumbre');
  await tomar('15_validacion', '#tjValidacion');
  await tomar('16_lambda', '#tjLambda');
  // 17. Modo oscuro
  await tomar('17_oscuro', null, { pagina: 'resumen', antes: () => { alternarTema(); cambiarPagina('resumen'); } });
  await pag.evaluate(() => alternarTema());
  // 18. Escenario pesimista en el detalle
  await tomar('18_escenario_pesimista', '#tjCruce', {
    pagina: 'detalle',
    antes: () => { document.querySelector('#escenarioVista').value = 'baj'; pintarDetalle(); },
  });

  // 19. Reparto estimado de modalidad: sólo aparece con un archivo que no la declare
  await pag.setInputFiles('#archivo', SIN_MOD);
  await pag.waitForTimeout(4200);
  await tomar('09b_modalidad_nuevos', '#tjModalidadNuevos', { pagina: 'ingresantes' });

  console.log('\nerrores:', errores.length);
  errores.forEach(e => console.log('  ', e));
  await nav.close();
})();
