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
 */
function estimar(D, lam, lamN, factorK) {
  const LAG = D.lagMax, ND = D.deltas.length, NT = D.turnos.length;
  const tmax = D.periodos.length - 1;
  const w = t => Math.pow(lam, tmax - t);
  const wN = t => Math.pow(lamN, tmax - t);
  const suma = (m, k, largo, v, mult) => {
    let a = m.get(k); if (!a) { a = new Array(largo).fill(0); m.set(k, a); }
    for (let i = 0; i < largo; i++) a[i] += v[i] * mult;
  };

  /* ---- continuación: n y k por rezago, en cuatro niveles ---- */
  const celda = new Map(), porCarrera = new Map(), porCicloPar = new Map(), porCiclo = new Map();
  const glob = new Array(2 * LAG).fill(0);
  for (const f of D.cont) {
    const [is, ic, ci, pa, ip] = f;
    const v = f.slice(5), mult = w(ip);
    suma(celda, is + '|' + ic + '|' + ci + '|' + pa, 2 * LAG, v, mult);
    suma(porCarrera, ic + '|' + ci + '|' + pa, 2 * LAG, v, mult);
    suma(porCicloPar, ci + '|' + pa, 2 * LAG, v, mult);
    suma(porCiclo, String(ci), 2 * LAG, v, mult);
    for (let i = 0; i < 2 * LAG; i++) glob[i] += v[i] * mult;
  }
  const kCont = { celda: [], carrera: [], ciclopar: [], ciclo: [] };
  for (let L = 0; L < LAG; L++) {
    for (const [nom, m] of [['celda', celda], ['carrera', porCarrera],
    ['ciclopar', porCicloPar], ['ciclo', porCiclo]]) {
      const ex = [], en = [];
      m.forEach(a => { en.push(a[L]); ex.push(a[LAG + L]); });
      kCont[nom].push(kBetaBinom(ex, en) * factorK);
    }
  }
  const contGlobal = [];
  for (let L = 0; L < LAG; L++) contGlobal.push(glob[LAG + L] / Math.max(glob[L], 1e-9));

  /* ---- avance de ciclo ---- */
  const avCelda = new Map(), avCiclo = new Map();
  const avGlobal = new Array(ND).fill(0);
  for (const f of D.av) {
    const [ic, ci, ip] = f, v = f.slice(3), mult = w(ip);
    suma(avCelda, ic + '|' + ci, ND, v, mult);
    suma(avCiclo, String(ci), ND, v, mult);
    for (let i = 0; i < ND; i++) avGlobal[i] += v[i] * mult;
  }
  const kAvance = kDirichlet(Array.from(avCelda.values())) * factorK;

  /* ---- transición de turno ---- */
  const tuCelda = new Map(), tuSede = new Map();
  for (const f of D.tu) {
    const [is, ci, it, ip] = f, v = f.slice(4), mult = w(ip);
    suma(tuCelda, is + '|' + ci + '|' + it, NT, v, mult);
    suma(tuSede, is + '|' + it, NT, v, mult);
  }
  const kTurno = kDirichlet(Array.from(tuCelda.values())) * factorK;

  /* ---- mezcla de turno de los ingresantes (recencia propia) ---- */
  const ntCelda = new Map(), ntCarPar = new Map(), ntCar = new Map(),
    ntSedePar = new Map(), ntSede = new Map();
  const ntGlobal = new Array(NT).fill(0);
  for (const f of D.nt) {
    const [is, ic, ci, pa, ip] = f, v = f.slice(5), mult = wN(ip);
    suma(ntCelda, is + '|' + ic + '|' + ci + '|' + pa, NT, v, mult);
    suma(ntCarPar, is + '|' + ic + '|' + pa, NT, v, mult);
    suma(ntCar, is + '|' + ic, NT, v, mult);
    suma(ntSedePar, is + '|' + pa, NT, v, mult);
    suma(ntSede, String(is), NT, v, mult);
    for (let i = 0; i < NT; i++) ntGlobal[i] += v[i] * mult;
  }
  // Sobre las celdas ya agregadas y ponderadas, igual que los demás niveles.
  const kNuevos = kDirichlet(Array.from(ntCelda.values())) * factorK;

  return {
    D, lam, lamN, factorK, LAG, ND, NT,
    celda, porCarrera, porCicloPar, porCiclo, contGlobal, kCont,
    avCelda, avCiclo, avGlobal, kAvance,
    tuCelda, tuSede, kTurno,
    ntCelda, ntCarPar, ntCar, ntSedePar, ntSede, ntGlobal, kNuevos,
    iS: new Map(D.sedes.map((v, i) => [v, i])),
    iC: new Map(D.carreras.map((v, i) => [v, i])),
    iT: new Map(D.turnos.map((v, i) => [v, i])),
    cacheQ: new Map(), cacheAv: new Map(), cacheTu: new Map(), cacheNt: new Map(),
  };
}

/* ---- consultas de parámetros contraídos ---- */

/**
 * Tasa de continuación con rezago L y su tamaño muestral efectivo.
 * Escalera: global -> ciclo -> ciclo·paridad -> carrera·ciclo·paridad -> celda.
 * Una carrera o sede sin historia propia se detiene en el último nivel con
 * evidencia, que es lo que permite proyectar programas nuevos.
 */
