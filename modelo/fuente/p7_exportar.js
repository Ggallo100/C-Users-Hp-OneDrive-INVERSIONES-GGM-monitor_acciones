/* ==========================================================================
   EXPORTACIÓN A EXCEL CON EL SUSTENTO DE LA PROYECCIÓN
   ========================================================================== */
function exportarExcel() {
  if (!S.proy) { brindis('Primero calcula una proyección', true); return; }
  const P = S.proy, V = S.D.varianza, VA = S.D.validacion;
  const H = c => ({ v: c, e: 1 });
  const TT = c => ({ v: c, e: 5 });
  const N0 = v => ({ v: Math.round(v * 100) / 100, e: 2 });
  const N2 = v => ({ v: Math.round(v * 10000) / 10000, e: 3 });
  const PC = v => ({ v: Math.round(v * 1e6) / 1e6, e: 4 });
  const fecha = new Date().toLocaleString('es-PE');
  const escNom = { alt: 'Optimista', cen: 'Moderado', baj: 'Pesimista' };

  /* ---------- 1. Resumen ---------- */
  const r1 = [
    [TT('Proyección de matrícula · Universidad Autónoma del Perú')],
    ['Generado', fecha],
    ['Origen del histórico', S.D.meta.origen],
    ['Último semestre observado', rotuloPeriodo(ULTIMO)],
    ['Horizonte', P.periodos.length + ' semestres (' + rotuloPeriodo(P.periodos[0]) +
      ' – ' + rotuloPeriodo(P.periodos[P.periodos.length - 1]) + ')'],
    ['Ingresantes', S.entrada ? S.entrada.nombre :
      'SUPUESTO DE REFERENCIA (repite el último ingreso observado de igual paridad)'],
    ['Nivel de confianza', PC(P.conf)],
    ['Choque sistémico de los escenarios', '±' + nf2.format(P.z * P.sigma) + ' en logit (z=' +
      nf2.format(P.z) + ' · σ=' + nf2.format(P.sigma) + ')'],
    [],
    ['Semestre', 'Ingresantes', 'Continuadores', 'Pesimista', 'Moderado', 'Optimista',
      'IP inferior', 'IP superior', 'Variación vs. anterior'].map(H),
  ];
  let prev = S.D.stock.filter(x => x[0] === S.D.periodos.length - 1).reduce((s, x) => s + x[6], 0);
  P.periodos.forEach(T => {
    const c = sumaMapa(P.cen.get(T)), a = sumaMapa(P.alt.get(T)), b = sumaMapa(P.baj.get(T));
    const sd = Math.sqrt(sumaMapa(P.varz.get(T)));
    const hw = P.z * Math.sqrt(Math.pow((a - b) / 2 / P.z, 2) + sd * sd);
    const n = nuevosDe(T);
    r1.push([rotuloPeriodo(T), N0(n), N0(c - n), N0(b), N0(c), N0(a),
    N0(c - hw), N0(c + hw), PC(c / Math.max(prev, 1) - 1)]);
    prev = c;
  });

  /* ---------- 2. Proyección detallada ---------- */
  const r2 = [['Semestre', 'Sede', 'Carrera', 'Modalidad', 'Programa nuevo', 'Ciclo', 'Turno',
    'Pesimista', 'Moderado', 'Optimista', 'Desv. típica independiente',
    'IP inferior', 'IP superior'].map(H)];
  P.periodos.forEach(T => {
    const cen = P.cen.get(T), alt = P.alt.get(T), baj = P.baj.get(T), vz = P.varz.get(T);
    const claves = Array.from(cen.keys()).sort();
    claves.forEach(k => {
      const c = cen.get(k) || 0;
      if (c < 0.005) return;
      const d = descomponer(k), nb = nombreDe(d);
      const a = alt.get(k) || 0, b = baj.get(k) || 0, sd = Math.sqrt(vz.get(k) || 0);
      const hw = P.z * Math.sqrt(Math.pow((a - b) / 2 / P.z, 2) + sd * sd);
      r2.push([rotuloPeriodo(T), nb.Sede, nb.Carrera, nb.Modalidad,
        S.carrerasNuevas.has(nb.Carrera) ? 'Sí' : 'No', nb.Ciclo, nb.Turno,
      N0(b), N0(c), N0(a), N2(sd), N0(Math.max(c - hw, 0)), N0(c + hw)]);
    });
  });

  /* ---------- 3. Agregados por dimensión ---------- */
  const r3 = [];
  const SEP = '\u0001';   // separador de clave compuesta, ausente de los nombres
  const agregado = (titulo, keyf, cabeceras) => {
    r3.push([TT(titulo)]);
    r3.push(cabeceras.concat(['Pesimista', 'Moderado', 'Optimista']).map(H));
    const acum = new Map();
    P.periodos.forEach(T => {
      ['baj', 'cen', 'alt'].forEach((e, ie) => {
        const src = e === 'cen' ? P.cen : e === 'alt' ? P.alt : P.baj;
        src.get(T).forEach((v, k) => {
          const kk = keyf(descomponer(k), T);
          if (!acum.has(kk)) acum.set(kk, [0, 0, 0]);
          acum.get(kk)[ie] += v;
        });
      });
    });
    Array.from(acum.keys()).sort().forEach(kk => {
      const v = acum.get(kk);
      r3.push(kk.split(SEP).concat([N0(v[0]), N0(v[1]), N0(v[2])]));
    });
    r3.push([]);
  };
  agregado('Por semestre y sede', (d, T) => rotuloPeriodo(T) + SEP + S.sedes[d.is],
    ['Semestre', 'Sede']);
  agregado('Por semestre y carrera', (d, T) => rotuloPeriodo(T) + SEP + S.carreras[d.ic],
    ['Semestre', 'Carrera']);
  agregado('Por semestre y ciclo', (d, T) => rotuloPeriodo(T) + SEP + String(d.ciclo).padStart(2, '0'),
    ['Semestre', 'Ciclo']);
  agregado('Por semestre y turno', (d, T) => rotuloPeriodo(T) + SEP + S.D.turnos[d.it],
    ['Semestre', 'Turno']);
  agregado('Por semestre y modalidad', (d, T) => rotuloPeriodo(T) + SEP + S.D.modalidades[d.im],
    ['Semestre', 'Modalidad']);
  agregado('Por semestre, modalidad y ciclo',
    (d, T) => rotuloPeriodo(T) + SEP + S.D.modalidades[d.im] + SEP + String(d.ciclo).padStart(2, '0'),
    ['Semestre', 'Modalidad', 'Ciclo']);

  /* ---------- 4. Ingresantes y reparto de turno ---------- */
  const r4 = [
    [TT('Ingresantes utilizados y reparto estimado por turno')],
    [S.entrada ? 'Archivo: ' + S.entrada.nombre :
      'Sin archivo: supuesto de referencia (repite el último ingreso observado de igual paridad)'],
    ['El archivo de entrada no declara el turno. El reparto se estima con una composición ' +
      'multinomial contraída por niveles; la columna «Nivel usado» indica hasta qué nivel llegó la evidencia.'],
    [],
    ['Semestre', 'Sede', 'Carrera', 'Modalidad', 'Programa nuevo', 'Ciclo', 'Nuevos']
      .concat(S.D.turnos.map(t => 'Turno ' + t))
      .concat(S.D.turnos.map(t => '% ' + t))
      .concat(['Nivel usado']).map(H),
  ];
  P.periodos.forEach(T => {
    const m = P.nuevos.get(T);
    if (!m) return;
    Array.from(m.keys()).sort().forEach(k => {
      const cant = m.get(k);
      const [is, ic, im, ci] = k.split('|').map(Number);
      const [mz, nef, nivel] = mezclaNuevos(S.E, is, ic, im, ci, T % 100);
      r4.push([rotuloPeriodo(T), S.sedes[is], S.carreras[ic], S.D.modalidades[im],
        S.carrerasNuevas.has(S.carreras[ic]) ? 'Sí' : 'No', ci, N0(cant)]
        .concat(mz.map(p => N0(cant * p)))
        .concat(mz.map(p => PC(p)))
        .concat([nivel]));
    });
  });

  /* ---------- 5. Parámetros estimados ---------- */
  const r5 = [
    [TT('Parámetros estimados del modelo')],
    ['Ponderación de recencia λ (continuación)', N2(P.lam)],
    ['Ponderación de recencia λ (turno de ingresantes)', N2(P.lamN)],
    ['Factor de contracción aplicado', N2(P.fk)],
    [],
    [TT('Continuación por ciclo y rezago')],
    ['Las columnas L=1..' + S.D.lagMax + ' son la probabilidad de que la SIGUIENTE matrícula ' +
      'ocurra exactamente L semestres después. L>1 es reingreso tras pausa.'],
    ['Ciclo', 'Observaciones ponderadas'].concat(
      Array.from({ length: S.D.lagMax }, (_, i) => 'L = ' + (i + 1))).map(H),
  ];
  for (let ci = 1; ci <= S.D.cicloMax; ci++) {
    const a = S.E.porCiclo.get(String(ci));
    if (!a || a[0] <= 0) continue;
    r5.push([ci, N0(a[0])].concat(
      Array.from({ length: S.D.lagMax }, (_, i) => PC(a[S.E.LAG + i] / Math.max(a[i], 1e-9)))));
  }
  r5.push([]);
  r5.push([TT('Continuación por modalidad y ciclo (rezago 1)')]);
  r5.push(['La modalidad es la segunda dimensión en importancia tras el ciclo. La brecha se ' +
    'concentra en el primer ciclo y se cierra a partir del tercero.']);
  r5.push(['Ciclo'].concat(S.D.modalidades).concat(
    S.D.modalidades.map(m => 'n ' + m)).map(H));
  for (let ci = 1; ci <= S.D.cicloMax; ci++) {
    const tasas = [], enes = [];
    let hay = false;
    S.D.modalidades.forEach((_, im) => {
      let n = 0, k = 0;
      for (const pa of [1, 2]) {
        const a = S.E.porModa.get(im + '|' + ci + '|' + pa);
        if (a) { n += a[0]; k += a[S.E.LAG]; }
      }
      if (n > 0) { hay = true; tasas.push(PC(k / n)); enes.push(N0(n)); }
      else { tasas.push(''); enes.push(''); }
    });
    if (hay) r5.push([ci].concat(tasas).concat(enes));
  }
  r5.push([]);
  r5.push([TT('Avance de ciclo por modalidad')]);
  r5.push(['Modalidad'].concat(S.D.deltas.map(d => (d > 0 ? '+' : '') + d)).map(H));
  S.D.modalidades.forEach((nom, im) => {
    const acc = new Array(S.E.ND).fill(0);
    for (let ci = 1; ci <= S.D.cicloMax; ci++) {
      const a = S.E.avModa.get(im + '|' + ci);
      if (a) for (let j = 0; j < S.E.ND; j++) acc[j] += a[j];
    }
    const sa = acc.reduce((x, y) => x + y, 0);
    if (sa > 0) r5.push([nom].concat(acc.map(v => PC(v / sa))));
  });

  r5.push([]);
  r5.push([TT('Continuación por carrera, ciclo y paridad (rezago 1, contraída)')]);
  r5.push(['Carrera', 'Modalidad', 'Ciclo', 'Semestre', 'Observaciones ponderadas',
    'Tasa cruda', 'Tasa contraída'].map(H));
  S.D.carreras.forEach((nom, ic) => {
    S.D.modalidades.forEach((md, im) => {
      for (let ci = 1; ci <= S.D.cicloMax; ci++) {
        for (const pa of [1, 2]) {
          const a = S.E.porCarrera.get(ic + '|' + im + '|' + ci + '|' + pa);
          if (!a || a[0] <= 0) continue;
          let mejor = null;
          S.D.sedes.forEach((_, is2) => {
            if (S.E.celda.get(is2 + '|' + ic + '|' + im + '|' + ci + '|' + pa)) mejor = is2;
          });
          const [q] = tasaQ(S.E, mejor == null ? 0 : mejor, ic, im, ci, pa, 1);
          r5.push([nom, md, ci, pa === 1 ? 'I' : 'II', N0(a[0]),
          PC(a[S.E.LAG] / Math.max(a[0], 1e-9)), PC(q)]);
        }
      }
    });
  });
  r5.push([]);
  r5.push([TT('Avance de ciclo de los continuadores (global)')]);
  r5.push(['Salto de ciclo', 'Probabilidad', 'Interpretación'].map(H));
  const sav = S.E.avGlobal.reduce((a, b) => a + b, 0);
  S.D.deltas.forEach((d, i) => r5.push([
    (d > 0 ? '+' : '') + d, PC(S.E.avGlobal[i] / sav),
    d === 0 ? 'Repite ciclo' : d === 1 ? 'Avanza un ciclo' :
      d < 0 ? 'Retrocede de ciclo' : 'Avanza ' + d + ' ciclos']));
  r5.push([]);
  r5.push([TT('Transición de turno por sede')]);
  r5.push(['Sede', 'Modalidad', 'Turno de origen'].concat(S.D.turnos.map(t => '→ ' + t))
    .concat(['Observaciones ponderadas']).map(H));
  S.D.sedes.forEach((sd, is) => S.D.modalidades.forEach((md, im) =>
    S.D.turnos.forEach((t0, it) => {
      const a = S.E.tuModa.get(is + '|' + im + '|' + it);
      if (!a) return;
      const s = a.reduce((x, y) => x + y, 0);
      if (s <= 0.5) return;
      r5.push([sd, md, t0].concat(a.map(v => PC(v / s))).concat([N0(s)]));
    })));
  r5.push([]);
  r5.push([TT('Maduración de sede · ciclo máximo ofertable')]);
  r5.push(['Una sede recién abierta despliega su plan semestre a semestre: en el de apertura ' +
    'sólo existe el ciclo 1, un semestre después el 2, y así. El tope se aplica al avance de los ' +
    'continuadores y a los ingresantes declarados en ciclos superiores.']);
  r5.push(['Sede', 'Semestre de apertura', 'Ciclo base', 'Origen del dato']
    .concat(P.periodos.slice(0, 12).map(rotuloPeriodo)).map(H));
  S.sedes.forEach((nom, is) => {
    const ap = S.aperturaPorIs[is];
    const enMad = ap && ap.enMaduracion;
    r5.push([nom,
      enMad ? rotuloPeriodo(ap.inicio) : 'Anterior a la base',
      enMad ? ap.cicloBase : '',
      !enMad ? 'Sede consolidada: sin tope'
        : ap.declarada ? 'Declarada en el archivo de ingresantes' : 'Inferida del histórico']
      .concat(P.periodos.slice(0, 12).map(T => {
        const t = topeCicloSede(is, T);
        return t >= 1e5 ? 'sin tope' : t <= 0 ? 'no opera' : Math.min(t, S.D.cicloMax);
      })));
  });

  r5.push([]);
  r5.push([TT('Ciclos del plan por carrera')]);
  r5.push(['Carrera', 'Ciclos del plan', 'Origen'].map(H));
  S.carreras.forEach((c, i) => r5.push([c, S.planPorIc[i],
  S.carrerasNuevas.has(c) ? 'Declarado o por defecto (programa nuevo)' : 'Inferido del histórico']));

  /* ---------- 6. Validación ---------- */
  const r6 = [
    [TT('Validación estadística')],
    [],
    [TT('Descomposición de la varianza de la tasa de continuación')],
    ['Componente', 'Valor', 'Lectura'].map(H),
    ['σ del choque de periodo (logit)', N2(V.sigma_logit_choque),
      'Desviación residual de los efectos de periodo tras descontar ciclo y estacionalidad'],
    ['Grados de libertad', V.gl_choque, 'Número de semestres de origen menos 2'],
    ['Efecto estacional I (logit)', N2(V.estacional_logit['1']), 'Primer semestre frente a la media'],
    ['Efecto estacional II (logit)', N2(V.estacional_logit['2']), 'Segundo semestre frente a la media'],
    ['Varianza observada de la tasa', N2(V.var_observada * 1e4) , 'x 1e-4, entre semestres'],
    ['… componente muestral', N2(V.var_muestral * 1e4), 'x 1e-4; se diluye al agregar'],
    ['… componente de proceso', N2(V.var_proceso * 1e4), 'x 1e-4; NO se cancela al agregar'],
    ['Contraste LR del bloque de periodo', N2(V.lr_periodo),
      V.gl_lr + ' g.l. · p = ' + V.p_periodo.toExponential(2) + ' (los choques de periodo son reales)'],
    ['Pseudo-R² del GLM auxiliar', N2(V.pseudo_r2), 'Sobre ' + fmtN(V.n_obs) + ' transiciones'],
    ['Factor de inflación κ', N2(S.D.escenarios.kappa),
      'Calibrado por backtesting; 1,0 significa que la descomposición no necesita ajuste'],
    [],
    [TT('Backtesting de origen móvil · error porcentual absoluto ponderado (%)')],
    ['Se reestima el modelo con los datos hasta cada semestre de corte y se proyecta el resto.'],
    ['Nivel de agregación', 'h = 1', 'h = 2', 'h = 3'].map(H),
  ];
  Object.keys(VA.epap).forEach(n => {
    r6.push([n].concat([1, 2, 3].map(h =>
      VA.epap[n][h] == null ? '' : PC(VA.epap[n][h]))));
  });
  r6.push([]);
  r6.push([TT('Cobertura empírica del intervalo de predicción (nominal ' +
    fmtP(S.D.escenarios.nivelConfianza) + ')')]);
  r6.push(['Nivel de agregación', 'h = 1', 'h = 2', 'h = 3'].map(H));
  Object.keys(VA.cobertura).forEach(n => {
    r6.push([n].concat([1, 2, 3].map(h =>
      VA.cobertura[n][h] == null ? '' : PC(VA.cobertura[n][h]))));
  });
  r6.push([]);
  r6.push([TT('Detalle del total institucional')]);
  r6.push(['Ajustado hasta', 'Semestre proyectado', 'Horizonte', 'EPAP', 'Sesgo (estudiantes)'].map(H));
  VA.detalleTotal.forEach(d => r6.push([rotuloPeriodo(d.hasta), rotuloPeriodo(d.periodo),
  d.h, PC(d.epap), N0(d.sesgo)]));
  r6.push([]);
  r6.push([TT('Selección de la ponderación de recencia λ')]);
  r6.push(['λ', 'EPAP Total', 'EPAP Sede×Carrera', 'EPAP Sede×Carrera×Ciclo', 'Sesgo del total'].map(H));
  (S.D.gridLambda || []).forEach(g => r6.push([N2(g.lam), PC(g.total), PC(g.sc), PC(g.sci), N0(g.sesgo)]));

  /* ---------- 7. Metodología ---------- */
  const r7 = [
    [TT('Metodología')],
    [],
    [H('1. Qué proyecta el modelo')],
    ['La matrícula de cada semestre se descompone en ingresantes y continuadores. Los ingresantes'],
    ['los aporta el archivo de entrada; los continuadores los genera el modelo a partir del'],
    ['comportamiento histórico observado en las trayectorias individuales de los estudiantes.'],
    [],
    [H('2. Ecuación de recursión')],
    ['M(T,s,c,k,u) = N(T,s,c,k,u) + Σ_L Σ_{k\',u\'} M(T−L,s,c,k\',u\') · q_L · A(k\'→k) · U(u\'→u)'],
    ['donde T es el semestre, s la sede, c la carrera, k el ciclo y u el turno.'],
    ['q_L es la probabilidad de que la siguiente matrícula ocurra exactamente L semestres después,'],
    ['A la distribución del salto de ciclo y U la matriz de transición de turno.'],
    [],
    [H('3. Rezagos múltiples')],
    ['El rezago L va de 1 a ' + S.D.lagMax + ' semestres. Modelar sólo L=1 trataría como desertor a todo'],
    ['estudiante que interrumpe un semestre, cuando en el histórico un 2,6 % de las matrículas son'],
    ['reingresos tras una pausa. Con cuatro rezagos se recoge el 99,8 % de los flujos observados.'],
    [],
    [H('4. Contracción empírico-Bayes')],
    ['Cada probabilidad se estima en una escalera de niveles, del más fino al más agregado.'],
    ['La estimación de una celda es (éxitos + k · estimación del padre) / (observaciones + k),'],
    ['con k obtenido por el método de los momentos del modelo Beta-Binomial:'],
    ['k = p(1−p)/σ²_entre − 1. Así una celda con pocas observaciones toma prestada información'],
    ['de su nivel superior en lugar de producir una tasa inestable.'],
    [],
    [H('5. Modalidad de estudios')],
    ['La modalidad (Presencial, Semi Presencial y A distancia) es la segunda dimensión en'],
    ['importancia tras el ciclo. El 99,4 % de los continuadores la conserva de un semestre al'],
    ['siguiente, así que el modelo la trata como atributo fijo —igual que la sede y la carrera—'],
    ['y no necesita matriz de transición. Lo que sí hace es condicionar en ella la continuación,'],
    ['el avance de ciclo y el turno.'],
    ['La diferencia es grande y se concentra en el arranque: en el primer ciclo la continuación al'],
    ['semestre siguiente va del 42 % a distancia al 71 % presencial, con la semipresencial en medio.'],
    ['A partir del tercer ciclo las tres convergen. Un modelo que las promediara aplicaría al'],
    ['ingresante a distancia una retención que no le corresponde, y el error crecería a medida que'],
    ['esa modalidad gana peso: ha pasado del 4,8 % al 19,6 % de la matrícula en cuatro años.'],
    ['El archivo de entrada puede declarar la modalidad; si no lo hace, el modelo la reparte con'],
    ['la composición histórica de la sede y la carrera, contraída por niveles.'],
    [],
    [H('6. Programas nuevos')],
    ['Una carrera sin historia en la base no encuentra evidencia en los niveles finos de la'],
    ['escalera y se queda en el nivel agregado que sí la tiene: el comportamiento de continuación'],
    ['de su ciclo y el reparto de turno de su sede. Es el mismo mecanismo de contracción, sin'],
    ['reglas especiales. Si el plan no dura ' + S.D.planDefecto + ' ciclos, se declara en la columna CiclosPlan.'],
    [],
    [H('7. Maduración de sede')],
    ['Una sede que abre no puede tener estudiantes en cualquier ciclo: despliega su plan de'],
    ['estudios semestre a semestre. En el semestre de apertura sólo existe el ciclo 1, un'],
    ['semestre después el 2, y así sucesivamente. El modelo aplica ese tope al avance de los'],
    ['continuadores (la matriz de avance permite saltos de +2 y +3, que se recortan) y a los'],
    ['ingresantes que el archivo declare en ciclos que la sede aún no imparte.'],
    ['La apertura se detecta del histórico: si el ciclo máximo del primer semestre observado de'],
    ['una sede es 1 o 2, la sede arrancó ahí. Una sede con el plan completo desde su primer'],
    ['registro es anterior a la ventana de datos y no recibe tope. Las sedes que aparecen por'],
    ['primera vez en el archivo de ingresantes se tratan como aperturas en ese semestre.'],
    [],
    [H('8. Reparto de los ingresantes por turno')],
    ['El archivo de entrada no declara el turno. Se estima con una composición multinomial'],
    ['contraída por niveles y ponderada por recencia, porque la mezcla de turno está en deriva'],
    ['pronunciada en el histórico. La estimación es determinista y reproducible.'],
    [],
    [H('9. Escenarios frente a intervalo de predicción')],
    ['Los tres ESCENARIOS aplican un desplazamiento sistémico común en escala logit a la tasa'],
    ['de continuación, de ±z·σ. Son estados del mundo coherentes: el total de cada escenario'],
    ['es exactamente la suma de sus celdas, así que sirven para planificar capacidad.'],
    ['El INTERVALO DE PREDICCIÓN añade la varianza independiente (realización multinomial,'],
    ['error de parámetro y varianza propagada). No es aditivo entre celdas, pero es el que'],
    ['responde a la pregunta de dónde caerá el dato observado.'],
    [],
    [H('10. Validación')],
    ['Backtesting de origen móvil: se reestima con la información disponible hasta cada semestre'],
    ['de corte y se proyecta el resto, comparando con lo efectivamente observado. Los resultados'],
    ['están en la hoja «Validación». La ponderación de recencia λ se eligió por este mismo'],
    ['procedimiento, no a juicio.'],
    [],
    [H('11. Advertencias')],
    ['· La proyección es condicional al archivo de ingresantes: no prevé la admisión.'],
    ['· La precisión relativa se degrada al desagregar; en celdas de pocos estudiantes conviene'],
    ['  leer el intervalo de predicción, no sólo el punto.'],
    ['· El modelo supone que el patrón de continuación se mantiene. Un cambio de plan de estudios,'],
    ['  de política de permanencia o de oferta de turnos exige reestimar con datos posteriores.'],
  ];

  const blob = construirXlsx([
    { nombre: 'Resumen', filas: r1, anchos: [26, 14, 14, 13, 13, 13, 13, 13, 14] },
    { nombre: 'Proyección detallada', filas: r2, anchos: [11, 13, 50, 17, 9, 7, 9, 11, 11, 11, 13, 11, 11], inmovilizar: 1 },
    { nombre: 'Agregados', filas: r3, anchos: [13, 50, 12, 12, 12] },
    { nombre: 'Ingresantes', filas: r4, anchos: [11, 13, 50, 17, 9, 7, 9].concat(S.D.turnos.map(() => 11)).concat(S.D.turnos.map(() => 10)).concat([30]) },
    { nombre: 'Parámetros', filas: r5, anchos: [50, 17, 12, 12, 16, 12, 14] },
    { nombre: 'Validación', filas: r6, anchos: [34, 14, 14, 14, 18, 14] },
    { nombre: 'Metodología', filas: r7, anchos: [104] },
  ]);
  descargar('proyeccion_matricula_' + hoyISO() + '.xlsx', blob);
  brindis('Proyección exportada · 7 hojas con el sustento');
}
