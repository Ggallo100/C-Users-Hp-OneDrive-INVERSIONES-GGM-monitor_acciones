/* ==========================================================================
   ESTADO Y ORQUESTACIÓN
   ========================================================================== */
const S = {
  D: DATOS,
  E: null,
  sedes: DATOS.sedes.slice(),
  carreras: DATOS.carreras.slice(),
  iS: new Map(DATOS.sedes.map((v, i) => [v, i])),
  iC: new Map(DATOS.carreras.map((v, i) => [v, i])),
  iM: new Map(DATOS.modalidades.map((v, i) => [v, i])),
  iT: new Map(DATOS.turnos.map((v, i) => [v, i])),
  planPorIc: DATOS.carreras.map(c => DATOS.planCiclos[c] || DATOS.planDefecto),
  aperturaPorIs: DATOS.sedes.map(s => DATOS.sedeApertura[s] || { enMaduracion: false }),
  carrerasNuevas: new Set(),
  sedesNuevas: new Set(),
  entrada: null,      // { nombre, filas, periodos, avisos }
  proy: null,
};

const ULTIMO = DATOS.periodos[DATOS.periodos.length - 1];

function idxSede(nom) {
  if (S.iS.has(nom)) return S.iS.get(nom);
  const i = S.sedes.length;
  S.sedes.push(nom); S.iS.set(nom, i); S.sedesNuevas.add(nom);
  S.aperturaPorIs[i] = { enMaduracion: false };   // se fija tras leer el archivo
  return i;
}

/** Ciclo máximo que una sede puede ofrecer en un semestre dado. */
function topeCicloSede(is, T) {
  const ap = S.aperturaPorIs[is];
  if (!ap || !ap.enMaduracion) return 1e6;
  // Antes de la apertura el tope sería negativo; 0 expresa que la sede aún no
  // ofrece ningún ciclo, que es lo correcto y además evita ciclos absurdos.
  return Math.max(0, ap.cicloBase + (indicePeriodo(T) - indicePeriodo(ap.inicio)));
}
function idxCarrera(nom, ciclosPlan) {
  if (S.iC.has(nom)) {
    if (ciclosPlan) S.planPorIc[S.iC.get(nom)] = ciclosPlan;
    return S.iC.get(nom);
  }
  const i = S.carreras.length;
  S.carreras.push(nom); S.iC.set(nom, i); S.carrerasNuevas.add(nom);
  S.planPorIc[i] = ciclosPlan || S.D.planDefecto;
  return i;
}

/** Stock histórico observado, punto de partida de la recursión. */
function stockInicial() {
  const m = new Map();
  for (const [ip, is, ic, im, id, ci, it, v] of S.D.stock) {
    const p = S.D.periodos[ip];
    if (!m.has(p)) m.set(p, new Map());
    m.get(p).set(is + '|' + ic + '|' + im + '|' + id + '|' + ci + '|' + it, v);
  }
  return m;
}

/** Ingresantes observados por periodo (para el supuesto de referencia). */
function nuevosObservados() {
  const m = new Map();
  for (const [ip, is, ic, im, ci, v] of S.D.nuevos) {
    const p = S.D.periodos[ip];
    if (!m.has(p)) m.set(p, new Map());
    m.get(p).set(is + '|' + ic + '|' + im + '|' + ci, v);
  }
  return m;
}

/**
 * Supuesto de referencia mientras no se cargue un archivo: se repite el último
 * ingreso observado del semestre de la misma paridad. Es un marcador de
 * posición explícito, no una previsión de admisión.
 */
function nuevosReferencia(periodos) {
  const obs = nuevosObservados();
  const out = new Map();
  for (const T of periodos) {
    let fuente = null;
    for (let i = S.D.periodos.length - 1; i >= 0; i--) {
      if (S.D.periodos[i] % 100 === T % 100) { fuente = S.D.periodos[i]; break; }
    }
    out.set(T, new Map(obs.get(fuente) || []));
  }
  return out;
}

/**
 * Convierte las filas crudas del archivo en ingresantes con modalidad.
 * Las filas que declaran modalidad pasan tal cual; las que no, se reparten
 * entre las tres modalidades con la composición histórica de su sede y carrera
 * (contracción por niveles, igual que el turno). El reparto se resuelve aquí y
 * no al cargar, de modo que responde a los parámetros de recencia del usuario.
 */
function construirNuevos(E, crudo) {
  const out = new Map();
  const detalle = [];
  crudo.forEach((filas, T) => {
    const m = new Map();
    for (const r of filas) {
      if (r.im !== null) {
        const k = r.is + '|' + r.ic + '|' + r.im + '|' + r.ciclo;
        m.set(k, (m.get(k) || 0) + r.cant);
        detalle.push({ T, is: r.is, ic: r.ic, ciclo: r.ciclo, cant: r.cant, declarada: true,
          reparto: S.D.modalidades.map((_, i) => i === r.im ? 1 : 0), nivel: 'declarada' });
      } else {
        const [mz, nef, nivel] = mezclaModalidad(E, r.is, r.ic, r.ciclo, T % 100);
        for (let im = 0; im < S.D.modalidades.length; im++) {
          if (mz[im] <= 0) continue;
          const k = r.is + '|' + r.ic + '|' + im + '|' + r.ciclo;
          m.set(k, (m.get(k) || 0) + r.cant * mz[im]);
        }
        detalle.push({ T, is: r.is, ic: r.ic, ciclo: r.ciclo, cant: r.cant, declarada: false,
          reparto: mz, nivel });
      }
    }
    out.set(T, m);
  });
  S.repartoModalidad = detalle;
  return out;
}

function periodosProyeccion() {
  const n = Math.max(1, Math.min(24, +$('#horizonte').value || 6));
  const out = [];
  for (let i = 1; i <= n; i++) out.push(moverPeriodo(ULTIMO, i));
  return out;
}

/* ---- cálculo principal ---- */
function recalcular() {
  const lam = Math.min(1, Math.max(0.05, +$('#lam').value || S.D.lambdaElegida || 1));
  const lamN = Math.min(1, Math.max(0.05, +$('#lamN').value || 0.3));
  const fk = Math.min(10, Math.max(0.1, +$('#factorK').value || 1));
  const conf = +$('#confianza').value || 0.8;

  S.E = estimar(S.D, lam, lamN, fk);
  S.E.planPorIc = S.planPorIc;
  S.E.apertura = S.aperturaPorIs;
  S.E.nSedes = S.sedes.length;

  const periodos = periodosProyeccion();
  S.repartoModalidad = null;
  const nuevos = S.entrada ? construirNuevos(S.E, S.entrada.mapa) : nuevosReferencia(periodos);
  const stock0 = stockInicial();

  const sigma = S.D.varianza.sigma_logit_choque;
  const gl = Math.max(S.D.varianza.gl_choque, 1);
  const z = cuantilT(0.5 + conf / 2, gl);

  const [cen, varz] = proyectar(S.E, stock0, nuevos, periodos, 0, true);
  const alt = proyectar(S.E, stock0, nuevos, periodos, +z * sigma, false);
  const baj = proyectar(S.E, stock0, nuevos, periodos, -z * sigma, false);

  S.proy = { periodos, cen, alt, baj, varz, nuevos, z, sigma, gl, conf, lam, lamN, fk };
  $('#btExportar').disabled = false;
  pintarTodo();
}

/* ---- agregación ---- */
function descomponer(clave) {
  const p = clave.split('|');
  return { is: +p[0], ic: +p[1], im: +p[2], id: +p[3], ciclo: +p[4], it: +p[5] };
}
function nombreDe(d) {
  return {
    Sede: S.sedes[d.is], Carrera: S.carreras[d.ic],
    Modalidad: S.D.modalidades[d.im], Condición: S.D.condiciones[d.id],
    Ciclo: d.ciclo, Turno: S.D.turnos[d.it],
  };
}
/** Agrega un Map de celdas según una función de clave. */
function agrupar(mapa, keyf) {
  const out = new Map();
  mapa.forEach((v, k) => {
    const kk = keyf(descomponer(k), k);
    if (kk === null) return;
    out.set(kk, (out.get(kk) || 0) + v);
  });
  return out;
}
const sumaMapa = m => { let s = 0; m.forEach(v => s += v); return s; };

/** Ingresantes efectivamente aplicados en un periodo (sin reparto de turno). */
function nuevosDe(T) {
  const m = S.proy.nuevos.get(T);
  return m ? sumaMapa(m) : 0;
}

/* ==========================================================================
   CARGA DEL ARCHIVO DE INGRESANTES
   ========================================================================== */
const ALIAS = {
  periodo: ['periodo', 'semestre', 'periodoacademico', 'semestreacademico', 'periodoreal', 'ciclolectivo'],
  sede: ['sede', 'campus', 'filial', 'local'],
  carrera: ['carrera', 'programa', 'programaacademico', 'escuela', 'escuelaprofesional'],
  ciclo: ['ciclo', 'ciclodeestudios', 'cicloingreso', 'ciclodeingreso', 'ciclomatricula'],
  nuevos: ['nuevos', 'ingresantes', 'cantidad', 'alumnosnuevos', 'estudiantesnuevos', 'matriculanueva', 'n'],
  modalidad: ['modalidad', 'modalidadestudios', 'modalidaddeestudios', 'modalidadacademica',
    'modalidadestudio', 'tipoestudio', 'modelo'],
  plan: ['ciclosplan', 'ciclos', 'duracion', 'ciclostotales', 'planciclos'],
};

