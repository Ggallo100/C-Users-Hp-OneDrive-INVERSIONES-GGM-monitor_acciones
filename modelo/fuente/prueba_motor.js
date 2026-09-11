/* Verificación de paridad entre el motor JavaScript y la implementación de
   referencia en Python. Se ejecuta con node. */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/p3_motor.js', 'utf8');
// El motor toca el DOM sólo en brindis/descargar/alternarTema; se neutralizan.
global.document = { querySelector: () => ({ classList: { toggle() { }, add() { }, remove() { } } }), documentElement: { dataset: {} } };
global.localStorage = { setItem() { }, getItem() { return null; } };
global.URL = { createObjectURL: () => '', revokeObjectURL() { } };
eval(src);

const D = JSON.parse(fs.readFileSync(__dirname + '/compacto.json', 'utf8'));
const REF = JSON.parse(fs.readFileSync(__dirname + '/caso_referencia.json', 'utf8'));
const PAR = JSON.parse(fs.readFileSync(__dirname + '/parametros.json', 'utf8'));

// ---- cuantil t -----------------------------------------------------------
console.log('cuantilT(0.90, 5) =', cuantilT(0.90, 5).toFixed(6), ' esperado 1.475884 (scipy)');
console.log('cuantilT(0.95, 5) =', cuantilT(0.95, 5).toFixed(6), ' esperado 2.015048');
console.log('cuantilT(0.975,10)=', cuantilT(0.975, 10).toFixed(6), ' esperado 2.228139');

// ---- estimación ----------------------------------------------------------
const E = estimar(D, 0.50, 0.30, 1.0);
E.planPorIc = D.carreras.map(c => D.planCiclos[c] || D.planDefecto);

console.log('\n--- constantes de contracción (rezago 1) ---');
console.log('  k celda   JS %s   PY %s', E.kCont.celda[0].toFixed(4), PAR.k_celda[0].toFixed(4));
console.log('  k carrera JS %s   PY %s', E.kCont.carrera[0].toFixed(4), PAR.k_carrera[0].toFixed(4));
console.log('  k ciclopar JS %s  PY %s', E.kCont.ciclopar[0].toFixed(4), PAR.k_ciclopar[0].toFixed(4));
console.log('  k ciclo   JS %s   PY %s', E.kCont.ciclo[0].toFixed(4), PAR.k_ciclo[0].toFixed(4));
console.log('  k avance  JS %s   PY %s', E.kAvance.toFixed(4), PAR.k_avance.toFixed(4));
console.log('  k turno   JS %s   PY %s', E.kTurno.toFixed(4), PAR.k_turno.toFixed(4));
console.log('  k nuevos  JS %s   PY %s', E.kNuevos.toFixed(4), PAR.k_nuevos.toFixed(4));
console.log('  q_L glob  JS', E.contGlobal.map(x => x.toFixed(5)).join(' '));
console.log('            PY', PAR.cont_global.map(x => x.toFixed(5)).join(' '));

// ---- stock inicial -------------------------------------------------------
const stock0 = new Map();
for (const [ip, is, ic, ci, it, v] of D.stock) {
  const p = D.periodos[ip];
  if (!stock0.has(p)) stock0.set(p, new Map());
  stock0.get(p).set(is + '|' + ic + '|' + ci + '|' + it, v);
}

// ---- ingresantes del caso de referencia ----------------------------------
const iS = new Map(D.sedes.map((v, i) => [v, i]));
const iC = new Map(D.carreras.map((v, i) => [v, i]));
const carreras = D.carreras.slice();
function idxCarrera(nom) {
  if (iC.has(nom)) return iC.get(nom);
  const i = carreras.length; carreras.push(nom); iC.set(nom, i);
  E.planPorIc[i] = D.planDefecto;
  return i;
}
const nuevos = new Map();
const fut = [];
for (const [pTxt, filas] of Object.entries(REF.nuevos)) {
  const p = +pTxt; fut.push(p);
  const m = new Map();
  for (const [sede, carrera, ciclo, cant] of filas) {
    m.set(iS.get(sede) + '|' + idxCarrera(carrera) + '|' + ciclo, cant);
  }
  nuevos.set(p, m);
}
fut.sort((a, b) => a - b);

const z = PAR.escenarios.z, sig = PAR.escenarios.sigma;
const [cen, vr] = proyectar(E, stock0, nuevos, fut, 0, true);
const alt = proyectar(E, stock0, nuevos, fut, +z * sig, false);
const baj = proyectar(E, stock0, nuevos, fut, -z * sig, false);
const tot = m => { let s = 0; m.forEach(v => s += v); return s; };

console.log('\n--- totales por semestre (JS vs PY) ---');
let peor = 0;
for (const T of fut) {
  const r = REF.referencia[String(T)];
  const c = tot(cen.get(T)), a = tot(alt.get(T)), b = tot(baj.get(T)), v = tot(vr.get(T));
  const d = Math.max(Math.abs(c - r.cen), Math.abs(a - r.alt), Math.abs(b - r.baj),
    Math.abs(Math.sqrt(v) - Math.sqrt(r.var)));
  peor = Math.max(peor, d);
  console.log('  %s  cen %s / %s   alt %s / %s   baj %s / %s   sd %s / %s   dif %s',
    T, c.toFixed(3), r.cen.toFixed(3), a.toFixed(3), r.alt.toFixed(3),
    b.toFixed(3), r.baj.toFixed(3), Math.sqrt(v).toFixed(3), Math.sqrt(r.var).toFixed(3),
    d.toExponential(2));
}

console.log('\n--- celdas de control ---');
const iT = new Map(D.turnos.map((v, i) => [v, i]));
for (const [k, esperado] of Object.entries(REF.referencia)) {
  if (!k.includes('|')) continue;
  const [pT, sede, carrera, ciclo, turno] = k.split('|');
  const clave = iS.get(sede) + '|' + iC.get(carrera) + '|' + ciclo + '|' + iT.get(turno);
  const got = (cen.get(+pT) || new Map()).get(clave) || 0;
  const d = Math.abs(got - esperado);
  peor = Math.max(peor, d);
  console.log('  %s %s c%s %s  JS %s  PY %s  dif %s',
    pT, carrera.slice(0, 26).padEnd(26), ciclo, turno.padEnd(7),
    got.toFixed(5), (+esperado).toFixed(5), d.toExponential(2));
}

console.log('\n=== DIFERENCIA MÁXIMA: %s ===', peor.toExponential(3));
console.log(peor < 1e-6 ? 'PARIDAD OK' : 'DIVERGENCIA — revisar');
