/* Contenido del documento: portada, índice y capítulos 1 a 4. */
const U = require('./doc_parte1.js');
const {
  Paragraph, TextRun, AlignmentType, TableOfContents, BorderStyle, ShadingType,
  AZUL, AMBAR, GRIS, GRIS2, FONDO, ANCHO_TABLA,
  p, neg, txt, cur, mono, h1, h2, h3, formula, nota, vinetas, numerada,
  tabla, figura, pieTabla, salto,
} = U;

function portada() {
  return [
    new Paragraph({ spacing: { before: 2200, after: 0 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.LEFT, spacing: { after: 60 },
      children: [new TextRun({ text: 'UNIVERSIDAD AUTÓNOMA DEL PERÚ', bold: true, size: 22, color: AMBAR, characterSpacing: 40 })],
    }),
    new Paragraph({
      spacing: { after: 40 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: AMBAR, space: 10 } },
      children: [],
    }),
    new Paragraph({
      spacing: { before: 260, after: 120 },
      children: [new TextRun({ text: 'Modelo de proyección', bold: true, size: 56, color: AZUL })],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [new TextRun({ text: 'de matrícula semestral', bold: true, size: 56, color: AZUL })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: 'Cadena de cohortes con rezagos múltiples, contracción', size: 26, color: GRIS })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: 'empírico-Bayes y escenarios estadísticamente validados', size: 26, color: GRIS })],
    }),
    new Paragraph({ spacing: { before: 900 }, children: [] }),
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: 'Especificación técnica, sustento econométrico y manual de uso', size: 21, color: GRIS })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: 'Base histórica: 130 130 registros de matrícula · 40 933 estudiantes · 2023-I a 2026-II', size: 20, color: GRIS2 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: 'Dimensiones: semestre · sede · carrera · modalidad de estudios · ciclo · turno', size: 20, color: GRIS2 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: 'Entregables: modelo en HTML, plantilla de ingresantes en Excel y este documento', size: 20, color: GRIS2 })],
    }),
    salto(),
  ];
}

function indice() {
  return [
    h1('Contenido'),
    new TableOfContents('Contenido', { hyperlink: true, headingStyleRange: '1-3' }),
    salto(),
  ];
}