/** Reconoce la modalidad escrita de cualquier forma razonable. */
function leerModalidad(txt) {
  const n = norm(txt);
  if (!n) return null;
  const exacto = S.D.modalidades.findIndex(m => norm(m) === n);
  if (exacto >= 0) return exacto;
  if (/adistancia|virtual|remoto|online|enlinea/.test(n)) {
    const i = S.D.modalidades.findIndex(m => /distancia/.test(norm(m)));
    if (i >= 0) return i;
  }
  if (/semi|blended|mixta|mixto|hibrid/.test(n)) {
    const i = S.D.modalidades.findIndex(m => /semi/.test(norm(m)));
    if (i >= 0) return i;
  }
  if (/presencial/.test(n)) {
    const i = S.D.modalidades.findIndex(m => norm(m) === 'presencial');
    if (i >= 0) return i;
  }
  return undefined;      // escrita pero irreconocible
}
const norm = s => String(s == null ? '' : s).trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

function mapearColumnas(cab) {
  const idx = {};
  const n = cab.map(norm);
  for (const [campo, alias] of Object.entries(ALIAS)) {
    for (const a of alias) {
      const i = n.indexOf(a);
      if (i >= 0) { idx[campo] = i; break; }
    }
  }
  return idx;
}

async function cargarArchivo(file) {
  try {
    let tabla;
    if (/\.csv$/i.test(file.name)) tabla = leerCSV(await file.text());
    else tabla = await leerXLSX(await file.arrayBuffer());

    const col = mapearColumnas(tabla.cabecera);
    const faltan = ['periodo', 'sede', 'carrera', 'ciclo', 'nuevos'].filter(c => col[c] === undefined);
    if (faltan.length) {
      throw new Error('Faltan columnas obligatorias: ' + faltan.join(', ') +
        '. Descarga la plantilla para ver el formato esperado.');
    }

    const filas = [], avisos = [], ilegibles = [];
    const periodos = new Set();
    let descartadas = 0;
    tabla.filas.forEach((f, i) => {
      const per = leerPeriodo(f[col.periodo]);
      const sede = String(f[col.sede] || '').trim();
      const carrera = String(f[col.carrera] || '').trim().toUpperCase();
      const ciclo = Math.round(+String(f[col.ciclo]).replace(',', '.'));
      const cant = +String(f[col.nuevos]).replace(/\s/g, '').replace(',', '.');
      const plan = col.plan !== undefined ? Math.round(+f[col.plan]) || 0 : 0;
      const modTxt = col.modalidad !== undefined ? f[col.modalidad] : '';
      if (!isFinite(per) || isNaN(per)) { descartadas++; return; }
      if (!sede || !carrera || !isFinite(ciclo) || ciclo < 1 || !isFinite(cant)) { descartadas++; return; }
      if (cant <= 0) return;
      const im = leerModalidad(modTxt);
      if (im === undefined) ilegibles.push({ fila: i + 2, txt: String(modTxt).trim() });
      filas.push({ fila: i + 2, per, sede, carrera, ciclo, cant, plan, im: im === undefined ? null : im });
      periodos.add(per);
    });
    if (!filas.length) throw new Error('No se pudo leer ninguna fila válida del archivo.');
    if (descartadas) avisos.push({ t: 'aviso', m: descartadas + ' fila(s) descartada(s) por datos incompletos o ilegibles.' });

    // Catálogos: las carreras y sedes desconocidas se incorporan como nuevas
    S.carrerasNuevas.clear(); S.sedesNuevas.clear();
    S.sedes = S.D.sedes.slice(); S.iS = new Map(S.D.sedes.map((v, i) => [v, i]));
    S.carreras = S.D.carreras.slice(); S.iC = new Map(S.D.carreras.map((v, i) => [v, i]));
    S.planPorIc = S.D.carreras.map(c => S.D.planCiclos[c] || S.D.planDefecto);
    S.aperturaPorIs = S.D.sedes.map(sd => S.D.sedeApertura[sd] || { enMaduracion: false });

    // Primera pasada: registrar sedes y carreras para fijar sus índices.
    for (const r of filas) {
      r.is = idxSede(r.sede);
      r.ic = idxCarrera(r.carrera, r.plan);
    }

    /* Apertura de las sedes NUEVAS. Una sede que aparece por primera vez en el
       archivo empieza a operar en ese semestre, así que despliega su plan de
       estudios ciclo a ciclo igual que hizo Lima Norte desde 2026-I. El ciclo
       base es el mayor declarado en su semestre de apertura: normalmente el 1,
       pero si la sede abre admitiendo traslados a ciclos superiores, esos
       ciclos existen desde el arranque. */
    S.sedesNuevas.forEach(nom => {
      const is = S.iS.get(nom);
      const suyas = filas.filter(r => r.is === is);
      const inicio = Math.min.apply(null, suyas.map(r => r.per));
      const cicloBase = Math.max.apply(null, suyas.filter(r => r.per === inicio).map(r => r.ciclo));
      S.aperturaPorIs[is] = { inicio, cicloBase, enMaduracion: true, declarada: true };
    });

    // Segunda pasada: topes de plan y de maduración de sede.
    /* El mapa guarda las filas en crudo, con la modalidad declarada o nula. El
       reparto de las no declaradas se resuelve en cada recálculo, de modo que
       responde a los parámetros de recencia que elija el usuario. */
    const mapa = new Map();
    /* El recorte por maduración se detalla hasta dos veces POR SEDE: si varias
       sedes están en despliegue, una cuota global escondería las últimas
       detrás de las primeras y el aviso perdería su utilidad. */
    const recortes = { plan: 0, sede: 0, porSede: new Map() };
    for (const r of filas) {
      const topePlan = S.planPorIc[r.ic];
      const topeSed = topeCicloSede(r.is, r.per);
      const tope = Math.min(topePlan, topeSed);
      if (r.ciclo > tope) {
        if (topeSed < topePlan) {
          recortes.sede++;
          const vistas = (recortes.porSede.get(r.is) || 0) + 1;
          recortes.porSede.set(r.is, vistas);
          if (vistas <= 2) avisos.push({
            t: 'aviso', m: 'Fila ' + r.fila + ': ' + r.sede + ' no imparte todavía el ciclo ' +
              r.ciclo + ' en ' + rotuloPeriodo(r.per) + ' (inició en ' +
              rotuloPeriodo(S.aperturaPorIs[r.is].inicio) + ', llega hasta el ciclo ' + tope +
              '); esos ' + fmtN(r.cant) + ' ingresantes se asignan al ciclo ' + tope + '.'
          });
        } else {
          recortes.plan++;
          if (recortes.plan <= 3) avisos.push({
            t: 'aviso', m: 'Fila ' + r.fila + ': ciclo ' + r.ciclo + ' supera los ' + tope +
              ' ciclos del plan de ' + r.carrera + '; se ajusta al ciclo ' + tope + '.'
          });
        }
        r.ciclo = tope;
      }
      if (!mapa.has(r.per)) mapa.set(r.per, []);
      mapa.get(r.per).push({ is: r.is, ic: r.ic, im: r.im, ciclo: r.ciclo, cant: r.cant });
    }
    let detalladas = 0;
    recortes.porSede.forEach(n => { detalladas += Math.min(n, 2); });
    if (recortes.sede > detalladas) avisos.push({
      t: 'aviso', m: '… y ' + (recortes.sede - detalladas) + ' fila(s) más recortadas por el ciclo máximo de su sede.'
    });
    if (recortes.plan > 3) avisos.push({
      t: 'aviso', m: '… y ' + (recortes.plan - 3) + ' fila(s) más recortadas por el plan de su carrera.'
    });

    const per = Array.from(periodos).sort((a, b) => a - b);
    const antiguos = per.filter(p => p <= ULTIMO);
    if (antiguos.length) {
      avisos.push({
        t: 'error', m: antiguos.length + ' semestre(s) del archivo (' +
          antiguos.map(rotuloPeriodo).join(', ') + ') son anteriores o iguales al último observado (' +
          rotuloPeriodo(ULTIMO) + '). Esos ingresantes no se proyectan.'
      });
    }
    const sinModalidad = filas.filter(r => r.im === null);
    if (col.modalidad === undefined) {
      avisos.push({
        t: 'aviso', m: 'El archivo no trae columna de modalidad. El modelo reparte cada fila ' +
          'entre Presencial, Semi Presencial y A distancia con la composición histórica de su ' +
          'sede y carrera. Declararla mejora la proyección: la continuación del primer ciclo va ' +
          'del 42 % a distancia al 71 % presencial.'
      });
    } else if (sinModalidad.length) {
      avisos.push({
        t: 'aviso', m: fmtN(sinModalidad.length) + ' fila(s) sin modalidad legible' +
          (ilegibles.length ? ' (p. ej. fila ' + ilegibles[0].fila + ': «' + esc(ilegibles[0].txt) + '»)' : '') +
          '. En esas filas el reparto por modalidad se estima con la composición histórica.'
      });
    }
    if (S.carrerasNuevas.size) {
      avisos.push({
        t: 'aviso', m: 'Programa(s) sin historia en la base: ' +
          Array.from(S.carrerasNuevas).join(', ') + '. El modelo les aplica el comportamiento ' +
          'agregado de su ciclo y sede (contracción al nivel con evidencia).'
      });
    }
    if (S.sedesNuevas.size) {
      avisos.push({
        t: 'aviso', m: 'Sede(s) sin historia en la base: ' + Array.from(S.sedesNuevas).join(', ') +
          '. El reparto por turno se toma de la distribución institucional global y se les aplica ' +
          'el despliegue progresivo del plan desde su semestre de apertura.'
      });
    }

    S.entrada = {
      nombre: file.name, filas, mapa, periodos: per, avisos,
      conModalidad: col.modalidad !== undefined,
      declaradas: filas.filter(r => r.im !== null).length,
      estimadas: sinModalidad.length,
    };

    // El horizonte se ajusta al último semestre presente en el archivo
    const maxPer = per[per.length - 1];
    if (maxPer > ULTIMO) {
      let n = 0, p = ULTIMO;
      while (p < maxPer && n < 24) { p = moverPeriodo(p, 1); n++; }
      $('#horizonte').value = n;
    }
    recalcular();
    brindis('Cargado: ' + filas.length + ' filas · ' + per.length + ' semestres');
  } catch (e) {
    brindis(e.message || 'No se pudo leer el archivo', true);
    console.error(e);
  }
}