function tasaQ(E, is, ic, ciclo, par, L) {
  const ck = is + '' + ic + '' + ciclo + '' + par + '' + L;
  const hit = E.cacheQ.get(ck); if (hit) return hit;
  const i = L - 1, LAG = E.LAG;
  const cl = Math.min(ciclo, E.D.cicloMax);
  const cadena = [
    [E.porCiclo.get(String(cl)), E.kCont.ciclo[i]],
    [E.porCicloPar.get(cl + '|' + par), E.kCont.ciclopar[i]],
    [E.porCarrera.get(ic + '|' + cl + '|' + par), E.kCont.carrera[i]],
    [E.celda.get(is + '|' + ic + '|' + cl + '|' + par), E.kCont.celda[i]],
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

function avanceDe(E, ic, ciclo) {
  const ck = ic + '' + ciclo;
  const hit = E.cacheAv.get(ck); if (hit) return hit;
  const cl = Math.min(ciclo, E.D.cicloMax);
  const pad = E.avCiclo.get(String(cl)) || E.avGlobal;
  const r = comp(E.avCelda.get(ic + '|' + cl), pad, E.kAvance);
  E.cacheAv.set(ck, r);
  return r;
}

function turnoDe(E, is, ciclo, it) {
  const ck = is + '' + ciclo + '' + it;
  const hit = E.cacheTu.get(ck); if (hit) return hit;
  const cl = Math.min(ciclo, E.D.cicloMax);
  const pad = E.tuSede.get(is + '|' + it);
  let r;
  if (!pad) {                       // turno sin historia en la sede: permanece
    const v = new Array(E.NT).fill(0); v[it] = 1;
    r = [v, 1e6];
  } else {
    r = comp(E.tuCelda.get(is + '|' + cl + '|' + it), pad, E.kTurno);
  }
  E.cacheTu.set(ck, r);
  return r;
}

/**
 * Reparto estimado de los ingresantes por turno.
 * Escalera: global -> sede -> sede·paridad -> sede·carrera -> sede·carrera·par
 * -> celda. Un programa NUEVO, sin historia propia, se detiene en el nivel de
 * sede, que sí la tiene: de ahí hereda su reparto de turno.
 */
function mezclaNuevos(E, is, ic, ciclo, par) {
  const ck = is + '' + ic + '' + ciclo + '' + par;
  const hit = E.cacheNt.get(ck); if (hit) return hit;
  const cl = Math.min(ciclo, E.D.cicloMax);
  const k = E.kNuevos;
  const cadena = [
    E.ntSede.get(String(is)),
    E.ntSedePar.get(is + '|' + par),
    E.ntCar.get(is + '|' + ic),
    E.ntCarPar.get(is + '|' + ic + '|' + par),
    E.ntCelda.get(is + '|' + ic + '|' + cl + '|' + par),
  ];
  let sg = 0; for (const x of E.ntGlobal) sg += x;
  let v = sg > 0 ? E.ntGlobal.map(x => x / sg) : E.ntGlobal.map(() => 1 / E.NT);
  let nef = k, nivel = 'global';
  const nombres = ['sede', 'sede·paridad', 'sede·carrera', 'sede·carrera·paridad', 'celda'];
  cadena.forEach((a, idx) => {
    if (!a) return;
    let s = 0; for (const x of a) s += x;
    if (s <= 0) return;
    const r = comp(a, v, k);
    v = r[0]; nef = r[1]; nivel = nombres[idx];
  });
  const r = [v, nef, nivel];
  E.cacheNt.set(ck, r);
  return r;
}

/* ==========================================================================
   PROYECCIÓN
   ========================================================================== */

/**
 * Proyecta la matrícula periodo a periodo.
 *
 *   stock0   Map periodo -> Map "is|ic|ciclo|it" -> valor  (historia inicial)
 *   nuevos   Map periodo -> Map "is|ic|ciclo"    -> cantidad
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
        const is = +pz[0], ic = +pz[1], ciclo = +pz[2], it = +pz[3];
        let [qq, nq] = tasaQ(E, is, ic, ciclo, parO, L);
        if (shock) {
          const lo = Math.log(qq / (1 - qq)) + shock;
          qq = 1 / (1 + Math.exp(-lo));
        }
        if (qq <= 0) return;
        const [av, na] = avanceDe(E, ic, ciclo);
        const [tt, nt] = turnoDe(E, is, ciclo, it);
        const tope = planPorIc[ic] || D.planDefecto;
        const vx = conVar ? (vr.get(clave) || 0) : 0;
        for (let di = 0; di < ND; di++) {
          if (av[di] <= 0) continue;
          let c2 = ciclo + D.deltas[di];
          if (c2 < 1) c2 = 1;
          if (c2 > tope) c2 = tope;
          for (let ti = 0; ti < NT; ti++) {
            if (tt[ti] <= 0) continue;
            const phi = qq * av[di] * tt[ti];
            const k2 = is + '|' + ic + '|' + c2 + '|' + ti;
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
      const is = +pz[0], ic = +pz[1], ciclo = +pz[2];
      const [mz, nm] = mezclaNuevos(E, is, ic, ciclo, par);
      for (let ti = 0; ti < NT; ti++) {
        if (mz[ti] <= 0) continue;
        const k2 = is + '|' + ic + '|' + ciclo + '|' + ti;
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