function resumenEjecutivo() {
  return [
    h1('1. Resumen ejecutivo'),
    p([txt('Este documento describe el modelo que proyecta la matrícula semestral de la Universidad Autónoma del Perú por '), neg('semestre académico, sede, carrera, modalidad de estudios, ciclo de estudios y turno'), txt(', distinguiendo ingresantes de continuadores y ofreciendo tres escenarios contrastados.')]),
    p('El modelo se entrega como un archivo HTML autocontenido que funciona sin conexión y sin instalación. Recibe como entrada un archivo Excel con los ingresantes previstos y devuelve la matrícula proyectada para el número de semestres que se le indique, exportable a Excel junto con todo su sustento.'),

    h2('1.1 Qué hace y qué no hace'),
    p('El modelo proyecta el comportamiento de los estudiantes que ya están en la universidad. No pronostica cuántos ingresarán: esa cifra la aporta el área de admisión a través del archivo de entrada. La proyección es, por tanto, condicional a ese supuesto de ingreso, y así debe leerse.'),
    p('Lo que el modelo sí resuelve, y que a mano resulta inabordable, es la propagación de esos ingresantes y del alumnado actual a lo largo de los semestres siguientes: quién se rematricula, en qué ciclo aparece, en qué turno lo hace, quién egresa y quién regresa tras una pausa.'),

    h2('1.2 La modalidad de estudios como dimensión del modelo'),
    p([txt('Las tres modalidades que ofrece la universidad —presencial, semipresencial y a distancia— no son una etiqueta administrativa: son '), neg('tres poblaciones con comportamientos distintos'), txt('. La diferencia más importante está en el primer ciclo, donde la continuación es del 70,7 % en la modalidad presencial y del 41,6 % en la modalidad a distancia: veintinueve puntos porcentuales.')]),
    p([txt('Además, esa composición está en fuerte movimiento: la modalidad a distancia pasa del 4,8 % de la matrícula en 2023-I al '), neg('19,6 % en 2026-II'), txt('. Un modelo que promediara las tres modalidades aplicaría a una población cada vez más numerosa una retención que no le corresponde, y confundiría el cambio de composición con un deterioro genuino de la retención.')]),
    p('Por eso la modalidad entra en el estado del modelo, junto a la sede, la carrera, el ciclo y el turno. El capítulo 6 documenta lo que aporta con un contraste de especificación: el mismo procedimiento, ejecutado sobre la misma base con y sin esa dimensión.'),
    tabla([2700, 2100, 2100, 2126],
      ['Nivel de agregación', 'Sin modalidad', 'Con modalidad', 'Reducción'],
      [
        ['Total institucional', '1,99 %', '1,65 %', '17,2 %'],
        ['Sede', '2,30 %', '1,65 %', '28,4 %'],
        ['Carrera', '3,17 %', '2,76 %', '13,1 %'],
        ['Sede × carrera', '3,47 %', '2,90 %', '16,2 %'],
      ]),
    pieTabla('Error fuera de muestra (EPAP) de las dos especificaciones, medido en los niveles de agregación que existen en ambas. En cada caso la ponderación de recencia se elige por validación cruzada dentro de la propia especificación. Apartado 6.5.'),

    h2('1.3 Resultados de la validación'),
    p('El modelo se validó fuera de muestra con backtesting de origen móvil: se reestima con la información disponible hasta un semestre de corte y se proyecta el resto, comparando con lo que efectivamente ocurrió.'),
    tabla([3500, 1300, 1300, 1300, 1626],
      ['Nivel de agregación', 'h = 1', 'h = 2', 'h = 3', 'Celdas'],
      [
        ['Total institucional', '1,7 %', '0,9 %', '3,0 %', '1'],
        ['Sede', '1,7 %', '0,9 %', '3,0 %', '2'],
        ['Modalidad', '1,7 %', '0,9 %', '3,0 %', '3'],
        ['Carrera', '2,6 %', '2,1 %', '4,7 %', '25'],
        ['Sede × carrera', '2,7 %', '2,2 %', '5,0 %', '42'],
        ['Sede × carrera × modalidad', '3,3 %', '3,1 %', '5,6 %', '83'],
        ['… × ciclo', '11,9 %', '13,4 %', '15,4 %', '415'],
        ['… × turno', '30,8 %', '40,3 %', '41,5 %', '699'],
      ]),
    pieTabla('Error porcentual absoluto ponderado (EPAP) fuera de muestra, por nivel de agregación y horizonte en semestres. Tres orígenes de reestimación y seis comparaciones. La columna de celdas es el número de combinaciones no vacías en 2026-II.'),
    p('El error crece al desagregar porque las celdas se vuelven diminutas: en el cruce completo muchas tienen menos de diez estudiantes y una unidad de diferencia pesa mucho en términos relativos. Por eso el modelo acompaña cada celda de su intervalo de predicción, y no sólo del punto.'),
    nota('Cómo leer esta tabla.', 'Los dos últimos niveles son más finos que los del cruce clásico sede × carrera × ciclo × turno, porque la modalidad parte cada celda en hasta tres. Un EPAP mayor en ellos no indica peor modelo: indica celdas más pequeñas. La comparación entre especificaciones sólo es legítima en niveles que existan en ambas, que es como está hecha la tabla del apartado 1.2.'),

    h2('1.4 Los tres escenarios'),
    p([txt('Los escenarios no son un ± arbitrario. Se construyen a partir de un componente de varianza estimado: el '), neg('choque de periodo'), txt(', es decir, la parte de la volatilidad de la tasa de continuación que afecta a todas las cohortes de un mismo semestre a la vez y que, por tanto, no se cancela al agregar. Ese componente es estadísticamente significativo (contraste de razón de verosimilitudes χ² = 65,9 con 6 g.l., p ≈ 2,8·10⁻¹²) y su desviación típica es de 0,068 en escala logit.')]),
    p([txt('Esa desviación era de 0,103 antes de incorporar la modalidad. La diferencia no es un ajuste: es que '), neg('un tercio de lo que antes se contabilizaba como choque aleatorio era en realidad deriva de composición'), txt(' —el peso creciente de una modalidad con menor retención— y, una vez identificada, deja de ser incertidumbre para convertirse en estructura predecible. Los escenarios resultantes son más estrechos porque el modelo sabe más, no porque se haya decidido estrecharlos.')]),
    nota('Diferencia clave.', 'Un escenario y un intervalo de predicción responden a preguntas distintas. El escenario describe un estado del mundo coherente —si la retención se desplaza, se desplaza para todos— y por eso es aditivo: el total de cada escenario es exactamente la suma de sus celdas, lo que permite planificar aulas, turnos y docentes. El intervalo de predicción añade además el azar de realización de cada celda y responde a dónde caerá el dato observado. El modelo entrega ambos, claramente separados.'),

    h2('1.5 Cómo se valida la amplitud del intervalo'),
    p('La amplitud del intervalo no se ajustó a ojo. Se comprobó contra el backtesting qué proporción de los valores observados cae realmente dentro del intervalo nominal del 80 %.'),
    tabla([4200, 1600, 1600, 1626],
      ['Nivel de agregación', 'h = 1', 'h = 2', 'h = 3'],
      [
        ['Total institucional', '66,7 %', '100,0 %', '100,0 %'],
        ['Modalidad', '88,9 %', '100,0 %', '100,0 %'],
        ['Carrera', '91,8 %', '98,0 %', '96,0 %'],
        ['Sede × carrera', '92,3 %', '97,5 %', '90,5 %'],
        ['Sede × carrera × modalidad', '94,0 %', '98,1 %', '96,4 %'],
        ['… × ciclo', '82,6 %', '84,8 %', '88,9 %'],
        ['… × turno', '77,4 %', '80,5 %', '85,8 %'],
      ]),
    pieTabla('Cobertura empírica del intervalo de predicción nominal del 80 %, medida fuera de muestra.'),
    p([txt('La cobertura media en los tres niveles desagregados es del 86,6 % frente a un nominal del 80 %. El factor de inflación de varianza calibrado resultó ser '), neg('κ = 1,0'), txt(': la descomposición teórica reproduce la dispersión realmente observada sin necesidad de ensanchar el intervalo a mano. Es el resultado más sólido de la validación, porque significa que la aritmética de la incertidumbre está bien planteada y no sostenida por un factor de corrección.')]),
    p('En el cruce más fino —el que incluye modalidad y turno— la cobertura pasó del 68,5 % al 77,4 %, ya prácticamente en el nominal. Antes el intervalo se quedaba corto justamente donde la composición por modalidad hacía más daño; ahora la diferencia entre modalidades está en el punto central y no tiene que absorberla el margen.'),

    h2('1.6 Entregables'),
    tabla([3000, 6026],
      ['Archivo', 'Contenido'],
      [
        ['modelo_proyeccion_matricula.html', 'El modelo. Archivo autocontenido de unos 380 KB: no requiere instalación, conexión ni servidor. Se abre con doble clic en cualquier navegador moderno.'],
        ['plantilla_ingresantes.xlsx', 'Plantilla de entrada con instrucciones, catálogos de sedes, carreras y modalidades, y una hoja precargada con el último ingreso observado como punto de partida editable.'],
        ['Este documento', 'Especificación del modelo, sustento econométrico, resultados de validación y manual de uso.'],
        ['Exportación del modelo', 'Al pulsar «Exportar proyección», el modelo genera un Excel de siete hojas con la proyección detallada y todo su sustento: parámetros, validación y metodología.'],
      ], { al: [AlignmentType.LEFT, AlignmentType.LEFT] }),
    pieTabla('Entregables del encargo.'),
    salto(),
  ];
}