/* ==========================================================================
   PLANTILLA DE ENTRADA
   ========================================================================== */
async function descargarPlantilla() {
  const H = c => ({ v: c, e: 1 });
  const T = c => ({ v: c, e: 5 });

  // Semilla: dos semestres siguientes con el ingreso del semestre homólogo
  const obs = nuevosObservados();
  const per = [moverPeriodo(ULTIMO, 1), moverPeriodo(ULTIMO, 2)];
  const filas = [['Periodo', 'Sede', 'Carrera', 'Modalidad', 'Ciclo', 'Nuevos', 'CiclosPlan'].map(H)];
  for (const T2 of per) {
    let fuente = null;
    for (let i = S.D.periodos.length - 1; i >= 0; i--) {
      if (S.D.periodos[i] % 100 === T2 % 100) { fuente = S.D.periodos[i]; break; }
    }
    const m = obs.get(fuente) || new Map();
    const ordenado = Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
    for (const [k, v] of ordenado) {
      const [is, ic, im, ci] = k.split('|').map(Number);
      filas.push([rotuloPeriodo(T2), S.D.sedes[is], S.D.carreras[ic],
        S.D.modalidades[im], ci, v, '']);
    }
  }

  const inst = [
    [T('Plantilla de ingresantes · Modelo de Proyección de Matrícula')],
    [{ v: 'Universidad Autónoma del Perú', e: 0 }],
    [],
    [H('Cómo usar esta plantilla')],
    ['1. Edite la hoja «Ingresantes»: una fila por semestre, sede, carrera y ciclo de ingreso.'],
    ['2. La columna «Nuevos» es la cantidad de estudiantes que INGRESAN (no incluye continuadores).'],
    ['3. NO se declara el turno: el modelo lo estima con la composición histórica de la sede, la carrera y la modalidad.'],
    ['4. Cargue el archivo en el modelo con el botón «Cargar ingresantes».'],
    [],
    [H('Columnas')],
    ['Periodo', 'Obligatoria. Semestre académico: 2027-I, 2027-II (también admite 202701).'],
    ['Sede', 'Obligatoria. Debe coincidir con el catálogo de la hoja «Catálogos» para heredar su patrón de turno.'],
    ['Carrera', 'Obligatoria. Si no figura en el catálogo se trata como PROGRAMA NUEVO.'],
    ['Ciclo', 'Obligatoria. Ciclo al que ingresa el estudiante (1 en la admisión ordinaria; >1 en traslados y convalidaciones).'],
    ['Modalidad', 'Recomendada. Presencial, Semi Presencial o A distancia. Si se omite la columna o la celda, el modelo reparte esa fila entre las tres con la composición histórica de su sede y carrera.'],
    ['Nuevos', 'Obligatoria. Número entero de ingresantes de esa combinación.'],
    ['CiclosPlan', 'Opcional. Ciclos totales del plan de estudios. Sólo hace falta para un programa nuevo cuya duración no sea de ' + S.D.planDefecto + ' ciclos.'],
    [],
    [H('Programas nuevos')],
    ['Escriba el nombre del nuevo programa en «Carrera» y añada sus ingresantes con normalidad.'],
    ['Al no tener historia propia, el modelo le aplica el comportamiento de continuación del ciclo'],
    ['y de la sede correspondientes, e informa de ello en la pestaña «Ingresantes».'],
    ['Si el plan no dura ' + S.D.planDefecto + ' ciclos, indíquelo en «CiclosPlan».'],
    [],
    [H('Por qué conviene declarar la modalidad')],
    ['La modalidad cambia el comportamiento del estudiante de forma muy marcada. En el primer'],
    ['ciclo, la continuación al semestre siguiente va del 42 % en la modalidad a distancia al 71 %'],
    ['en la presencial, con la semipresencial en medio (56 %). También determina casi por completo'],
    ['el turno: a distancia es noche en un 90 %, mientras que presencial es mañana en un 77 %.'],
    ['Si la columna se deja vacía el modelo estima el reparto, pero la composición está en fuerte'],
    ['deriva —a distancia pasó del 4,8 % al 19,6 % de la matrícula— y esa estimación arrastra error.'],
    [],
    [H('El archivo declara sólo ingresantes')],
    ['Los continuadores no se declaran: los genera el modelo. En los resultados aparecen'],
    ['desglosados en tres grupos según cómo llegan al semestre, y ese desglose sale de la propia'],
    ['recursión, no de ningún dato de entrada:'],
    ['  Regulares     se matricularon también el semestre anterior y cambiaron de ciclo.'],
    ['  Recuperados   se matricularon también el semestre anterior, pero vuelven al MISMO ciclo:'],
    ['                perdieron el que cursaban y lo retoman.'],
    ['  Reiniciados   interrumpieron uno o más semestres y volvieron a matricularse.'],
    ['Conviene mirarlos por separado al planificar, porque el riesgo no es el mismo: el'],
    ['reiniciado se cae de la matrícula (continúa el 58 % frente al 86 % de un regular) y el'],
    ['recuperado se queda, pero no avanza (sólo el 57 % cambia de ciclo, y uno de cada cinco'],
    ['repite otra vez), de modo que se acumula en los ciclos bajos.'],
    [],
    [H('Sedes nuevas y maduración')],
    ['Una sede que abre despliega su plan de estudios semestre a semestre: en el de apertura'],
    ['sólo existe el ciclo 1, un semestre después el 2, y así sucesivamente.'],
    ['El modelo aplica ese tope automáticamente y avisa si una fila declara ingresantes en un'],
    ['ciclo que la sede todavía no imparte.'],
    ['Si escribe una sede que no figura en el catálogo, se entiende que abre en el primer'],
    ['semestre en que aparezca en esta hoja.'],
    [],
    [H('Nomenclatura de semestres')],
    ['Último semestre observado en la base', rotuloPeriodo(ULTIMO)],
    ['Primer semestre proyectable', rotuloPeriodo(moverPeriodo(ULTIMO, 1))],
    ['Formato', 'AAAA-I (primer semestre) · AAAA-II (segundo semestre)'],
  ];

  const cat = [['Sedes', 'Turnos observados en la sede', 'Ciclo máximo ofertable'].map(H)];
  S.D.sedes.forEach((s, is) => {
    const ts = new Set();
    S.D.stock.forEach(f => { if (f[1] === is) ts.add(S.D.turnos[f[6]]); });
    const ap = S.D.sedeApertura[s];
    const nota = !ap || !ap.enMaduracion ? 'Plan completo'
      : 'Abrió en ' + rotuloPeriodo(ap.inicio) + ': ciclo ' +
      Math.min(ap.cicloBase + (indicePeriodo(per[0]) - indicePeriodo(ap.inicio)), S.D.cicloMax) +
      ' en ' + rotuloPeriodo(per[0]) + ', +1 por semestre';
    cat.push([s, Array.from(ts).join(' · '), nota]);
  });
  cat.push([]);
  cat.push(['Modalidades'].map(H));
  S.D.modalidades.forEach(m => cat.push([m]));
  cat.push([]);
  cat.push(['Carreras', 'Ciclos del plan', 'Modalidades con historia en la base'].map(H));
  S.D.carreras.forEach((c, ic) => {
    const ms = S.D.modalidades
      .filter((_, im) => S.D.oferta.some(o => o[1] === ic && o[2] === im));
    cat.push([c, S.D.planCiclos[c] || S.D.planDefecto, ms.join(' · ') || '—']);
  });

  const blob = await construirXlsx([
    { nombre: 'Instrucciones', filas: inst, anchos: [46, 86] },
    { nombre: 'Ingresantes', filas, anchos: [11, 13, 52, 17, 8, 10, 12], inmovilizar: 1 },
    { nombre: 'Catálogos', filas: cat, anchos: [52, 30, 46] },
  ]);
  descargar('plantilla_ingresantes_' + hoyISO() + '.xlsx', blob);
  brindis('Plantilla descargada · edite la hoja «Ingresantes»');
}

/* ==========================================================================
   PINTADO
   ========================================================================== */
function pintarTodo() {
  if (!S.proy) return;
  pintarAvisoInicio();
  pintarKpis();
  pintarSerie();
  pintarComposicion();
  pintarPorSede();
  pintarPorModalidad();
  pintarPorCondicion();
  pintarTablaResumen();
  poblarFiltros();
  pintarDetalle();
  pintarIngresantes();
  pintarModelo();
}

