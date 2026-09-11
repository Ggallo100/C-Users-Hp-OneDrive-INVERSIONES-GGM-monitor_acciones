/* ==========================================================================
   UTILIDADES
   ========================================================================== */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

const nf0 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = v => nf0.format(Math.round(v || 0));
const fmtD = v => nf1.format(v || 0);
const fmtP = v => nf1.format((v || 0) * 100) + ' %';
const fmtP2 = v => nf2.format((v || 0) * 100) + ' %';

/** Etiqueta legible de un semestre académico: 202301 -> 2023-I */
function rotuloPeriodo(p) {
  const m = /^(\d{4})(\d{2})$/.exec(String(p));
  if (!m) return String(p);
  return m[1] + '-' + ({ '01': 'I', '02': 'II' }[m[2]] || m[2]);
}

/** Inversa de rotuloPeriodo: admite 2027-I, 2027-II, 2027-1, 2027-2 y 202701. */
function leerPeriodo(txt) {
  const s = String(txt == null ? '' : txt).trim().toUpperCase().replace(/\s+/g, '');
  let m = /^(\d{4})-?(I{1,2}|[12])$/.exec(s);
  if (m) return +m[1] * 100 + (m[2] === 'I' || m[2] === '1' ? 1 : 2);
  m = /^(\d{4})(0[12])$/.exec(s);
  if (m) return +m[1] * 100 + +m[2];
  m = /^(\d{4})\.0*$/.exec(s);                       // Excel puede entregar 202701.0
  if (m) return leerPeriodo(m[1]);
  m = /^(\d{6})(?:\.0*)?$/.exec(s);
  if (m) return leerPeriodo(m[1].slice(0, 4) + m[1].slice(4));
  return NaN;
}

/** Posición absoluta del semestre en la recta temporal: 2023-I -> 4046. */
function indicePeriodo(p) {
  return Math.floor(p / 100) * 2 + (p % 100 - 1);
}

/** Desplaza un semestre académico L posiciones (positivo o negativo). */
function moverPeriodo(p, L) {
  let a = Math.floor(p / 100), s = p % 100;
  for (let i = 0; i < Math.abs(L); i++) {
    if (L > 0) { if (s === 1) s = 2; else { a++; s = 1; } }
    else { if (s === 2) s = 1; else { a--; s = 2; } }
  }
  return a * 100 + s;
}

function brindis(msg, mal) {
  const b = $('#brindis');
  b.textContent = msg;
  b.classList.toggle('mal', !!mal);
  b.classList.add('ver');
  clearTimeout(brindis._t);
  brindis._t = setTimeout(() => b.classList.remove('ver'), 3600);
}

function descargar(nombre, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function hoyISO() {
  const d = new Date();
  const z = n => String(n).padStart(2, '0');
  return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate());
}

function alternarTema() {
  const h = document.documentElement;
  h.dataset.tema = h.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
  try { localStorage.setItem('tema-proyeccion', h.dataset.tema); } catch (e) { }
  pintarTodo();
}

/** Cuantil t de Student. Inversión por bisección sobre la cdf. */
function cdfT(t, gl) {
  const x = gl / (gl + t * t);
  const ib = betaInc(gl / 2, 0.5, x);
  return t > 0 ? 1 - 0.5 * ib : 0.5 * ib;
}
function betaInc(a, b, x) {          // I_x(a,b) regularizada, fracción continua
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  let f = 1, c = 1, d = 0;
  for (let i = 0; i <= 220; i++) {
    const m = Math.floor(i / 2);
    let num;
    if (i === 0) num = 1;
    else if (i % 2 === 0) num = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    else num = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + num * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + num / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    const cd = c * d; f *= cd;
    if (Math.abs(1 - cd) < 1e-10) break;
  }
  const r = front * (f - 1);
  return x < (a + 1) / (a + b + 2) ? r : 1 - betaIncEspejo(a, b, x, lbeta);
}
function betaIncEspejo(a, b, x, lbeta) {
  const front = Math.exp(Math.log(1 - x) * b + Math.log(x) * a - lbeta) / b;
  let f = 1, c = 1, d = 0;
  const y = 1 - x;
  for (let i = 0; i <= 220; i++) {
    const m = Math.floor(i / 2);
    let num;
    if (i === 0) num = 1;
    else if (i % 2 === 0) num = (m * (a - m) * y) / ((b + 2 * m - 1) * (b + 2 * m));
    else num = -((b + m) * (a + b + m) * y) / ((b + 2 * m) * (b + 2 * m + 1));
    d = 1 + num * d; if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d;
    c = 1 + num / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    const cd = c * d; f *= cd;
    if (Math.abs(1 - cd) < 1e-10) break;
  }
  return front * (f - 1);
}
function lgamma(z) {
  const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < 8; i++) x += g[i] / (z + i + 1);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