function encargo() {
  return [
    h1('2. El encargo y el alcance'),
    h2('2.1 Definición del problema'),
    p('La matrícula de un semestre académico es la suma de dos poblaciones con dinámicas muy distintas:'),
    ...vinetas([
      [neg('Ingresantes. '), txt('Estudiantes que se matriculan por primera vez. Su volumen depende de la campaña de admisión, la oferta de vacantes y el mercado, no del comportamiento del alumnado existente. Es una variable de decisión y de entorno, y el modelo la toma como dato.')],
      [neg('Continuadores. '), txt('Estudiantes ya matriculados que vuelven a matricularse. Su volumen depende del comportamiento observable de las cohortes actuales: retención, ritmo de avance, cambio de turno, egreso y reingreso. Es lo que el modelo estima y proyecta.')],
    ]),
    p('El encargo consiste en proyectar el total —ingresantes más continuadores— desagregado por semestre académico, sede, carrera, modalidad de estudios, ciclo de estudios y turno, con tres escenarios estadísticamente validados y un horizonte configurable.'),

    h2('2.2 Dimensiones de la proyección'),
    tabla([2200, 1100, 5726],
      ['Dimensión', 'Valores', 'Observaciones'],
      [
        ['Semestre académico', 'configurable', 'Nomenclatura AAAA-I y AAAA-II. El primer semestre proyectable es 2027-I; el horizonte se elige entre 1 y 24 semestres.'],
        ['Sede', '2 + nuevas', 'Lima Sur y Lima Norte. Ningún estudiante del histórico cambia de sede, así que la sede se conserva a lo largo de la proyección. Una sede recién abierta despliega su plan ciclo a ciclo (apartado 5.7).'],
        ['Carrera', '25 + nuevas', 'Sólo un 0,4 % de los continuadores cambia de carrera, de modo que la carrera también se conserva. El archivo de entrada admite programas que no existen en el histórico.'],
        ['Modalidad de estudios', '3', 'Presencial, Semi Presencial y A distancia. El 99,4 % de los continuadores la conserva, así que se trata como atributo fijo; pero condiciona la continuación, el avance y el turno (apartado 5.4).'],
        ['Ciclo de estudios', '1 a 11', 'El ciclo terminal depende del plan: 11 en Derecho y Psicología, 10 en el resto.'],
        ['Turno', '4', 'Mañana, Tarde y Noche en Lima Sur; Diurno y Noche en Lima Norte. El turno sí cambia entre semestres y se modela explícitamente.'],
      ], { al: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.LEFT] }),
    pieTabla('Dimensiones de la proyección y su tratamiento en el modelo.'),
    nota('Sobre el turno.', 'El archivo de entrada no declara el turno de los ingresantes, tal como pide el encargo: el reparto se estima matemáticamente. El apartado 6.7 explica cómo, y el apartado 4.5 por qué no puede darse por constante.'),
    nota('Sobre la modalidad.', 'La plantilla de entrada sí incluye una columna de modalidad, y conviene rellenarla: es la diferencia entre proyectar una cohorte con su retención real y proyectarla con la media de las tres. Si se deja vacía, el modelo la estima con la composición histórica de esa sede y esa carrera, restringida a la oferta que realmente existe (apartado 6.8).'),

    h2('2.3 Por qué un modelo de cohortes y no una extrapolación de la serie'),
    p('La tentación inmediata ante una serie de matrícula es ajustar una tendencia y prolongarla. Sería un error en este caso, por tres razones.'),
    ...numerada([
      [neg('La serie tiene estructura interna conocida. '), txt('La matrícula de 2028-I no es un punto de una serie: es lo que queda de las cohortes de 2027-II más lo que ingrese. Ignorar esa contabilidad desaprovecha información que está en los datos.')],
      [neg('El encargo exige desagregación. '), txt('Una extrapolación del total no dice cuántos estudiantes habrá en el ciclo 4 de Ingeniería Civil en modalidad semipresencial y turno noche, que es justo lo que se necesita para programar aulas y docentes.')],
      [neg('El ingreso es exógeno. '), txt('Una extrapolación mezcla el efecto de la admisión con el del comportamiento estudiantil. Separarlos permite responder a preguntas de política: qué pasa si la admisión cae un 10 %, si un programa nuevo arranca con 60 ingresantes o si la modalidad a distancia sigue ganando peso.')],
    ]),
    p('El modelo de cohortes conserva esa contabilidad. Cada estudiante proyectado proviene de un estudiante observado o de un ingresante declarado, y el modelo sólo estima las probabilidades de transición entre estados.'),
    salto(),
  ];
}