function pintarAvisoInicio() {
  const e = $('#avisoInicio');
  if (S.entrada) { e.innerHTML = ''; return; }
  e.innerHTML = '<div class="aviso" style="margin-bottom:14px">' +
    '<b>Supuesto de referencia activo.</b> Todavía no se ha cargado un archivo de ingresantes, ' +
    'así que el modelo repite el último ingreso observado del semestre de la misma paridad ' +
    '(' + rotuloPeriodo(S.D.periodos[S.D.periodos.length - 2]) + ' y ' + rotuloPeriodo(ULTIMO) + '). ' +
    'Es un marcador de posición para explorar el modelo, no una previsión de admisión: ' +
    'descargue la plantilla, complete los ingresantes previstos y cárguela.</div>';
}

function pintarKpis() {
  const P = S.proy;
  const ult = P.periodos[P.periodos.length - 1];
  const cen = sumaMapa(P.cen.get(ult)), alt = sumaMapa(P.alt.get(ult)), baj = sumaMapa(P.baj.get(ult));
  const sd = Math.sqrt(sumaMapa(P.varz.get(ult)));
  const base = S.D.stock.filter(f => f[0] === S.D.periodos.length - 1).reduce((s, f) => s + f[7], 0);
  const primero = P.periodos[0];
  const cen1 = sumaMapa(P.cen.get(primero));
  const nuevos = nuevosDe(ult);
  const D = (a, b) => (b ? (a / b - 1) : 0);

  $('#kpis').innerHTML = [
    ['Matrícula ' + rotuloPeriodo(ULTIMO) + ' (observada)', fmtN(base),
      'Punto de partida de la recursión'],
    ['Matrícula ' + rotuloPeriodo(primero), fmtN(cen1),
      (D(cen1, base) >= 0 ? '▲ ' : '▼ ') + fmtP(Math.abs(D(cen1, base))) + ' frente al último observado'],
    ['Matrícula ' + rotuloPeriodo(ult) + ' · escenario moderado', fmtN(cen),
      'Optimista ' + fmtN(alt) + ' · pesimista ' + fmtN(baj)],
    ['Ingresantes en ' + rotuloPeriodo(ult), fmtN(nuevos),
      'Continuadores ' + fmtN(cen - nuevos) + ' (' + fmtP((cen - nuevos) / Math.max(cen, 1)) + ')'],
    ['Rango de escenarios en ' + rotuloPeriodo(ult), '±' + fmtP((alt - baj) / 2 / Math.max(cen, 1)),
      'Choque sistémico de ±' + fmtD(P.z) + ' σ sobre la continuación'],
    ['Intervalo de predicción ' + fmtP(P.conf), fmtN(cen - P.z * sd) + ' – ' + fmtN(cen + P.z * sd),
      'Añade el azar de realización (±' + fmtN(P.z * sd) + ')'],
    ['Modalidad a distancia en ' + rotuloPeriodo(ult),
      fmtP(sumaMapa(agrupar(P.cen.get(ult), d => S.D.modalidades[d.im] === 'A distancia' ? 'x' : null)) / Math.max(cen, 1)),
      'Observado en ' + rotuloPeriodo(ULTIMO) + ': ' +
      fmtP(S.D.stock.filter(f => f[0] === S.D.periodos.length - 1 &&
        S.D.modalidades[f[3]] === 'A distancia').reduce((s, f) => s + f[7], 0) / Math.max(base, 1))],
  ].map(([et, vl, de]) =>
    '<div class="kpi"><div class="et">' + esc(et) + '</div><div class="vl">' + vl +
    '</div><div class="de">' + de + '</div></div>').join('');
}

function pintarSerie() {
  const P = S.proy;
  const obsPorPer = new Map();
  S.D.stock.forEach(f => {
    const p = S.D.periodos[f[0]];
    obsPorPer.set(p, (obsPorPer.get(p) || 0) + f[7]);
  });
  const datos = [];
  S.D.periodos.forEach(p => datos.push({ et: rotuloPeriodo(p), obs: obsPorPer.get(p) }));
  P.periodos.forEach(T => {
    const c = sumaMapa(P.cen.get(T)), sd = Math.sqrt(sumaMapa(P.varz.get(T)));
    const dSis = (sumaMapa(P.alt.get(T)) - sumaMapa(P.baj.get(T))) / 2;
    const hw = P.z * Math.sqrt(Math.pow(dSis / P.z, 2) + sd * sd);
    datos.push({
      et: rotuloPeriodo(T), proy: true, cen: c,
      alt: sumaMapa(P.alt.get(T)), baj: sumaMapa(P.baj.get(T)),
      ipLo: c - hw, ipHi: c + hw,
    });
  });
  leyenda('#legSerie', [
    { t: 'Observado', c: tok('--s1'), tipo: 'linea' },
    { t: 'Proyección · escenario moderado', c: tok('--s1'), tipo: 'solido' },
    { t: 'Banda de escenarios', c: tok('--s1'), tipo: 'banda', op: 0.2 },
    { t: 'Intervalo de predicción ' + fmtP(P.conf), c: tok('--s1'), tipo: 'banda', op: 0.1 },
  ]);
  graficoSerie('#grSerie', datos);
}

function pintarComposicion() {
  const P = S.proy;
  const et = [], nv = [], co = [];
  P.periodos.forEach(T => {
    const tot = sumaMapa(P.cen.get(T)), n = nuevosDe(T);
    et.push(rotuloPeriodo(T)); nv.push(n); co.push(Math.max(tot - n, 0));
  });
  const series = [
    { t: 'Continuadores', v: co, c: tok('--s1') },
    { t: 'Ingresantes', v: nv, c: tok('--s4') },
  ];
  leyenda('#legComp', series.map(s => ({ t: s.t, c: s.c })));
  graficoApilado('#grComp', et, series);
}

function pintarPorSede() {
  const P = S.proy;
  const et = P.periodos.map(rotuloPeriodo);
  const series = S.sedes.map((nom, is) => ({
    t: nom, c: serieColor(is),
    v: P.periodos.map(T => sumaMapa(agrupar(P.cen.get(T), d => d.is === is ? 'x' : null))),
  })).filter(s => s.v.some(v => v > 0.5));
  leyenda('#legSede', series.map(s => ({ t: s.t, c: s.c })));
  graficoApilado('#grSede', et, series);
}

/**
 * Composición por modalidad. Se muestra junto a la histórica porque la mezcla
 * está en fuerte deriva —la modalidad a distancia pasa del 4,8 % al 19,6 % de
 * la matrícula— y es la variable que más mueve la continuación del primer ciclo.
 */
function pintarPorModalidad() {
  const P = S.proy;
  const obs = new Map();
  S.D.stock.forEach(f => {
    const p = S.D.periodos[f[0]], k = p + '|' + f[3];
    obs.set(k, (obs.get(k) || 0) + f[7]);
  });
  const et = S.D.periodos.map(rotuloPeriodo).concat(P.periodos.map(rotuloPeriodo));
  const series = S.D.modalidades.map((nom, im) => ({
    t: nom, c: serieColor(im),
    v: S.D.periodos.map(p => obs.get(p + '|' + im) || 0)
      .concat(P.periodos.map(T => sumaMapa(agrupar(P.cen.get(T), d => d.im === im ? 'x' : null)))),
  }));
  leyenda('#legModalidad', series.map(s => ({ t: s.t, c: s.c })));
  graficoApilado('#grModalidad', et, series, {
    rotulos: false, alto: 260, desdeProy: S.D.periodos.length,
  });
}

/** Serie apilada de los continuadores por continuidad de la matrícula. */
function pintarPorCondicion() {
  const P = S.proy;
  const obs = new Map();
  S.D.stock.forEach(f => {
    const p = S.D.periodos[f[0]], k = p + '|' + f[4];
    obs.set(k, (obs.get(k) || 0) + f[7]);
  });
  const et = S.D.periodos.map(rotuloPeriodo).concat(P.periodos.map(rotuloPeriodo));
  const series = S.D.condiciones.map((nom, id) => ({
    t: nom, c: serieColor(id),
    v: S.D.periodos.map(p => obs.get(p + '|' + id) || 0)
      .concat(P.periodos.map(T => porCondicion(P.cen.get(T))[id])),
  }));
  leyenda('#legCondicion', series.map(s2 => ({ t: s2.t, c: s2.c })));
  graficoApilado('#grCondicion', et, series, {
    rotulos: false, alto: 260, desdeProy: S.D.periodos.length,
  });
}

/**
 * Reparto de una celda-mapa por condición de llegada. El índice 0 es el
 * ingresante y los tres siguientes son los continuadores: regular, reiniciado
 * y recuperado. Como la condición forma parte de la clave del estado, el desglose
 * es exacto y suma siempre el total.
 */
function porCondicion(mapa) {
  const acc = new Array(S.D.condiciones.length).fill(0);
  if (mapa) mapa.forEach((v, k) => { acc[+k.split('|')[3]] += v; });
  return acc;
}

/** Desglose por condición de la matrícula OBSERVADA de un semestre. */
function porCondicionObs(ip) {
  const acc = new Array(S.D.condiciones.length).fill(0);
  S.D.stock.forEach(x => { if (x[0] === ip) acc[x[4]] += x[7]; });
  return acc;
}

