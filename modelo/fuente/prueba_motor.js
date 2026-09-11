/*
 * Verificación de paridad entre el motor JavaScript del HTML y la
 * implementación de referencia en Python.
 *
 * Ejecutar primero `python3 ../paridad.py`, que reagrega `compacto.json` con
 * los mismos hiperparámetros y escribe `../paridad_py.json`. Este script
 * repite el ejercicio en JavaScript y compara.
 *
 * El estado es (sede, carrera, modalidad, ciclo, turno); la clave del mapa de
 * stock es 'is|ic|im|ciclo|it'. Cualquier divergencia en ese formato aparece
 * aquí como celdas a cero, no como una diferencia pequeña.
 */
const fs = require('fs');
const path = require('path');

// El motor toca el DOM sólo en brindis/descargar/alternarTema; se neutralizan.
global.document = {
  querySelector: () => ({ classList: { toggle() { }, add() { }, remove() { } } }),
  documentElement: { dataset: {} },
};
global.localStorage = { setItem() { }, getItem() { return null; } };
global.URL = { createObjectURL: () => '', revokeObjectURL() { } };
eval(fs.readFileSync(path.join(__dirname, 'p3_motor.js'), 'utf8'));

const RAIZ = path.resolve(__dirname, '..');
const leer = n => JSON.parse(fs.readFileSync(path.join(RAIZ, n), 'utf8'));
const D = leer('compacto.json');
const PAR = leer('parametros.json');
const PY = leer('paridad_py.json');

const LAM = 0.65, LAM_N = 0.30, FK = 1.0;
let peor = 0;
const abs = (a, b) => Math.abs(a - b);
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1);
const marca = d => { peor = Math.max(peor, d); return d.toExponential(2); };

// ---- cuantil t -----------------------------------------------------------
console.log('--- cuantil t de Student (contra scipy) ---');
[[0.90, 5, 1.475884], [0.95, 5, 2.015048], [0.975, 10, 2.228139]].forEach(([p, gl, esp]) => {
  const v = cuantilT(p, gl);
  console.log('  cuantilT(%s, %d) = %s   esperado %s   dif %s',
    p, gl, v.toFixed(6), esp.toFixed(6), marca(abs(v, esp) / esp));
});

// ---- estimación ----------------------------------------------------------
const E = estimar(D, LAM, LAM_N, FK);
E.planPorIc = D.carreras.map(c => D.planCiclos[c] || D.planDefecto);
E.apertura = D.sedes.map(s => D.sedeApertura[s] || { enMaduracion: false });
E.nSedes = D.sedes.length;

console.log('\n--- constantes de contracción ---');
[['celda (rezago 1)', E.kCont.celda[0], PY.k.celda],
['modalidad (rezago 1)', E.kCont.moda[0], PY.k.moda],
['avance', E.kAvance, PY.k.avance],
['turno', E.kTurno, PY.k.turno],
['turno de ingresantes', E.kNuevos, PY.k.nuevos],
['modalidad de ingresantes', E.kModalidad, PY.k.modalidad],
].forEach(([nom, js, py]) => {
  console.log('  %s JS %s   PY %s   dif %s',
    nom.padEnd(26), js.toFixed(10), py.toFixed(10), marca(rel(js, py)));
});
console.log('  %s JS %s', 'q_L global'.padEnd(26), E.contGlobal.map(x => x.toFixed(6)).join(' '));
console.log('  %s PY %s', ''.padEnd(26), PAR.cont_global.map(x => x.toFixed(6)).join(' '));
E.contGlobal.forEach((v, i) => marca(rel(v, PAR.cont_global[i])));

// ---- stock inicial e ingresantes -----------------------------------------
const stock0 = new Map();
for (const [ip, is, ic, im, ci, it, v] of D.stock) {
  const p = D.periodos[ip];
  if (!stock0.has(p)) stock0.set(p, new Map());
  stock0.get(p).set(is + '|' + ic + '|' + im + '|' + ci + '|' + it, v);
}
/* Mismo supuesto que paridad.py: repetir el último ingreso observado del
   semestre de la misma paridad, con su composición por modalidad. */
const obs = new Map();
for (const [ip, is, ic, im, ci, v] of D.nuevos) {
  const p = D.periodos[ip];
  if (!obs.has(p)) obs.set(p, new Map());
  obs.get(p).set(is + '|' + ic + '|' + im + '|' + ci, v);
}
const ult = D.periodos[D.periodos.length - 1];
const fut = [];
for (let i = 1; i <= 6; i++) fut.push(moverPeriodo(ult, i));
const nuevos = new Map();
fut.forEach(T => {
  const misma = D.periodos.filter(p => p % 100 === T % 100);
  nuevos.set(T, new Map(obs.get(misma[misma.length - 1])));
});

const z = PAR.escenarios.z, sig = PAR.escenarios.sigma;
const [cen, vr] = proyectar(E, stock0, nuevos, fut, 0, true);
const tot = m => { let s = 0; m.forEach(v => s += v); return s; };

console.log('\n--- totales proyectados por semestre ---');
for (const T of fut) {
  const r = PY.tot[String(T)];
  const c = tot(cen.get(T)), v = tot(vr.get(T));
  console.log('  %s  punto JS %s / PY %s  dif %s   |   sd JS %s / PY %s  dif %s',
    T, c.toFixed(6), r.cen.toFixed(6), marca(rel(c, r.cen)),
    Math.sqrt(v).toFixed(6), Math.sqrt(r.var).toFixed(6), marca(rel(Math.sqrt(v), Math.sqrt(r.var))));
}

console.log('\n--- desglose por modalidad (la dimensión añadida al estado) ---');
for (const T of fut) {
  const acc = D.modalidades.map(() => 0);
  cen.get(T).forEach((v, k) => { acc[+k.split('|')[2]] += v; });
  const r = PY.porMod[String(T)];
  console.log('  %s  %s', T, D.modalidades.map((m, i) =>
    m + ' ' + acc[i].toFixed(3) + ' / ' + r[m].toFixed(3) +
    ' (' + marca(rel(acc[i], r[m])) + ')').join('   '));
}

/* La comparación es relativa: `compacto.json` redondea los conteos a cuatro
   decimales y los dos motores los reagregan en distinto orden, así que un
   total de 26 000 no puede coincidir al absoluto de 1e-9. Un umbral de 1e-6
   relativo sigue siendo mucho más estricto que cualquier error de lógica. */
console.log('\n=== DIFERENCIA RELATIVA MÁXIMA: %s ===', peor.toExponential(3));
console.log(peor < 1e-6 ? 'PARIDAD OK' : 'DIVERGENCIA — revisar');
process.exit(peor < 1e-6 ? 0 : 1);