function baseHistorica() {
  return [
    h1('3. La base histórica'),
    h2('3.1 Contenido y cobertura'),
    p([txt('La estimación se apoya en el archivo '), mono('historico_matriculados_con_fecha_de_matricula.xlsx'), txt(', con 130 130 registros de matrícula correspondientes a 40 933 estudiantes distintos a lo largo de ocho semestres académicos, de 2023-I a 2026-II.')]),
    p([txt('La característica decisiva de esta base es que cada fila lleva el '), neg('código individual del estudiante'), txt(' ('), mono('cPerCodigo'), txt('). Eso permite reconstruir la trayectoria de cada persona y observar sus transiciones reales, en lugar de inferirlas de agregados. De ahí salen las 89 196 transiciones sobre las que se estima el modelo.')]),
    tabla([1500, 1250, 1250, 1250, 1250, 1250, 1276],
      ['Semestre', '2023-I', '2023-II', '2024-I', '2024-II', '2025-I', '2025-II'],
      [
        ['Matriculados', '12 599', '12 331', '15 063', '14 535', '17 498', '16 353'],
        ['Ingresantes', '4 681', '2 144', '4 697', '2 108', '5 352', '2 160'],
        ['Continuadores', '7 918', '10 187', '10 366', '12 427', '12 146', '14 193'],
      ]),
    tabla([1500, 1250, 1250, 5026],
      ['Semestre', '2026-I', '2026-II', ''],
      [
        ['Matriculados', '21 420', '20 330', ''],
        ['Ingresantes', '7 311', '3 560', ''],
        ['Continuadores', '14 109', '16 770', ''],
      ]),
    pieTabla('Composición de la matrícula observada por semestre académico.'),
    p('Dos rasgos del cuadro condicionan el modelo. El primero es el crecimiento sostenido: la matrícula pasa de 12 599 a 20 330 estudiantes en cuatro años. El segundo es la estacionalidad marcada: el primer semestre de cada año recibe aproximadamente el doble de ingresantes que el segundo, lo que produce el patrón de dientes de sierra que se aprecia en la serie.'),

    h2('3.2 La composición por modalidad y su deriva'),
    p('El tercer rasgo estructural, y el que motivó la revisión del modelo, es el desplazamiento de la matrícula entre modalidades de estudio.'),
    tabla([1650, 922, 922, 922, 922, 922, 922, 922, 922],
      ['Modalidad', '23-I', '23-II', '24-I', '24-II', '25-I', '25-II', '26-I', '26-II'],
      [
        ['Presencial', '10 345', '9 586', '11 540', '10 850', '12 239', '11 240', '14 176', '13 117'],
        ['Semi Presencial', '1 649', '1 657', '2 059', '2 023', '2 478', '2 456', '3 254', '3 221'],
        ['A distancia', '605', '1 088', '1 464', '1 662', '2 781', '2 657', '3 990', '3 992'],
      ], { tam: 17 }),
    tabla([1650, 922, 922, 922, 922, 922, 922, 922, 922],
      ['Participación', '23-I', '23-II', '24-I', '24-II', '25-I', '25-II', '26-I', '26-II'],
      [
        ['Presencial', '82,1 %', '77,7 %', '76,6 %', '74,6 %', '69,9 %', '68,7 %', '66,2 %', '64,5 %'],
        ['Semi Presencial', '13,1 %', '13,4 %', '13,7 %', '13,9 %', '14,2 %', '15,0 %', '15,2 %', '15,8 %'],
        ['A distancia', '4,8 %', '8,8 %', '9,7 %', '11,4 %', '15,9 %', '16,2 %', '18,6 %', '19,6 %'],
      ], { tam: 17 }),
    pieTabla('Matrícula por modalidad de estudios y participación sobre el total. La modalidad a distancia cuadruplica su peso en cuatro años; la presencial cede casi dieciocho puntos.'),
    ...figura('04b_modalidad_serie.png', 'Composición por modalidad, observada y proyectada, tal como la presenta el modelo en su pestaña de resumen.', { maxAlto: 300 }),
    p([txt('Todas las modalidades crecen en términos absolutos —la presencial pasa de 10 345 a 13 117 estudiantes—, de modo que no se trata de una sustitución. Lo que cambia es el '), neg('reparto'), txt(', y ese reparto importa porque, como muestra el apartado 4.2, las tres poblaciones no se comportan igual.')]),
    p('La oferta tampoco es uniforme: de las 150 combinaciones teóricas de sede, carrera y modalidad sólo existen 83. Siete carreras —Enfermería, Obstetricia, Farmacia y Bioquímica, Ingeniería Biomédica, Ciencias de la Comunicación y las dos de Tecnología Médica— se imparten únicamente en modalidad presencial, y la sede Lima Norte no ofrece la modalidad a distancia. El modelo respeta esa oferta y nunca coloca estudiantes en combinaciones inexistentes.'),

    h2('3.3 Calidad de los datos y decisiones de tratamiento'),
    h3('3.3.1 El campo «Desertor» no es utilizable como indicador prospectivo'),
    p('La base trae un campo que marca al estudiante como desertor. Contrastado con lo que después ocurre, resulta poco fiable: de los marcados como desertores, un 31,8 % sí vuelve a matricularse al semestre siguiente; y de los no marcados, un 4,7 % no vuelve.'),
    p('El modelo por tanto no usa ese campo. La continuación se mide directamente sobre los hechos: un estudiante continúa si aparece de nuevo en la base, y no continúa si no aparece. Es una definición observable y sin ambigüedad.'),

    h3('3.3.2 El semestre 2026-II estaba aún abierto'),
    p('La fecha máxima de matrícula registrada en 2026-II es el 10 de septiembre de 2026, y en los años anteriores la matrícula del segundo semestre seguía admitiendo altas hasta finales de septiembre. Es razonable concluir que 2026-II estaba todavía incompleto en el momento de la extracción.'),
    p('Esto tiene una consecuencia medible en la validación, que se documenta en el apartado 8.4: el sesgo aparente del modelo procede en su práctica totalidad de las proyecciones de ese semestre.'),

    h3('3.3.3 Registros duplicados'),
    p('Se detectó un único par estudiante-semestre duplicado en 130 130 registros. Se conserva una sola observación por estudiante y semestre, que es la unidad de análisis correcta para construir transiciones.'),

    h3('3.3.4 El etiquetado de turno de la modalidad a distancia en 2023-I'),
    p('Los 600 ingresantes a distancia de 2023-I figuran íntegramente en turno tarde, mientras que a partir de 2023-II esa misma modalidad aparece sistemáticamente en turno noche, por encima del 93 %. Es un cambio de convención de registro, no de comportamiento.'),
    p('El modelo no necesita corregirlo —la ponderación de recencia del apartado 6.6 hace que ese semestre pese poco— pero conviene tenerlo presente al comparar la composición por turno contra el inicio de la serie, como se hace en el apartado 4.5.'),
    salto(),
  ];
}