function pintarTablaResumen() {
  const P = S.proy;
  const f = [];
  f.push('<thead><tr><th class="txt" rowspan="2">Semestre</th>' +
    '<th rowspan="2">Ingresantes</th><th colspan="4">Continuadores</th>' +
    '<th rowspan="2">Pesimista</th><th rowspan="2">Moderado</th>' +
    '<th rowspan="2">Optimista</th>' +
    '<th rowspan="2">Intervalo de predicción ' + fmtP(P.conf) + '</th>' +
    '<th rowspan="2">Variación</th></tr>' +
    '<tr><th>Regulares</th><th>Reiniciados</th><th>Recuperados</th>' +
    '<th>Total</th></tr></thead><tbody>');
  const ipUlt = S.D.periodos.length - 1;
  const obs = porCondicionObs(ipUlt);
  let prev = obs.reduce((x, y) => x + y, 0);
  f.push('<tr><td class="txt">' + rotuloPeriodo(ULTIMO) + ' <span class="pastilla">observado</span></td>' +
    '<td>' + fmtN(obs[0]) + '</td><td>' + fmtN(obs[1]) + '</td><td>' + fmtN(obs[2]) +
    '</td><td>' + fmtN(obs[3]) + '</td><td>' + fmtN(prev - obs[0]) +
    '</td><td colspan="3" style="text-align:center">' + fmtN(prev) +
    '</td><td>—</td><td>—</td></tr>');
  P.periodos.forEach(T => {
    const c = sumaMapa(P.cen.get(T)), a = sumaMapa(P.alt.get(T)), b = sumaMapa(P.baj.get(T));
    const sd = Math.sqrt(sumaMapa(P.varz.get(T)));
    const hw = P.z * Math.sqrt(Math.pow((a - b) / 2 / P.z, 2) + sd * sd);
    const d = porCondicion(P.cen.get(T));
    const dv = c / Math.max(prev, 1) - 1;
    f.push('<tr><td class="txt">' + rotuloPeriodo(T) + '</td>' +
      '<td>' + fmtN(d[0]) + '</td><td>' + fmtN(d[1]) + '</td><td>' + fmtN(d[2]) +
      '</td><td>' + fmtN(d[3]) + '</td><td>' + fmtN(c - d[0]) +
      '</td><td>' + fmtN(b) + '</td><td><b>' + fmtN(c) + '</b></td><td>' + fmtN(a) +
      '</td><td>' + fmtN(c - hw) + ' – ' + fmtN(c + hw) + '</td><td>' +
      (dv >= 0 ? '▲ ' : '▼ ') + fmtP(Math.abs(dv)) + '</td></tr>');
    prev = c;
  });
  f.push('</tbody>');
  $('#tbResumen').innerHTML = f.join('');
}

/* ---- detalle ---- */
function poblarFiltros() {
  const P = S.proy;
  const fijar = (sel, ops, todos) => {
    const e = $(sel), antes = e.value;
    e.innerHTML = '<option value="">' + todos + '</option>' +
      ops.map(o => '<option value="' + esc(o.v) + '">' + esc(o.t) + '</option>').join('');
    if (ops.some(o => String(o.v) === antes)) e.value = antes;
  };
  fijar('#fPeriodo', P.periodos.map(p => ({ v: p, t: rotuloPeriodo(p) })), 'Todos los semestres');
  fijar('#fSede', S.sedes.map((s, i) => ({ v: i, t: s })), 'Todas');
  const usadas = new Set();
  P.periodos.forEach(T => P.cen.get(T).forEach((v, k) => { if (v > 0.05) usadas.add(descomponer(k).ic); }));
  fijar('#fCarrera', Array.from(usadas).sort((a, b) => S.carreras[a].localeCompare(S.carreras[b]))
    .map(i => ({ v: i, t: S.carreras[i] + (S.carrerasNuevas.has(S.carreras[i]) ? ' (nuevo)' : '') })), 'Todas');
  fijar('#fModalidad', S.D.modalidades.map((m, i) => ({ v: i, t: m })), 'Todas');
  fijar('#fCondicion', S.D.condiciones.map((c, i) => ({ v: i, t: c })), 'Todas');
  fijar('#fTurno', S.D.turnos.map((t, i) => ({ v: i, t })), 'Todos');
}

function filtroActivo() {
  const g = s => { const v = $(s).value; return v === '' ? null : +v; };
  return { per: g('#fPeriodo'), is: g('#fSede'), ic: g('#fCarrera'),
           im: g('#fModalidad'), id: g('#fCondicion'), it: g('#fTurno') };
}

function celdasFiltradas(escenario) {
  const P = S.proy;
  const fa = filtroActivo();
  const esc2 = escenario || $('#escenarioVista').value;
  const fuente = esc2 === 'alt' ? P.alt : esc2 === 'baj' ? P.baj : P.cen;
  const out = [];
  P.periodos.forEach(T => {
    if (fa.per !== null && T !== fa.per) return;
    fuente.get(T).forEach((v, k) => {
      if (v < 0.005) return;
      const d = descomponer(k);
      if (fa.is !== null && d.is !== fa.is) return;
      if (fa.ic !== null && d.ic !== fa.ic) return;
      if (fa.im !== null && d.im !== fa.im) return;
      if (fa.id !== null && d.id !== fa.id) return;
      if (fa.it !== null && d.it !== fa.it) return;
      out.push({ T, k, v, d, sd: Math.sqrt(P.varz.get(T).get(k) || 0) });
    });
  });
  return out;
}

const VALOR_DIM = {
  Sede: d => S.sedes[d.is], Carrera: d => S.carreras[d.ic],
  Modalidad: d => S.D.modalidades[d.im],
  Condición: d => S.D.condiciones[d.id],
  Ciclo: d => d.ciclo, Turno: d => S.D.turnos[d.it],
};
/* La condición se ordena por el orden natural del catálogo —ingresante,
   regular, reiniciado, recuperado— y no alfabéticamente. */
const ORDEN_DIM = { Condición: d => d.id };
function etiquetaDim(dim, c) {
  if (dim === 'Periodo') return rotuloPeriodo(c.T);
  if (dim === 'Ciclo') return 'Ciclo ' + c.d.ciclo;
  return VALOR_DIM[dim](c.d);
}
function ordenDim(dim, c) {
  if (dim === 'Periodo') return c.T;
  if (dim === 'Ciclo') return c.d.ciclo;
  if (ORDEN_DIM[dim]) return ORDEN_DIM[dim](c.d);
  return etiquetaDim(dim, c);
}

function pintarDetalle() {
  const celdas = celdasFiltradas();
  const dimF = $('#fFila').value, dimC = $('#fCol').value;
  const escNom = { alt: 'optimista', cen: 'moderado', baj: 'pesimista' }[$('#escenarioVista').value];
  $('#subDetalle').textContent = 'escenario ' + escNom + ' · ' + fmtN(celdas.reduce((s, c) => s + c.v, 0)) + ' matriculados';

  const filas = new Map(), cols = new Map(), datos = new Map();
  celdas.forEach(c => {
    const kf = etiquetaDim(dimF, c);
    filas.set(kf, ordenDim(dimF, c));
    const kc = dimC ? etiquetaDim(dimC, c) : 'Total';
    if (dimC) cols.set(kc, ordenDim(dimC, c));
    datos.set(kf + ' ' + kc, (datos.get(kf + ' ' + kc) || 0) + c.v);
  });
  const ordenar = m => Array.from(m.entries()).sort((a, b) =>
    typeof a[1] === 'number' ? a[1] - b[1] : String(a[1]).localeCompare(String(b[1]))).map(e => e[0]);
  const lf = ordenar(filas);
  const lc = dimC ? ordenar(cols) : ['Total'];

  const h = ['<thead><tr><th class="txt">' + esc(dimF) + '</th>' +
    lc.map(c => '<th>' + esc(c) + '</th>').join('') + '<th>Total</th></tr></thead><tbody>'];
  const totCol = new Array(lc.length).fill(0);
  lf.forEach(f => {
    let tf = 0;
    const tds = lc.map((c, i) => {
      const v = datos.get(f + ' ' + c) || 0;
      tf += v; totCol[i] += v;
      return '<td>' + (v > 0.005 ? fmtN(v) : '<span class="mini">·</span>') + '</td>';
    });
    h.push('<tr><td class="txt">' + esc(f) + '</td>' + tds.join('') + '<td><b>' + fmtN(tf) + '</b></td></tr>');
  });
  h.push('<tr class="tot"><td class="txt">Total</td>' +
    totCol.map(v => '<td>' + fmtN(v) + '</td>').join('') +
    '<td>' + fmtN(totCol.reduce((a, b) => a + b, 0)) + '</td></tr></tbody>');
  $('#tbDetalle').innerHTML = h.join('');

  // Detalle por celda
  const top = celdas.slice().sort((a, b) => b.v - a.v).slice(0, 300);
  const g = ['<thead><tr><th class="txt">Semestre</th><th class="txt">Sede</th><th class="txt">Carrera</th>' +
    '<th class="txt">Modalidad</th><th>Ciclo</th><th class="txt">Turno</th>' +
    '<th>Matriculados</th><th>Precisión ±</th></tr></thead><tbody>'];
  top.forEach(c => {
    const nb = nombreDe(c.d);
    g.push('<tr><td class="txt">' + rotuloPeriodo(c.T) + '</td><td class="txt">' + esc(nb.Sede) +
      '</td><td class="txt">' + esc(nb.Carrera) +
      (S.carrerasNuevas.has(nb.Carrera) ? ' <span class="pastilla nueva">nuevo</span>' : '') +
      '</td><td class="txt">' + esc(nb.Modalidad) +
      '</td><td>' + nb.Ciclo + '</td><td class="txt">' + esc(nb.Turno) + '</td><td><b>' + fmtN(c.v) +
      '</b></td><td class="mini">' + fmtN(S.proy.z * c.sd) + '</td></tr>');
  });
  g.push('</tbody>');
  $('#tbCeldas').innerHTML = g.join('');
}