/** Cuantil de la t de Student con `gl` grados de libertad. */
function cuantilT(p, gl) {
  let lo = -60, hi = 60;
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    if (cdfT(m, gl) < p) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

/* ==========================================================================
   ESTIMACIÓN — contracción empírico-Bayes sobre los conteos por periodo
   ========================================================================== */

/**
 * Constante de contracción del modelo Beta-Binomial por el método de los
 * momentos: k = alfa+beta = p(1-p)/s2_entre - 1.
 * k es el tamaño muestral equivalente del prior: una celda con n observaciones
 * pondera n/(n+k) su propia evidencia y k/(n+k) la del nivel padre.
 */
function kBetaBinom(exitos, ensayos) {
  const e = [], n = [];
  for (let i = 0; i < ensayos.length; i++) if (ensayos[i] > 0) { e.push(exitos[i]); n.push(ensayos[i]); }
  if (n.length < 3) return 50;
  const sn = n.reduce((a, b) => a + b, 0), se = e.reduce((a, b) => a + b, 0);
  const pg = se / sn;
  if (!(pg > 0 && pg < 1)) return 50;
  let varObs = 0, varMue = 0;
  for (let i = 0; i < n.length; i++) {
    const w = n[i] / sn, p = e[i] / n[i];
    varObs += w * (p - pg) * (p - pg);
    varMue += w * pg * (1 - pg) / n[i];
  }
  const entre = varObs - varMue;
  if (entre <= 1e-9) return 1e4;
  return Math.min(Math.max(pg * (1 - pg) / entre - 1, 1), 1e4);
}

/** Contracción para composiciones, vía la categoría de mayor masa. */
function kDirichlet(mat) {
  if (mat.length < 3) return 20;
  const m = mat[0].length;
  const tot = new Array(m).fill(0);
  const n = mat.map(f => { let s = 0; for (let j = 0; j < m; j++) { s += f[j]; tot[j] += f[j]; } return s; });
  let j = 0; for (let i = 1; i < m; i++) if (tot[i] > tot[j]) j = i;
  return kBetaBinom(mat.map(f => f[j]), n);
}

/**
 * Reagrega los conteos por periodo con ponderación de recencia lam^(tmax - t)
 * y construye todos los niveles de la escalera de contracción.
 *
 * El estado es (sede, carrera, modalidad, ciclo, turno). La modalidad se
 * conserva entre semestres —el 99,4 % de los continuadores la mantiene—, así
 * que no necesita matriz de transición propia; pero condiciona con fuerza la
 * continuación, el avance de ciclo y el turno, y por eso entra en todas las
 * tablas de conteo.
 */
function estimar(D, lam, lamN, factorK) {
  const LAG = D.lagMax, ND = D.deltas.length, NT = D.turnos.length;
  const NM = D.modalidades.length;
  const tmax = D.periodos.length - 1;
  const w = t => Math.pow(lam, tmax - t);
  const wN = t => Math.pow(lamN, tmax - t);
  const suma = (m, k, largo, v, mult) => {
    let a = m.get(k); if (!a) { a = new Array(largo).fill(0); m.set(k, a); }
    for (let i = 0; i < largo; i++) a[i] += v[i] * mult;
  };

  /* ---- continuación: n y k por rezago, en cinco niveles ---- */
  const celda = new Map(), porCarrera = new Map(), porModa = new Map(),
    porCicloPar = new Map(), porCiclo = new Map();
  const glob = new Array(2 * LAG).fill(0);
  for (const f of D.cont) {
    const [is, ic, im, ci, pa, ip] = f;
    const v = f.slice(6), mult = w(ip);
    suma(celda, is + '|' + ic + '|' + im + '|' + ci + '|' + pa, 2 * LAG, v, mult);
    suma(porCarrera, ic + '|' + im + '|' + ci + '|' + pa, 2 * LAG, v, mult);
    suma(porModa, im + '|' + ci + '|' + pa, 2 * LAG, v, mult);
    suma(porCicloPar, ci + '|' + pa, 2 * LAG, v, mult);
    suma(porCiclo, String(ci), 2 * LAG, v, mult);
    for (let i = 0; i < 2 * LAG; i++) glob[i] += v[i] * mult;
  }
  const kCont = { celda: [], carrera: [], moda: [], ciclopar: [], ciclo: [] };
  for (let L = 0; L < LAG; L++) {
    for (const [nom, m] of [['celda', celda], ['carrera', porCarrera], ['moda', porModa],
    ['ciclopar', porCicloPar], ['ciclo', porCiclo]]) {
      const ex = [], en = [];
      m.forEach(a => { en.push(a[L]); ex.push(a[LAG + L]); });
      kCont[nom].push(kBetaBinom(ex, en) * factorK);
    }
  }
  const contGlobal = [];
  for (let L = 0; L < LAG; L++) contGlobal.push(glob[LAG + L] / Math.max(glob[L], 1e-9));

  /* ---- avance de ciclo: celda(carrera,modalidad,ciclo) -> modalidad·ciclo -> ciclo ---- */
  const avCelda = new Map(), avModa = new Map(), avCiclo = new Map();
  const avGlobal = new Array(ND).fill(0);
  for (const f of D.av) {
    const [ic, im, ci, ip] = f, v = f.slice(4), mult = w(ip);
    suma(avCelda, ic + '|' + im + '|' + ci, ND, v, mult);
    suma(avModa, im + '|' + ci, ND, v, mult);
    suma(avCiclo, String(ci), ND, v, mult);
    for (let i = 0; i < ND; i++) avGlobal[i] += v[i] * mult;
  }
  const kAvance = kDirichlet(Array.from(avCelda.values())) * factorK;

  /* ---- transición de turno: celda(sede,modalidad,ciclo,turno) -> sede·modalidad·turno -> sede·turno ---- */
  const tuCelda = new Map(), tuModa = new Map(), tuSede = new Map();
  for (const f of D.tu) {
    const [is, im, ci, it, ip] = f, v = f.slice(5), mult = w(ip);
    suma(tuCelda, is + '|' + im + '|' + ci + '|' + it, NT, v, mult);
    suma(tuModa, is + '|' + im + '|' + it, NT, v, mult);
    suma(tuSede, is + '|' + it, NT, v, mult);
  }
  const kTurno = kDirichlet(Array.from(tuCelda.values())) * factorK;

  /* ---- mezcla de turno de los ingresantes (recencia propia) ---- */
  const ntCelda = new Map(), ntCarModaPar = new Map(), ntCarModa = new Map(),
    ntSedeModaPar = new Map(), ntSedeModa = new Map(), ntSede = new Map();
  const ntGlobal = new Array(NT).fill(0);
  for (const f of D.nt) {
    const [is, ic, im, ci, pa, ip] = f, v = f.slice(6), mult = wN(ip);
    suma(ntCelda, is + '|' + ic + '|' + im + '|' + ci + '|' + pa, NT, v, mult);
    suma(ntCarModaPar, is + '|' + ic + '|' + im + '|' + pa, NT, v, mult);
    suma(ntCarModa, is + '|' + ic + '|' + im, NT, v, mult);
    suma(ntSedeModaPar, is + '|' + im + '|' + pa, NT, v, mult);
    suma(ntSedeModa, is + '|' + im, NT, v, mult);
    suma(ntSede, String(is), NT, v, mult);
    for (let i = 0; i < NT; i++) ntGlobal[i] += v[i] * mult;
  }
  const kNuevos = kDirichlet(Array.from(ntCelda.values())) * factorK;

  /* ---- mezcla de modalidad de los ingresantes ---- */
  const nmCelda = new Map(), nmCarPar = new Map(), nmCar = new Map(),
    nmSedePar = new Map(), nmSede = new Map();
  const nmGlobal = new Array(NM).fill(0);
  for (const f of D.nm) {
    const [is, ic, ci, pa, ip] = f, v = f.slice(5), mult = wN(ip);
    suma(nmCelda, is + '|' + ic + '|' + ci + '|' + pa, NM, v, mult);
    suma(nmCarPar, is + '|' + ic + '|' + pa, NM, v, mult);
    suma(nmCar, is + '|' + ic, NM, v, mult);
    suma(nmSedePar, is + '|' + pa, NM, v, mult);
    suma(nmSede, String(is), NM, v, mult);
    for (let i = 0; i < NM; i++) nmGlobal[i] += v[i] * mult;
  }
  const kModalidad = kDirichlet(Array.from(nmCelda.values())) * factorK;

  return {
    D, lam, lamN, factorK, LAG, ND, NT, NM,
    celda, porCarrera, porModa, porCicloPar, porCiclo, contGlobal, kCont,
    avCelda, avModa, avCiclo, avGlobal, kAvance,
    tuCelda, tuModa, tuSede, kTurno,
    ntCelda, ntCarModaPar, ntCarModa, ntSedeModaPar, ntSedeModa, ntSede, ntGlobal, kNuevos,
    nmCelda, nmCarPar, nmCar, nmSedePar, nmSede, nmGlobal, kModalidad,
    // Apertura por índice de sede; la interfaz la amplía con las sedes nuevas
    // que aparezcan en el archivo de ingresantes.
    apertura: D.sedes.map(s2 => D.sedeApertura[s2] || { enMaduracion: false }),
    nSedes: D.sedes.length,
    iS: new Map(D.sedes.map((v, i) => [v, i])),
    iC: new Map(D.carreras.map((v, i) => [v, i])),
    iM: new Map(D.modalidades.map((v, i) => [v, i])),
    iT: new Map(D.turnos.map((v, i) => [v, i])),
    cacheQ: new Map(), cacheAv: new Map(), cacheTu: new Map(),
    cacheNt: new Map(), cacheNm: new Map(),
  };
}

/* ---- consultas de parámetros contraídos ---- */

/**
 * Tasa de continuación con rezago L y su tamaño muestral efectivo.
 * Escalera: global -> ciclo -> ciclo·paridad -> modalidad·ciclo·paridad
 * -> carrera·modalidad·ciclo·paridad -> celda.
 * La modalidad entra justo después de la estructura por ciclo porque es el
 * segundo factor en importancia: en el ciclo 1 la continuación va del 42 % a
 * distancia al 71 % presencial. Una carrera o sede sin historia propia se
 * detiene en el último nivel con evidencia, que es lo que permite proyectar
 * programas y sedes nuevos.
 */
function tasaQ(E, is, ic, im, ciclo, par, L) {
  const ck = is + ',' + ic + ',' + im + ',' + ciclo + ',' + par + ',' + L;
  const hit = E.cacheQ.get(ck); if (hit) return hit;
  const i = L - 1, LAG = E.LAG;
  const cl = Math.min(ciclo, E.D.cicloMax);
  const cadena = [
    [E.porCiclo.get(String(cl)), E.kCont.ciclo[i]],
    [E.porCicloPar.get(cl + '|' + par), E.kCont.ciclopar[i]],
    [E.porModa.get(im + '|' + cl + '|' + par), E.kCont.moda[i]],
    [E.porCarrera.get(ic + '|' + im + '|' + cl + '|' + par), E.kCont.carrera[i]],
    [E.celda.get(is + '|' + ic + '|' + im + '|' + cl + '|' + par), E.kCont.celda[i]],
  ];
  let est = E.contGlobal[i], nef = 0;
  for (const [a, k] of cadena) {
    if (!a) continue;
    const n = a[i], kk = a[LAG + i];
    if (n <= 0) continue;
    est = (kk + k * est) / (n + k);
    nef = n + k;
  }
  est = Math.min(Math.max(est, 1e-9), 1 - 1e-9);
  const r = [est, Math.max(nef, 1)];
  E.cacheQ.set(ck, r);
  return r;
}

/** Composición contraída hacia el padre (Dirichlet-Multinomial). */
function comp(celda, padre, k) {
  let sp = 0; for (const x of padre) sp += x;
  const pad = sp > 0 ? padre.map(x => x / sp) : padre.map(() => 1 / padre.length);
  if (!celda) return [pad, k];
  let sc = 0; for (const x of celda) sc += x;
  const v = celda.map((x, j) => (x + k * pad[j]) / (sc + k));
  let s = 0; for (const x of v) s += x;
  return [s > 0 ? v.map(x => x / s) : pad, sc + k];
}

/**
 * Contracción en cascada por una lista de niveles, del más agregado al más
 * fino. Se detiene en el último nivel que tenga evidencia, y devuelve además
 * el nombre de ese nivel para poder informarlo en la interfaz.
 */
function cascada(cadena, raiz, k) {
  let sg = 0; for (const x of raiz) sg += x;
  let v = sg > 0 ? raiz.map(x => x / sg) : raiz.map(() => 1 / raiz.length);
  let nef = k, nivel = 'global';
  for (const [nombre, cel] of cadena) {
    if (!cel) continue;
    let s = 0; for (const x of cel) s += x;
    if (s <= 0) continue;
    const r = comp(cel, v, k);
    v = r[0]; nef = r[1]; nivel = nombre;
  }
  return [v, nef, nivel];
}

/**
 * Ciclo máximo que una sede puede ofrecer en el semestre T.
 *
 * Una sede recién abierta despliega su plan semestre a semestre: en el de
 * apertura sólo existe el ciclo 1, un semestre después el 2, y así. Sin este
 * tope la proyección colocaría estudiantes en ciclos que la sede todavía no
 * imparte, porque la matriz de avance permite saltos de +2 y +3 y el archivo
 * de ingresantes puede declarar traslados a ciclos superiores.
 *
 * Las sedes consolidadas devuelven un tope inoperante.
 */
function topeSede(E, is, T) {
  const ap = E.apertura && E.apertura[is];
  if (!ap || !ap.enMaduracion) return 1e6;
  // Antes de la apertura el tope sería negativo; 0 expresa que la sede aún no
  // ofrece ningún ciclo, que es lo correcto y además evita ciclos absurdos.
  return Math.max(0, ap.cicloBase + (indicePeriodo(T) - indicePeriodo(ap.inicio)));
}

function avanceDe(E, ic, im, ciclo) {
  const ck = ic + ',' + im + ',' + ciclo;
  const hit = E.cacheAv.get(ck); if (hit) return hit;
  const cl = Math.min(ciclo, E.D.cicloMax);
  const raiz = E.avCiclo.get(String(cl)) || E.avGlobal;
  const r = cascada([
    ['modalidad', E.avModa.get(im + '|' + cl)],
    ['celda', E.avCelda.get(ic + '|' + im + '|' + cl)],
  ], raiz, E.kAvance);
  E.cacheAv.set(ck, r);
  return r;
}

function turnoDe(E, is, im, ciclo, it) {
  const ck = is + ',' + im + ',' + ciclo + ',' + it;
  const hit = E.cacheTu.get(ck); if (hit) return hit;
  const cl = Math.min(ciclo, E.D.cicloMax);
  const raiz = E.tuSede.get(is + '|' + it);
  let r;
  if (!raiz) {                      // turno sin historia en la sede: permanece
    const v = new Array(E.NT).fill(0); v[it] = 1;
    r = [v, 1e6, 'sin evidencia'];
  } else {
    r = cascada([
      ['sede·modalidad', E.tuModa.get(is + '|' + im + '|' + it)],
      ['celda', E.tuCelda.get(is + '|' + im + '|' + cl + '|' + it)],
    ], raiz, E.kTurno);
  }
  E.cacheTu.set(ck, r);
  return r;
}

/**
 * Reparto estimado de los ingresantes por turno. La modalidad entra pronto en
 * la cascada porque casi lo determina: a distancia es turno noche en un 90 %.
 * Un programa NUEVO, sin historia propia, se detiene en el nivel de sede y
 * modalidad, que sí la tiene.
 */
function mezclaNuevos(E, is, ic, im, ciclo, par) {
  const ck = is + ',' + ic + ',' + im + ',' + ciclo + ',' + par;
  const hit = E.cacheNt.get(ck); if (hit) return hit;
  const cl = Math.min(ciclo, E.D.cicloMax);
  const k = E.kNuevos;
  const r = cascada([
    ['sede', E.ntSede.get(String(is))],
    ['sede·modalidad', E.ntSedeModa.get(is + '|' + im)],
    ['sede·modalidad·paridad', E.ntSedeModaPar.get(is + '|' + im + '|' + par)],
    ['sede·carrera·modalidad', E.ntCarModa.get(is + '|' + ic + '|' + im)],
    ['sede·carrera·modalidad·paridad', E.ntCarModaPar.get(is + '|' + ic + '|' + im + '|' + par)],
    ['celda', E.ntCelda.get(is + '|' + ic + '|' + im + '|' + cl + '|' + par)],
  ], E.ntGlobal, k);
  E.cacheNt.set(ck, r);
  return r;
}

/**
 * Reparto estimado de los ingresantes por modalidad, para cuando el archivo de
 * entrada no la declara. La paridad condiciona porque la mezcla oscila mucho
 * entre semestres: en el segundo la modalidad a distancia pesa bastante más.
 */
function mezclaModalidad(E, is, ic, ciclo, par) {
  const ck = is + ',' + ic + ',' + ciclo + ',' + par;
  const hit = E.cacheNm.get(ck); if (hit) return hit;
  const cl = Math.min(ciclo, E.D.cicloMax);
  const k = E.kModalidad;
  const r = cascada([
    ['sede', E.nmSede.get(String(is))],
    ['sede·paridad', E.nmSedePar.get(is + '|' + par)],
    ['sede·carrera', E.nmCar.get(is + '|' + ic)],
    ['sede·carrera·paridad', E.nmCarPar.get(is + '|' + ic + '|' + par)],
    ['celda', E.nmCelda.get(is + '|' + ic + '|' + cl + '|' + par)],
  ], E.nmGlobal, k);
  E.cacheNm.set(ck, r);
  return r;
}

/* ==========================================================================
   PROYECCIÓN
   ========================================================================== */

/**
 * Proyecta la matrícula periodo a periodo.
 *
 *   stock0   Map periodo -> Map "is|ic|im|ciclo|it" -> valor  (historia inicial)
 *   nuevos   Map periodo -> Map "is|ic|im|ciclo"    -> cantidad
 *   periodos lista ordenada de semestres a proyectar
 *   shock    desplazamiento sistémico en escala logit sobre la continuación
 *   conVar   acumula además la varianza independiente por celda
 *
 * La incertidumbre se separa en dos partes con álgebra distinta al agregar:
 *   SISTÉMICA      reproyectando con shock != 0; común a todas las celdas, se
 *                  suma LINEALMENTE.
 *   INDEPENDIENTE  realización multinomial + error de parámetro + varianza
 *                  propagada del stock de origen; se suma en CUADRATURA.
 */
function proyectar(E, stock0, nuevos, periodos, shock, conVar) {
  const LAG = E.LAG, ND = E.ND, NT = E.NT, D = E.D;
  const hist = new Map(), hvar = new Map();
  stock0.forEach((m, p) => {
    hist.set(p, new Map(m));
    if (conVar) { const z = new Map(); m.forEach((v, k) => z.set(k, 0)); hvar.set(p, z); }
  });
  const res = new Map(), resv = new Map();
  const planPorIc = E.planPorIc;

  for (const T of periodos) {
    const par = T % 100;
    // El tope por maduración depende del semestre, así que se recalcula en cada
    // paso de la recursión y no dentro del bucle de celdas.
    const topeMaduracion = [];
    for (let is = 0; is < (E.nSedes || D.sedes.length); is++) topeMaduracion[is] = topeSede(E, is, T);
    const dest = new Map(), dvar = conVar ? new Map() : null;
    for (let L = 1; L <= LAG; L++) {
      const Tori = moverPeriodo(T, -L);
      const st = hist.get(Tori);
      if (!st) continue;
      const vr = conVar ? (hvar.get(Tori) || new Map()) : null;
      const parO = Tori % 100;
      st.forEach((val, clave) => {
        if (val <= 0) return;
        const pz = clave.split('|');
        const is = +pz[0], ic = +pz[1], im = +pz[2], ciclo = +pz[3], it = +pz[4];
        let [qq, nq] = tasaQ(E, is, ic, im, ciclo, parO, L);
        if (shock) {
          const lo = Math.log(qq / (1 - qq)) + shock;
          qq = 1 / (1 + Math.exp(-lo));
        }
        if (qq <= 0) return;
        const [av, na] = avanceDe(E, ic, im, ciclo);
        const [tt, nt] = turnoDe(E, is, im, ciclo, it);
        const tope = Math.min(planPorIc[ic] || D.planDefecto, topeMaduracion[is]);
        const vx = conVar ? (vr.get(clave) || 0) : 0;
        for (let di = 0; di < ND; di++) {
          if (av[di] <= 0) continue;
          let c2 = ciclo + D.deltas[di];
          if (c2 < 1) c2 = 1;
          if (c2 > tope) c2 = tope;
          for (let ti = 0; ti < NT; ti++) {
            if (tt[ti] <= 0) continue;
            const phi = qq * av[di] * tt[ti];
            const k2 = is + '|' + ic + '|' + im + '|' + c2 + '|' + ti;
            dest.set(k2, (dest.get(k2) || 0) + val * phi);
            if (conVar) {
              const vReal = val * phi * (1 - phi);
              const vPar = val * val * phi * phi * (
                (1 - qq) / (qq * nq) + (1 - av[di]) / (av[di] * na) + (1 - tt[ti]) / (tt[ti] * nt));
              dvar.set(k2, (dvar.get(k2) || 0) + vReal + vPar + vx * phi * phi);
            }
          }
        }
      });
    }
    const nv = nuevos.get(T);
    if (nv) nv.forEach((cant, clave) => {
      if (cant <= 0) return;
      const pz = clave.split('|');
      const is = +pz[0], ic = +pz[1], im = +pz[2];
      // El ingresante tampoco puede entrar a un ciclo que la sede aún no
      // imparte ni que exceda el plan de la carrera.
      const ciclo = Math.min(+pz[3], planPorIc[ic] || D.planDefecto, topeMaduracion[is]);
      const [mz, nm] = mezclaNuevos(E, is, ic, im, ciclo, par);
      for (let ti = 0; ti < NT; ti++) {
        if (mz[ti] <= 0) continue;
        const k2 = is + '|' + ic + '|' + im + '|' + ciclo + '|' + ti;
        dest.set(k2, (dest.get(k2) || 0) + cant * mz[ti]);
        if (conVar) {
          dvar.set(k2, (dvar.get(k2) || 0)
            + cant * mz[ti] * (1 - mz[ti]) + cant * cant * mz[ti] * (1 - mz[ti]) / nm);
        }
      }
    });
    res.set(T, dest);
    hist.set(T, dest);
    if (conVar) { resv.set(T, dvar); hvar.set(T, dvar); }
  }
  return conVar ? [res, resv] : res;
}