function hallazgos() {
  return [
    h1('4. Hallazgos que condicionan la especificación'),
    p('Antes de especificar un modelo conviene mirar los datos. Siete hallazgos del análisis exploratorio determinaron decisiones concretas de diseño.'),

    h2('4.1 La retención depende fuertemente del ciclo'),
    p('La probabilidad de volver a matricularse al semestre siguiente no es un número único: va del 60,5 % en el primer ciclo al 92,7 % en el noveno.'),
    ...figura('12_continuacion.png', 'Tasa de continuación por ciclo y distribución del avance de ciclo, tal como las muestra el modelo en su pestaña «Modelo y validación».', { maxAlto: 380 }),
    p('El perfil es el clásico de la educación superior: la deserción se concentra en los primeros ciclos y se reduce a medida que el estudiante avanza y el coste de abandonar crece. Un modelo con una tasa única de retención repartiría mal la matrícula entre ciclos aunque acertase el total.'),
    nota('Decisión de diseño.', 'El ciclo es la dimensión principal de la estimación de la continuación, por delante de la modalidad y de la carrera. Las celdas con poca evidencia toman prestada la estructura por ciclo, que es la que más señal contiene.'),

    h2('4.2 La modalidad de estudios parte la población en tres regímenes'),
    p('La segunda fuente de heterogeneidad, por detrás del ciclo y por delante de la carrera, es la modalidad de estudios. La diferencia se concentra en el primer ciclo y es de gran magnitud:'),
    tabla([2100, 1500, 1750, 1900, 1776],
      ['Modalidad', 'Matrícula 2026-II', 'Continuación ciclo 1', 'Continuación ciclos 2 a 9', 'Avanza un ciclo'],
      [
        ['Presencial', '13 117', '70,7 %', '88,3 %', '84,5 %'],
        ['Semi Presencial', '3 221', '56,2 %', '88,3 %', '87,9 %'],
        ['A distancia', '3 992', '41,6 %', '84,0 %', '90,4 %'],
      ]),
    pieTabla('Comportamiento por modalidad de estudios. Tasas agrupadas de las transiciones observadas, con la ponderación de recencia del apartado 6.6 y sin contracción: describen los datos, no los parámetros con que proyecta el modelo. Sin ponderar, las del primer ciclo son 71,2 %, 56,1 % y 42,1 %, en el mismo orden. El anexo A.2 recoge las tasas contraídas que el modelo emplea realmente.'),
    ...figura('11a_modalidad.png', 'La dimensión modalidad tal como la documenta el modelo: continuación por ciclo en cada modalidad y cuadro de comportamiento comparado.', { maxAlto: 420 }),
    p([txt('El patrón es nítido y tiene una lectura sencilla: la brecha '), neg('se concentra en el arranque y se cierra en el cuarto ciclo'), txt('. La separación entre la modalidad presencial y la de a distancia es de 29 puntos en el ciclo 1, de 6 en el 2, de menos de 5 en el 3 y de medio punto en el 4. Quien supera el primer año a distancia se comporta después casi igual que un estudiante presencial —entre el ciclo 5 y el 9 la modalidad a distancia incluso retiene algo mejor—. Lo que distingue a las modalidades no presenciales es la barrera de entrada, no la permanencia.')]),
    p('También difieren en el ritmo de avance: el 90,4 % de los continuadores a distancia avanza exactamente un ciclo, frente al 84,5 % de los presenciales, que repiten ciclo con mayor frecuencia (9,6 % frente a 5,1 %). Sobre seis semestres de proyección esa diferencia desplaza de forma apreciable la distribución por ciclos.'),
    p([txt('La modalidad es, en cambio, '), neg('extraordinariamente estable a nivel individual'), txt(': el 99,44 % de los continuadores conserva su modalidad de un semestre al siguiente. Las tres tasas de permanencia son 99,35 % a distancia, 99,63 % presencial y 98,52 % semipresencial.')]),
    nota('Decisión de diseño.', 'La modalidad entra en el estado del modelo como atributo conservado —igual que la sede y la carrera— y condiciona la continuación, el avance de ciclo y la transición de turno. No necesita matriz de transición propia. El apartado 5.4 desarrolla la especificación y el 6.5 mide cuánto aporta.'),

    h2('4.3 La caída de los últimos ciclos es egreso, no deserción'),
    p('La continuación se desploma en el ciclo 10 (47,1 %) y el 11 (16,3 %). Interpretarlo como deserción sería un error: esos estudiantes no abandonan, terminan la carrera.'),
    p('El comportamiento identifica además la duración del plan de cada carrera. En Derecho y Psicología la continuación del ciclo 10 sigue siendo alta (87,8 % y 93,6 %) y sólo cae en el 11: su plan tiene once ciclos. En el resto de carreras la caída ocurre en el ciclo 10, que es su ciclo terminal.'),
    p('Las carreras cuyo historial no alcanza todavía los ciclos superiores —programas de apertura reciente, y la modalidad a distancia, cuyo historial no pasa todavía del ciclo 7— están censuradas: no se puede inferir su duración de los datos. El modelo les asigna por defecto diez ciclos, valor que puede declararse explícitamente en el archivo de entrada.'),

    h2('4.4 Un 2,7 % de las matrículas son reingresos tras una pausa'),
    p('Modelar únicamente la transición de un semestre al siguiente trataría como desertor a todo estudiante que interrumpe sus estudios y regresa. El histórico muestra que eso no es marginal.'),
    tabla([2400, 1600, 1600, 1600, 1826],
      ['Rezago entre matrículas', '1 semestre', '2 semestres', '3 semestres', '4 o más'],
      [
        ['Proporción de reapariciones', '96,25 %', '2,66 %', '0,70 %', '0,39 %'],
      ]),
    pieTabla('Distribución del rezago entre matrículas consecutivas del mismo estudiante. Los rezagos de 1 a 4 semestres recogen el 99,85 % de los flujos observados.'),
    p([txt('De los 40 933 estudiantes de la base, 3 017 interrumpen y regresan al menos una vez; son 3 344 matrículas, el 2,57 % del total. En estado estacionario, un modelo que los ignorase subestimaría la matrícula en ese orden de magnitud de forma sistemática. Por eso el modelo incorpora '), neg('rezagos múltiples'), txt(' de hasta cuatro semestres, que cubren el 99,85 % de los flujos.')]),

    h2('4.5 El turno cambia, y su composición está en deriva'),
    p('Un 21,5 % de los continuadores cambia de turno de un semestre al siguiente. No es un atributo fijo del estudiante y no puede tratarse como tal.'),
    ...figura('13_turno_periodo.png', 'Matriz de transición de turno por sede y modalidad, y efectos de periodo estimados.', { maxAlto: 400 }),
    p('La matriz muestra además que cada sede tiene su propio vocabulario de turnos: Lima Sur opera con Mañana, Tarde y Noche; Lima Norte, abierta en 2026, con Diurno y Noche. El modelo estima la transición de turno por sede, de modo que nunca traslada un estudiante a un turno que su sede no ofrece.'),
    p('Más relevante para la proyección es la deriva de la composición de los ingresantes. La participación del turno noche entre los que ingresan pasa del 22,5 % en 2023-I al 70,3 % en 2026-II.'),
    tabla([1700, 1200, 1200, 1200, 1200, 1200, 1326],
      ['Turno', '2023-I', '2023-II', '2024-II', '2025-II', '2026-I', '2026-II'],
      [
        ['Mañana', '54,9 %', '29,9 %', '32,3 %', '28,3 %', '27,9 %', '16,6 %'],
        ['Noche', '22,5 %', '56,2 %', '65,9 %', '69,0 %', '56,1 %', '70,3 %'],
        ['Tarde', '22,6 %', '14,0 %', '1,9 %', '2,7 %', '1,6 %', '0,7 %'],
        ['Diurno', '—', '—', '—', '—', '14,4 %', '12,4 %'],
      ]),
    pieTabla('Composición por turno de los ingresantes. El turno Diurno aparece con la apertura de la sede Lima Norte en 2026-I.'),

    h3('4.5.1 Buena parte de esa deriva es composición por modalidad'),
    p('Conviene descomponer ese desplazamiento, porque no todo él es un cambio de preferencia. Dentro de cada modalidad, la participación del turno noche entre los ingresantes es muy distinta y mucho más estable:'),
    tabla([2100, 1300, 1300, 1300, 1300, 1726],
      ['Noche entre ingresantes', '2024-I', '2024-II', '2025-I', '2026-I', '2026-II'],
      [
        ['Presencial', '19,5 %', '33,8 %', '22,4 %', '25,8 %', '31,6 %'],
        ['Semi Presencial', '94,2 %', '92,2 %', '92,3 %', '98,8 %', '99,0 %'],
        ['A distancia', '99,4 %', '98,8 %', '92,9 %', '99,2 %', '98,6 %'],
      ]),
    pieTabla('Participación del turno noche entre los ingresantes de cada modalidad. Las modalidades no presenciales son casi íntegramente nocturnas; la presencial es mayoritariamente diurna.'),
    p([txt('Comparando dos semestres homólogos —2024-I y 2026-I, ambos primeros semestres— la participación del turno noche entre los ingresantes sube 10,7 puntos. Una descomposición al estilo de Oaxaca-Blinder atribuye '), neg('6,4 puntos al cambio de composición por modalidad'), txt(' y sólo 4,3 puntos a un desplazamiento genuino dentro de cada modalidad. Es decir: seis de cada diez puntos de la «migración al turno noche» son en realidad el crecimiento de la modalidad a distancia, que es nocturna por diseño.')]),
    nota('Decisión de diseño.', 'De aquí salen dos decisiones. Primera: la transición de turno y el reparto de turno de los ingresantes se estiman condicionando en la modalidad, no sólo en la sede (apartados 5.6 y 6.7). Segunda: se mantiene la ponderación exponencial de recencia del apartado 6.6, porque aún queda deriva intra-modalidad, pero ya no tiene que cargar sola con el efecto de composición, y su parámetro óptimo se desplaza en consecuencia.'),

    h2('4.6 Lima Norte abrió en 2026-I y todavía está desplegando su plan'),
    p('La sede Lima Norte aparece por primera vez en 2026-I y su distribución por ciclos no es la de una sede en régimen:'),
    tabla([2200, 1600, 1600, 3626],
      ['Semestre', 'Ciclo 1', 'Ciclo 2', 'Ciclos 3 a 11'],
      [
        ['2026-I', '1 930', '—', '—'],
        ['2026-II', '983', '1 289', '—'],
      ], { al: [AlignmentType.LEFT, AlignmentType.RIGHT, AlignmentType.RIGHT, AlignmentType.CENTER] }),
    pieTabla('Matrícula de Lima Norte por ciclo. La sede sólo puede ofrecer los ciclos que le ha dado tiempo a desplegar.'),
    p([txt('No es un dato incompleto: es el comportamiento de una sede que abre. En su primer semestre sólo existe el ciclo 1; en el segundo, el 1 y el 2. En 2027-I llegará hasta el 3, en 2027-II hasta el 4, y así hasta completar el plan. Lima Sur, en cambio, aparece con los once ciclos desde el primer registro de la base, porque es anterior a la ventana de datos.')]),
    p('La sede nueva tampoco replica la oferta de la antigua: Lima Norte imparte 17 de las 25 carreras y no ofrece la modalidad a distancia. Ambas restricciones —de ciclo y de oferta— se aplican en la proyección.'),
    nota('Decisión de diseño.', 'Sin un tope explícito la proyección colocaría estudiantes de Lima Norte en ciclos que la sede todavía no imparte, porque la matriz de avance permite saltos de +2 y +3 y el archivo de ingresantes puede declarar traslados a ciclos superiores. El apartado 5.7 desarrolla la restricción, que se aplica igual a cualquier sede que abra en el futuro.'),

    h2('4.7 La retención se mueve en bloque de un semestre a otro'),
    p('Al comparar la tasa agregada de continuación entre semestres se observa una variación que no puede atribuirse al azar muestral: va del 75,4 % al 80,6 %. Con decenas de miles de observaciones por semestre, el ruido binomial no explica un rango así.'),
    p('La descomposición confirma la intuición: de la varianza observada de la tasa entre semestres (2,69·10⁻⁴), sólo un 4,1 % es atribuible al muestreo y el 95,9 % restante corresponde a variación de proceso genuina.'),
    p([txt('Ahora bien, «variación de proceso» no equivale a «choque aleatorio». Una parte de ese movimiento es '), neg('predecible'), txt(': la estacionalidad entre semestres pares e impares, y el cambio de composición por modalidad. Separar los tres componentes —muestreo, parte predecible y choque genuino— es el objeto del capítulo 6, y determina la amplitud de los escenarios.')]),
    nota('Decisión de diseño.', 'El componente sistémico que queda tras descontar ciclo, modalidad y estacionalidad —común a todas las cohortes de un mismo semestre— es el que gradúa los escenarios. Es la elección econométrica central del modelo y se desarrolla en el capítulo 7.'),
    salto(),
  ];
}

module.exports = { portada, indice, resumenEjecutivo, encargo, baseHistorica, hallazgos };