/* ---- ingresantes ---- */
function pintarIngresantes() {
  const P = S.proy;
  const e = $('#estadoArchivo');
  if (S.entrada) {
    const av = S.entrada.avisos.map(a =>
      '<div class="aviso ' + (a.t === 'error' ? 'err' : '') + '" style="margin-top:8px">' + esc(a.m) + '</div>').join('');
    e.innerHTML = '<dl class="par"><dt>Archivo</dt><dd style="text-align:left">' + esc(S.entrada.nombre) + '</dd>' +
      '<dt>Filas válidas</dt><dd>' + fmtN(S.entrada.filas.length) + '</dd>' +
      '<dt>Semestres declarados</dt><dd style="text-align:left">' + S.entrada.periodos.map(rotuloPeriodo).join(', ') + '</dd>' +
      '<dt>Total de ingresantes</dt><dd>' + fmtN(S.entrada.filas.reduce((s, f) => s + f.cant, 0)) + '</dd>' +
      '<dt>Modalidad</dt><dd style="text-align:left">' +
      (S.entrada.conModalidad
        ? fmtN(S.entrada.declaradas) + ' fila(s) declarada(s)' +
          (S.entrada.estimadas ? ' · ' + fmtN(S.entrada.estimadas) + ' estimada(s)' : '')
        : 'no declarada: se estima en todas las filas') + '</dd>' +
      '<dt>Programas nuevos</dt><dd>' + (S.carrerasNuevas.size || '—') + '</dd></dl>' + av;
  } else {
    e.innerHTML = '<div class="vacio">' +
      '<svg viewBox="0 0 24 24"><path d="M14 3v5h5"/><path d="M19 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h9l6 6v11a1 1 0 0 1-1 1z"/></svg>' +
      '<div>Sin archivo cargado. El modelo está usando el supuesto de referencia.<br>' +
      'Descargue la plantilla, complete los ingresantes previstos y cárguela.</div></div>';
  }

  // Reparto estimado por turno
  const filas = [];
  P.periodos.forEach(T => {
    const m = P.nuevos.get(T);
    if (!m) return;
    m.forEach((cant, k) => {
      const [is, ic, im, ci] = k.split('|').map(Number);
      const [mz, nef, nivel] = mezclaNuevos(S.E, is, ic, im, ci, T % 100);
      filas.push({ T, is, ic, im, ci, cant, mz, nivel });
    });
  });
  filas.sort((a, b) => a.T - b.T || b.cant - a.cant);
  const h = ['<thead><tr><th class="txt">Semestre</th><th class="txt">Sede</th><th class="txt">Carrera</th>' +
    '<th class="txt">Modalidad</th><th>Ciclo</th><th>Nuevos</th>' +
    S.D.turnos.map(t => '<th>' + esc(t) + '</th>').join('') +
    '<th class="txt">Nivel usado</th></tr></thead><tbody>'];
  filas.slice(0, 400).forEach(f => {
    h.push('<tr><td class="txt">' + rotuloPeriodo(f.T) + '</td><td class="txt">' + esc(S.sedes[f.is]) +
      '</td><td class="txt">' + esc(S.carreras[f.ic]) +
      (S.carrerasNuevas.has(S.carreras[f.ic]) ? ' <span class="pastilla nueva">nuevo</span>' : '') +
      '</td><td class="txt">' + esc(S.D.modalidades[f.im]) +
      '</td><td>' + f.ci + '</td><td><b>' + fmtD(f.cant) + '</b></td>' +
      f.mz.map(p => '<td>' + fmtD(f.cant * p) + ' <span class="mini">(' + fmtP(p) + ')</span></td>').join('') +
      '<td class="txt mini">' + esc(f.nivel) + '</td></tr>');
  });
  if (filas.length > 400) h.push('<tr><td colspan="' + (7 + S.D.turnos.length) +
    '" class="mini">… y ' + fmtN(filas.length - 400) + ' filas más (todas en la exportación).</td></tr>');
  h.push('</tbody>');
  $('#tbIngresantes').innerHTML = h.join('');

  pintarRepartoModalidad();
}

/**
 * Continuación por ciclo y modalidad. Se dibuja como líneas y no como barras
 * agrupadas porque el ciclo es ordinal y lo que hay que leer es la forma de las
 * tres curvas: arrancan muy separadas y convergen a partir del tercer ciclo.
 */
/** Ciclos con evidencia, para el eje de las fichas de dimensión. */
function ciclosConDatos() {
  const out = [];
  for (let ci = 1; ci <= S.D.cicloMax; ci++) {
    const a = S.E.porCiclo.get(String(ci));
    if (a && a[0] > 0) out.push(ci);
  }
  return out;
}

/**
 * Ficha de una dimensión del estado: continuación por ciclo de cada categoría
 * y cuadro comparado. Recibe ya agregadas la tabla de continuación —indexada
 * por categoría|ciclo|paridad— y la de avance —por categoría|ciclo—, de modo
 * que sirve igual para la modalidad y para la condición.
 */
function fichaDimension(cfg) {
  const ciclos = ciclosConDatos();
  const LAG = S.E.LAG;
  /* Por debajo de este tamaño muestral efectivo la tasa de una celda es ruido:
     una categoría con tres observaciones en el ciclo 11 dibujaría un punto que
     no significa nada. Se deja en blanco en vez de en cero. */
  const MIN_N = 20;
  const tasa = (i, cis) => {
    let n = 0, k = 0;
    for (const ci of cis) for (const pa of [1, 2]) {
      const a = cfg.cont.get(i + '|' + ci + '|' + pa);
      if (a) { n += a[0]; k += a[LAG]; }
    }
    return n >= MIN_N ? k / n : null;
  };
  const series = cfg.categorias.map((nom, i) => ({
    t: nom, c: serieColor(i),
    v: ciclos.map(ci => { const r = tasa(i, [ci]); return r === null ? null : r * 100; }),
  }));
  leyenda(cfg.leyenda, series.map(s2 => ({ t: s2.t, c: s2.c })));
  graficoLineas(cfg.lienzo, ciclos.map(String), series, {
    alto: 260, fmtEje: v => fmtN(v) + ' %', tope100: true, sinRotulos: cfg.sinRotulos,
  });

  const iMas1 = S.D.deltas.indexOf(1), iCero = S.D.deltas.indexOf(0);
  const h = ['<thead><tr><th class="txt">' + esc(cfg.titulo) + '</th><th>Matrícula ' +
    rotuloPeriodo(ULTIMO) + '</th><th>Continuación ciclo 1</th>' +
    '<th>Continuación ciclos 2-9</th><th>Avanza un ciclo</th>' +
    '<th>Repite ciclo</th></tr></thead><tbody>'];
  cfg.categorias.forEach((nom, i) => {
    const mat = S.D.stock.filter(f => f[0] === S.D.periodos.length - 1 && f[cfg.col] === i)
      .reduce((a, f) => a + f[7], 0);
    const c1 = tasa(i, [1]);
    const c29 = tasa(i, [2, 3, 4, 5, 6, 7, 8, 9]);
    const acc = new Array(S.E.ND).fill(0);
    for (let ci = 1; ci <= S.D.cicloMax; ci++) {
      const a = cfg.avance.get(i + '|' + ci);
      if (a) for (let j = 0; j < S.E.ND; j++) acc[j] += a[j];
    }
    const sa = acc.reduce((x, y) => x + y, 0);
    h.push('<tr><td class="txt"><i class="pin" style="background:' + serieColor(i) +
      '"></i>' + esc(nom) + '</td><td>' + fmtN(mat) + '</td><td>' +
      (c1 == null ? '—' : fmtP(c1)) + '</td><td>' + (c29 == null ? '—' : fmtP(c29)) +
      '</td><td>' + (sa ? fmtP(acc[iMas1] / sa) : '—') + '</td><td>' +
      (sa ? fmtP(acc[iCero] / sa) : '—') + '</td></tr>');
  });
  h.push('</tbody>');
  $(cfg.tablaHtml).innerHTML = h.join('');
}

/**
 * Reagrega un mapa de conteos quedándose con algunas posiciones de la clave.
 * Las tablas del motor llevan modalidad Y condición, así que la ficha de cada
 * dimensión tiene que sumar sobre la otra antes de dibujar.
 */
function reagrupar(mapa, posiciones) {
  const out = new Map();
  mapa.forEach((v, k) => {
    const z = k.split('|');
    const nk = posiciones.map(i => z[i]).join('|');
    let a = out.get(nk);
    if (!a) { a = new Array(v.length).fill(0); out.set(nk, a); }
    for (let i = 0; i < v.length; i++) a[i] += v[i];
  });
  return out;
}

function pintarModalidadModelo() {
  fichaDimension({
    titulo: 'Modalidad', categorias: S.D.modalidades, col: 3,
    cont: reagrupar(S.E.porModa, [0, 2, 3]),   // im|id|ciclo|par -> im|ciclo|par
    avance: reagrupar(S.E.avModa, [0, 2]),     // im|id|ciclo     -> im|ciclo
    leyenda: '#legContMod', lienzo: '#grContMod', tablaHtml: '#tbModalidad',
  });
}

function pintarCondicionModelo() {
  fichaDimension({
    titulo: 'Condición', categorias: S.D.condiciones, col: 4,
    cont: S.E.porCond,                          // ya es id|ciclo|par
    avance: S.E.avCond,                         // ya es id|ciclo
    leyenda: '#legContCond', lienzo: '#grContCond', tablaHtml: '#tbCondicion',
    sinRotulos: true,   // cuatro series que arrancan juntas: la leyenda basta
  });
}

/**
 * Tabla de maduración: para cada sede, el ciclo máximo que puede ofrecer en
 * cada semestre proyectado. Las sedes consolidadas muestran el plan completo.
 */
function pintarMaduracion() {
  const P = S.proy;
  const h = ['<thead><tr><th class="txt">Sede</th><th class="txt">Apertura</th>' +
    '<th class="txt">Origen</th>' +
    P.periodos.slice(0, 10).map(T => '<th>' + rotuloPeriodo(T) + '</th>').join('') +
    '</tr></thead><tbody>'];
  S.sedes.forEach((nom, is) => {
    const ap = S.aperturaPorIs[is];
    const enMad = ap && ap.enMaduracion;
    const origen = !enMad ? 'Sede consolidada'
      : ap.declarada ? 'Declarada en el archivo' : 'Inferida del histórico';
    h.push('<tr><td class="txt">' + esc(nom) +
      (S.sedesNuevas.has(nom) ? ' <span class="pastilla nueva">nueva</span>' : '') +
      '</td><td class="txt">' + (enMad ? rotuloPeriodo(ap.inicio) + ' · ciclo ' + ap.cicloBase : '—') +
      '</td><td class="txt mini">' + origen + '</td>' +
      P.periodos.slice(0, 10).map(T => {
        const t = topeCicloSede(is, T);
        if (t >= 1e5) return '<td class="mini">sin tope</td>';
        if (t <= 0) return '<td class="mini">no opera</td>';
        const tapa = Math.min(t, S.D.cicloMax);
        return '<td' + (t <= S.D.cicloMax ? ' style="font-weight:650"' : '') + '>' + tapa + '</td>';
      }).join('') + '</tr>');
  });
  h.push('</tbody>');
  $('#tbMaduracion').innerHTML = h.join('');
}

/**
 * Reparto por modalidad de las filas del archivo que no la declaran. Si el
 * archivo la trae completa la tarjeta se oculta, porque no hay nada que estimar.
 */
function pintarRepartoModalidad() {
  const cont = $('#tjModalidadNuevos');
  const det = (S.repartoModalidad || []).filter(d => !d.declarada);
  if (!det.length) {
    cont.style.display = 'none';
    return;
  }
  cont.style.display = '';
  det.sort((a, b) => a.T - b.T || b.cant - a.cant);
  const h = ['<thead><tr><th class="txt">Semestre</th><th class="txt">Sede</th>' +
    '<th class="txt">Carrera</th><th>Ciclo</th><th>Nuevos</th>' +
    S.D.modalidades.map(m => '<th>' + esc(m) + '</th>').join('') +
    '<th class="txt">Nivel usado</th></tr></thead><tbody>'];
  det.slice(0, 300).forEach(d => {
    h.push('<tr><td class="txt">' + rotuloPeriodo(d.T) + '</td><td class="txt">' + esc(S.sedes[d.is]) +
      '</td><td class="txt">' + esc(S.carreras[d.ic]) + '</td><td>' + d.ciclo +
      '</td><td><b>' + fmtN(d.cant) + '</b></td>' +
      d.reparto.map(p => '<td>' + fmtD(d.cant * p) + ' <span class="mini">(' + fmtP(p) + ')</span></td>').join('') +
      '<td class="txt mini">' + esc(d.nivel) + '</td></tr>');
  });
  if (det.length > 300) h.push('<tr><td colspan="' + (6 + S.D.modalidades.length) +
    '" class="mini">… y ' + fmtN(det.length - 300) + ' filas más.</td></tr>');
  h.push('</tbody>');
  $('#tbModalidadNuevos').innerHTML = h.join('');
}

/* ---- modelo y validación ---- */
function pintarModelo() {
  const P = S.proy, V = S.D.varianza, VA = S.D.validacion;

  $('#ecuacion').innerHTML =
    'M(T, s, c, m, k, u)  =  N(T, s, c, m, k, u)\n' +
    '                     +  Σ<sub>L=1..' + S.D.lagMax + '</sub> Σ<sub>k\', u\'</sub> ' +
    'M(T−L, s, c, m, k\', u\') · q<sub>L</sub>(s,c,m,k\',p\') · A(k\'→k | c,m,k\') · U(u\'→u | s,m,k\')\n\n' +
    '  M  matrícula      N  ingresantes del archivo      T  semestre      s  sede\n' +
    '  c  carrera        m  modalidad    k  ciclo        u  turno\n' +
    '  p  paridad del semestre (I ó II)\n' +
    '  q<sub>L</sub> continuación con rezago L    A  avance de ciclo    U  transición de turno\n\n' +
    'La sede, la carrera y la modalidad se conservan: no aparecen primadas en el flujo.';

  const kk = S.E.kCont;
  $('#parModelo').innerHTML = [
    ['Registros del histórico', fmtN(S.D.meta.registros)],
    ['Estudiantes distintos', fmtN(S.D.meta.estudiantes)],
    ['Transiciones observadas', fmtN(S.D.meta.transiciones)],
    ['Semestres en la base', S.D.periodos.length + ' (' + rotuloPeriodo(S.D.periodos[0]) + ' – ' + rotuloPeriodo(ULTIMO) + ')'],
    ['Rezago máximo modelado', S.D.lagMax + ' semestres'],
    ['Ponderación de recencia λ', fmtD(P.lam) + ' (semivida ' + fmtD(Math.log(0.5) / Math.log(P.lam)) + ' semestres)'],
    ['λ del reparto de turno', fmtD(P.lamN)],
    ['k de contracción (celda · carrera · modalidad · ciclo·par · ciclo)',
      [kk.celda[0], kk.carrera[0], kk.moda[0], kk.ciclopar[0], kk.ciclo[0]].map(x => fmtD(x)).join(' · ')],
    ['k de avance · turno · turno de nuevos · modalidad de nuevos',
      [S.E.kAvance, S.E.kTurno, S.E.kNuevos, S.E.kModalidad].map(x => fmtD(x)).join(' · ')],
    ['Modalidades', S.D.modalidades.join(' · ')],
    ['Continuación global por rezago', S.E.contGlobal.map(x => fmtP2(x)).join(' · ')],
  ].map(([a, b]) => '<dt>' + esc(a) + '</dt><dd>' + b + '</dd>').join('');

  // Modalidad de estudios
  pintarModalidadModelo();
  pintarCondicionModelo();

  // Maduración de sede
  pintarMaduracion();

  // Continuación por ciclo
  const dCont = [];
  for (let ci = 1; ci <= S.D.cicloMax; ci++) {
    const a = S.E.porCiclo.get(String(ci));
    if (!a || a[0] <= 0) continue;
    const term = S.carreras.some((c, i) => (S.planPorIc[i] || 10) === ci);
    dCont.push({
      et: String(ci), etLargo: 'Ciclo ' + ci, v: a[S.E.LAG] / a[0],
      c: term ? tok('--s2') : tok('--s1'),
      sub: 'n = ' + fmtN(a[0]) + (term ? ' · ciclo terminal de algún plan' : ''),
    });
  }
  leyenda('#legCont', [
    { t: 'Ciclo intermedio', c: tok('--s1') },
    { t: 'Ciclo terminal de algún plan (egreso)', c: tok('--s2') },
  ]);
  graficoBarras('#grCont', dCont, {
    fmtRot: v => fmtP(v), fmtEje: v => fmtP(v), alto: 250, tope1: true,
  });

  // Avance de ciclo
  const av = S.E.avGlobal, sav = av.reduce((a, b) => a + b, 0);
  graficoBarras('#grAvance', S.D.deltas.map((d, i) => ({
    et: (d > 0 ? '+' : '') + d, etLargo: d === 0 ? 'Repite ciclo' :
      d === 1 ? 'Avanza un ciclo' : d < 0 ? 'Retrocede' : 'Avanza ' + d + ' ciclos',
    v: av[i] / sav,
  })), { fmtRot: v => fmtP(v), fmtEje: v => fmtP(v), alto: 250, color: tok('--s3'), tope1: true });

  // Matriz de turno
  const h = ['<thead><tr><th class="txt">Sede · modalidad · turno de origen</th>' +
    S.D.turnos.map(t => '<th>' + esc(t) + '</th>').join('') + '<th>n</th></tr></thead><tbody>'];
  S.D.sedes.forEach((sd, is) => {
    S.D.modalidades.forEach((md, im) => {
      S.D.turnos.forEach((t0, it) => {
        const a = S.E.tuModa.get(is + '|' + im + '|' + it);
        if (!a) return;
        const s = a.reduce((x, y) => x + y, 0);
        if (s <= 0.5) return;
        h.push('<tr><td class="txt">' + esc(sd) + ' · ' + esc(md) + ' · ' + esc(t0) + '</td>' +
          a.map((v, j) => '<td' + (j === it ? ' style="font-weight:680"' : '') + '>' +
            (v / s > 0.0005 ? fmtP(v / s) : '<span class="mini">·</span>') + '</td>').join('') +
          '<td class="mini">' + fmtN(s) + '</td></tr>');
      });
    });
  });
  h.push('</tbody>');
  $('#tbTurno').innerHTML = h.join('');

  // Efectos de periodo
  const ef = V.efectos_periodo;
  graficoBarras('#grPeriodo', Object.keys(ef).sort().map(p => ({
    et: rotuloPeriodo(p), v: ef[p],
    c: ef[p] >= 0 ? tok('--s3') : tok('--s2'),
    sub: 'efecto en logit',
  })), { fmtRot: v => (v >= 0 ? '+' : '') + nf2.format(v), fmtEje: v => nf2.format(v), alto: 250 });

  $('#kpiVar').innerHTML = [
    ['σ del choque de periodo (logit)', nf2.format(V.sigma_logit_choque),
      'grados de libertad: ' + V.gl_choque],
    ['Efecto estacional (logit)', (V.estacional_logit['1'] >= 0 ? '+' : '') + nf2.format(V.estacional_logit['1']),
      'semestre I frente a la media'],
    ['Contraste del bloque de periodo', 'χ² = ' + fmtD(V.lr_periodo),
      V.gl_lr + ' g.l. · p = ' + (V.p_periodo < 1e-6 ? V.p_periodo.toExponential(1) : nf2.format(V.p_periodo))],
    ['Varianza observada de la tasa', V.var_observada.toExponential(2), 'entre semestres'],
    ['… atribuible al muestreo', V.var_muestral.toExponential(2),
      fmtP(V.var_muestral / V.var_observada) + ' del total'],
    ['… atribuible al proceso', V.var_proceso.toExponential(2),
      fmtP(V.var_proceso / V.var_observada) + ' del total'],
  ].map(([et, vl, de]) => '<div class="kpi"><div class="et">' + esc(et) + '</div><div class="vl" style="font-size:20px">' +
    vl + '</div><div class="de">' + esc(de) + '</div></div>').join('');

  $('#formulaBanda').innerHTML =
    'semiamplitud(A) = z · √( D<sub>A</sub>²  +  V<sub>A</sub> )\n\n' +
    '  D<sub>A</sub>  efecto sobre el agregado A de un choque de un σ en la continuación.\n' +
    '        Es común a todas las celdas: al agregar se suma LINEALMENTE.\n' +
    '  V<sub>A</sub>  varianza independiente (realización multinomial + error de parámetro\n' +
    '        + varianza propagada del stock). Al agregar se suma en CUADRATURA,\n' +
    '        por eso se diluye en los totales y domina en las celdas pequeñas.\n' +
    '  z   cuantil t de Student con ' + V.gl_choque + ' g.l.  →  ' + fmtD(P.z) +
    ' para una confianza del ' + fmtP(P.conf) + '\n\n' +
    'Los tres ESCENARIOS usan sólo D (son estados coherentes y aditivos: el total de\n' +
    'cada escenario es la suma de sus celdas). El INTERVALO DE PREDICCIÓN usa D y V.';

  // Validación
  const niveles = Object.keys(VA.epap);
  const hs = Object.keys(VA.epap[niveles[0]]).sort();
  const tabla = (obj, fmt) => {
    const g = ['<thead><tr><th class="txt">Nivel</th>' +
      hs.map(x => '<th>h = ' + x + '</th>').join('') + '</tr></thead><tbody>'];
    niveles.forEach(n => {
      g.push('<tr><td class="txt">' + esc(n) + '</td>' +
        hs.map(x => '<td>' + fmt(obj[n][x]) + '</td>').join('') + '</tr>');
    });
    g.push('</tbody>');
    return g.join('');
  };
  $('#tbEpap').innerHTML = tabla(VA.epap, v => v == null ? '—' : fmtD(v * 100));
  $('#tbCob').innerHTML = tabla(VA.cobertura, v => v == null ? '—' : fmtD(v * 100));

  $('#lecturaValidacion').innerHTML =
    '<b>Lectura.</b> Con ' + VA.origenes + ' orígenes de reestimación y ' + VA.puntos +
    ' comparaciones, el error del total institucional a un semestre vista es del <b>' +
    fmtD(VA.epap.Total['1'] * 100) + ' %</b>. El error crece al desagregar porque las celdas ' +
    'son cada vez más pequeñas: en el cruce completo sede×carrera×ciclo×turno muchas celdas ' +
    'tienen menos de diez estudiantes y una unidad de diferencia ya pesa mucho en términos ' +
    'relativos. La cobertura del intervalo nominal del ' + fmtP(S.D.escenarios.nivelConfianza) +
    ' se obtuvo con un factor de inflación de varianza κ = ' + fmtD(S.D.escenarios.kappa) +
    ': la descomposición reproduce la dispersión observada fuera de muestra sin necesidad de ' +
    'ensanchar el intervalo a mano. El sesgo medio del total es de <b>' + fmtN(VA.sesgoMedio) +
    '</b> estudiantes, que baja a <b>' + fmtN(VA.sesgoSin2602) + '</b> al excluir ' +
    rotuloPeriodo(ULTIMO) + ', cuya matrícula aún estaba abierta en la fecha de extracción.';

  // Curva de selección de λ
  const G = S.D.gridLambda;
  if (G && G.length) {
    const et = G.map(g => nf2.format(g.lam));
    /* Los tres niveles tienen errores de magnitud muy distinta (2 % frente a
       11 %). Sobre un eje común las curvas quedarían aplastadas y no se vería
       dónde está el mínimo de cada una, que es justo lo que este gráfico debe
       mostrar. Se indexa cada serie a su propio mínimo: 100 = mejor λ de esa
       serie. Un solo eje, y la forma de las tres curvas es comparable. */
    const crudo = [
      { t: 'Total', c: tok('--s1'), v: G.map(g => g.total) },
      { t: 'Sede × carrera', c: tok('--s2'), v: G.map(g => g.sc) },
      { t: 'Sede × carrera × ciclo', c: tok('--s3'), v: G.map(g => g.sci) },
      /* el rótulo directo va al arranque de la curva, donde hay sitio */
    ];
    const series = crudo.map(s2 => {
      const min = Math.min.apply(null, s2.v);
      return { t: s2.t, c: s2.c, v: s2.v.map(x => x / min * 100) };
    });
    leyenda('#legLambda', crudo.map(s2 => ({
      t: s2.t + ' (mejor EPAP ' + fmtD(Math.min.apply(null, s2.v) * 100) + ' %)', c: s2.c,
    })));
    const marcar = G.findIndex(g => Math.abs(g.lam - S.D.lambdaElegida) < 1e-9);
    graficoLineas('#grLambda', et, series, {
      alto: 250, fmtEje: v => nf0.format(v), marcar: marcar >= 0 ? marcar : null,
    });
  }
}

/* ==========================================================================
   ARRANQUE
   ========================================================================== */
function actualizarPistas() {
  const ps = periodosProyeccion();
  $('#pistaHorizonte').textContent = ps.length
    ? rotuloPeriodo(ps[0]) + ' → ' + rotuloPeriodo(ps[ps.length - 1]) : '';
  const conf = +$('#confianza').value;
  const gl = Math.max(S.D.varianza.gl_choque, 1);
  $('#pistaConf').textContent = 'z = ' + fmtD(cuantilT(0.5 + conf / 2, gl)) + ' (t, ' + gl + ' g.l.)';
}

function cambiarPagina(id) {
  $$('#pestanas button').forEach(b => b.classList.toggle('on', b.dataset.pg === id));
  $$('.pagina').forEach(p => p.classList.toggle('on', p.id === 'pg-' + id));
  requestAnimationFrame(pintarTodo);
}

function iniciar() {
  try {
    const t = localStorage.getItem('tema-proyeccion');
    if (t) document.documentElement.dataset.tema = t;
  } catch (e) { }

  /* Los valores por defecto de recencia salen de la propia estimación, no del
     marcado: así no pueden quedarse desfasados cuando la rejilla elige otra λ
     al regenerar el modelo con una base actualizada. */
  if (DATOS.lambdaElegida) $('#lam').value = DATOS.lambdaElegida;
  if (DATOS.lambdaNuevosElegida) $('#lamN').value = DATOS.lambdaNuevosElegida;

  $$('#pestanas button').forEach(b => b.onclick = () => cambiarPagina(b.dataset.pg));
  $('#archivo').onchange = ev => { if (ev.target.files[0]) cargarArchivo(ev.target.files[0]); ev.target.value = ''; };
  ['#horizonte', '#confianza', '#lam', '#lamN', '#factorK'].forEach(s =>
    $(s).onchange = () => { actualizarPistas(); recalcular(); });
  ['#escenarioVista', '#fPeriodo', '#fSede', '#fCarrera', '#fModalidad',
    '#fCondicion', '#fTurno', '#fFila', '#fCol'].forEach(s =>
    $(s).onchange = () => { pintarDetalle(); if (s === '#escenarioVista') pintarKpis(); });

  let t0;
  addEventListener('resize', () => { clearTimeout(t0); t0 = setTimeout(pintarTodo, 180); });

  actualizarPistas();
  recalcular();
}
