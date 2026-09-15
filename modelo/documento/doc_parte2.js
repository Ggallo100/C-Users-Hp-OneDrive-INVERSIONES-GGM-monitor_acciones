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
      children: [new TextRun({ text: 'Dimensiones: semestre · sede · carrera · modalidad · continuidad · ciclo · turno', size: 20, color: GRIS2 })],
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
    p([txt('Los continuadores no son un bloque homogéneo, y el modelo no los trata como tal. Los separa en tres grupos según cómo llegan al semestre: '), neg('regulares'), txt(' —se matricularon también el semestre inmediato anterior y cambiaron de ciclo—, '), neg('recuperados'), txt(' —también se matricularon, pero vuelven al mismo ciclo porque perdieron el que cursaban— y '), neg('reiniciados'), txt(' —interrumpieron uno o más semestres y volvieron—. Las tablas de resultados presentan esa apertura, y el apartado 1.3 explica por qué no es sólo una etiqueta.')]),

    h2('1.2 La modalidad de estudios como dimensión del modelo'),
    p([txt('Las tres modalidades que ofrece la universidad —presencial, semipresencial y a distancia— no son una etiqueta administrativa: son '), neg('tres poblaciones con comportamientos distintos'), txt('. La diferencia más importante está en el primer ciclo, donde la continuación es del 71,2 % en la modalidad presencial y del 42,1 % en la modalidad a distancia: veintinueve puntos porcentuales.')]),
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

    h2('1.3 La continuidad de la matrícula como dimensión del modelo'),
    p('La historia reciente del propio estudiante pesa más que cualquier característica de su programa, y separa dos riesgos que no se parecen. El reiniciado —el que interrumpió uno o más semestres— se cae de la matrícula: continúa el 58,2 % de las veces frente al 86,0 % de un regular, y la brecha sigue abierta al final del plan. El recuperado —el que no dejó de matricularse pero repite el ciclo que perdió— se queda: continúa el 70,7 %. Lo suyo es el avance, no la permanencia.'),
    p([txt('A igualdad de ciclo, modalidad y semestre, los momios de continuar de un reiniciado son '), neg('la quinta parte'), txt(' de los de un regular (razón de momios 0,185) y los de un recuperado, algo más del doble de esos (0,424). La diferencia tampoco se agota en la retención: el recuperado avanza de ciclo sólo el 57,4 % de las veces frente al 86,4 % de un regular, repite el 20,9 % y vuelve a repetir el semestre siguiente el 18,1 %. Un modelo que promediara los tres grupos colocaría matrícula en ciclos que nadie va a cursar.')]),
    p([txt('Por eso la condición de llegada entra en el estado del modelo. Y entra sin coste de información: '), neg('no se declara en ningún sitio ni necesita matriz de transición'), txt('. La determinan el rezago y el salto de ciclo del propio flujo —quien se rematricula al semestre siguiente llega como recuperado si vuelve al mismo ciclo y como regular si cambia de ciclo; quien vuelve tras interrumpir uno o más semestres, como reiniciado—, de modo que el desglose de las tablas sale de la recursión y suma exactamente el total.')]),
    tabla([2700, 2100, 2100, 2126],
      ['Nivel de agregación', 'Sin la dimensión', 'Con la dimensión', 'Reducción'],
      [
        ['Total institucional', '1,74 %', '1,15 %', '34,0 %'],
        ['Sede', '1,91 %', '1,15 %', '40,0 %'],
        ['Carrera', '3,47 %', '2,43 %', '30,1 %'],
        ['Sede × carrera', '3,65 %', '2,60 %', '28,9 %'],
      ]),
    pieTabla('Error fuera de muestra (EPAP) con y sin la dimensión de continuidad, medido en los niveles de agregación que existen en ambas especificaciones. En cada caso la ponderación de recencia se elige por validación cruzada dentro de la propia especificación. Apartado 6.6.'),
    p('El sesgo medio del total baja además de +187 a +32 estudiantes, una reducción de más de cinco sextos. Es con diferencia la mejora más grande que ha aportado una sola dimensión a este modelo, por delante de la modalidad.'),

    h2('1.4 Resultados de la validación'),
    p('El modelo se validó fuera de muestra con backtesting de origen móvil: se reestima con la información disponible hasta un semestre de corte y se proyecta el resto, comparando con lo que efectivamente ocurrió.'),
    tabla([3500, 1300, 1300, 1300, 1626],
      ['Nivel de agregación', 'h = 1', 'h = 2', 'h = 3', 'Celdas'],
      [
        ['Total institucional', '1,0 %', '1,0 %', '1,7 %', '1'],
        ['Sede', '1,0 %', '1,0 %', '1,7 %', '2'],
        ['Modalidad', '1,1 %', '1,2 %', '1,7 %', '3'],
        ['Continuidad', '3,6 %', '3,3 %', '1,7 %', '4'],
        ['Carrera', '2,2 %', '2,1 %', '3,8 %', '25'],
        ['Sede × carrera', '2,3 %', '2,3 %', '4,1 %', '42'],
        ['Sede × carrera × modalidad', '3,0 %', '3,2 %', '4,8 %', '83'],
        ['… × continuidad', '6,8 %', '7,0 %', '6,8 %', '225'],
        ['… × ciclo', '14,9 %', '16,6 %', '17,6 %', '812'],
        ['… × turno', '35,7 %', '45,3 %', '46,1 %', '1 151'],
      ]),
    pieTabla('Error porcentual absoluto ponderado (EPAP) fuera de muestra, por nivel de agregación y horizonte en semestres. Tres orígenes de reestimación y seis comparaciones. La columna de celdas es el número de combinaciones no vacías en 2026-II.'),
    p('El error crece al desagregar porque las celdas se vuelven diminutas: en el cruce completo muchas tienen menos de diez estudiantes y una unidad de diferencia pesa mucho en términos relativos. Por eso el modelo acompaña cada celda de su intervalo de predicción, y no sólo del punto.'),
    p([txt('Hay una excepción que conviene señalar porque rompe ese patrón: el nivel «Continuidad», con sólo cuatro celdas, tiene más error que el de carrera, con veinticinco. No es un fallo de la dimensión —la tabla del apartado 1.3 muestra que añadirla reduce el error en todos los demás niveles— sino de lo que mide: el '), cur('reparto'), txt(' entre ingresantes, regulares, recuperados y reiniciados se mueve de un semestre a otro por causas que no están en los datos, como una campaña de recuperación o un cambio en la exigencia académica. El total al que suman esas cuatro cifras es, en cambio, el nivel de menor error de la tabla. Conviene usar el desglose para dimensionar y el total para comprometer.')]),
    nota('Cómo leer esta tabla.', 'Los últimos niveles son mucho más finos que el cruce clásico sede × carrera × ciclo × turno: la modalidad parte cada celda en hasta tres y la continuidad en hasta cuatro más, de modo que las 699 celdas de la revisión anterior son ahora 1 151 y la mediana tiene menos de cinco estudiantes. Un EPAP mayor en ellos no indica peor modelo: indica celdas más pequeñas. Las comparaciones entre especificaciones de este documento se hacen todas sobre niveles que existan en ambas (apartados 1.2 y 1.3).'),

    h2('1.5 Los tres escenarios'),
    p([txt('Los escenarios no son un ± arbitrario. Se construyen a partir de un componente de varianza estimado: el '), neg('choque de periodo'), txt(', es decir, la parte de la volatilidad de la tasa de continuación que afecta a todas las cohortes de un mismo semestre a la vez y que, por tanto, no se cancela al agregar. Ese componente es estadísticamente significativo (contraste de razón de verosimilitudes χ² = 54,2 con 6 g.l., p ≈ 6,8·10⁻¹⁰) y su desviación típica es de 0,050 en escala logit.')]),
    p('Esa desviación era de 0,103 en la primera versión del modelo, de 0,068 al incorporar la modalidad y es de 0,050 al incorporar además la continuidad. La secuencia tiene una lectura precisa:'),
    tabla([3900, 1700, 1700, 1726],
      ['Especificación', 'σ del choque', 'Escenarios', 'λ de recencia'],
      [
        ['Ciclo', '0,1026', '±0,151', '0,30 (borde)'],
        ['+ modalidad', '0,0679', '±0,100', '0,40'],
        ['+ continuidad de la matrícula', '0,0502', '±0,074', '1,00'],
      ]),
    pieTabla('Efecto acumulado de identificar estructura. Cada dimensión añadida convierte en predecible una parte de lo que antes se medía como volatilidad del entorno.'),
    p([txt('Más de la mitad de lo que el modelo original contabilizaba como choque aleatorio era '), neg('composición mal atribuida'), txt(': el peso creciente de poblaciones con menor retención. Una vez identificada, deja de ser incertidumbre y se convierte en estructura. Los escenarios resultantes son más estrechos porque el modelo sabe más, no porque se haya decidido estrecharlos.')]),
    p('La última columna cuenta la misma historia desde otro ángulo, y se desarrolla en el apartado 6.7: cuanto mejor especificado está el modelo, menos necesita olvidar el pasado.'),
    nota('Diferencia clave.', 'Un escenario y un intervalo de predicción responden a preguntas distintas. El escenario describe un estado del mundo coherente —si la retención se desplaza, se desplaza para todos— y por eso es aditivo: el total de cada escenario es exactamente la suma de sus celdas, lo que permite planificar aulas, turnos y docentes. El intervalo de predicción añade además el azar de realización de cada celda y responde a dónde caerá el dato observado. El modelo entrega ambos, claramente separados.'),

    h2('1.6 Cómo se valida la amplitud del intervalo'),
    p('La amplitud del intervalo no se ajustó a ojo. Se comprobó contra el backtesting qué proporción de los valores observados cae realmente dentro del intervalo nominal del 80 %.'),
    tabla([4200, 1600, 1600, 1626],
      ['Nivel de agregación', 'h = 1', 'h = 2', 'h = 3'],
      [
        ['Total institucional', '66,7 %', '100,0 %', '100,0 %'],
        ['Modalidad', '88,9 %', '100,0 %', '100,0 %'],
        ['Continuidad', '66,7 %', '62,5 %', '75,0 %'],
        ['Carrera', '94,4 %', '98,0 %', '92,0 %'],
        ['Sede × carrera', '93,9 %', '97,5 %', '85,7 %'],
        ['Sede × carrera × modalidad', '92,9 %', '96,9 %', '91,6 %'],
        ['… × continuidad', '86,1 %', '87,1 %', '90,8 %'],
        ['… × ciclo', '85,4 %', '86,4 %', '91,1 %'],
        ['… × turno', '86,5 %', '87,6 %', '91,2 %'],
      ]),
    pieTabla('Cobertura empírica del intervalo de predicción nominal del 80 %, medida fuera de muestra.'),
    p([txt('La cobertura media en los tres niveles desagregados es del 87,2 % frente a un nominal del 80 %. El factor de inflación de varianza calibrado resultó ser '), neg('κ = 1,0'), txt(': la descomposición teórica reproduce la dispersión realmente observada sin necesidad de ensanchar el intervalo a mano. Es el resultado más sólido de la validación, porque significa que la aritmética de la incertidumbre está bien planteada y no sostenida por un factor de corrección. Ha salido 1,0 en las cuatro revisiones del modelo.')]),
    p('En el cruce más fino —el que incluye modalidad, continuidad, ciclo y turno— la cobertura pasó del 68,5 % de la primera versión al 77,4 % con la modalidad y al 86,5 % ahora. Es la mejora más visible de esta revisión: el intervalo se quedaba corto justamente donde se mezclaban poblaciones con comportamientos muy distintos; ahora esa diferencia está en el punto central y no tiene que absorberla el margen.'),
    nota('Una excepción que conviene conocer.', 'El nivel «Continuidad» —los cuatro totales institucionales de ingresantes, regulares, recuperados y reiniciados— es el único que queda por debajo del nominal, en torno al 54 %. Son cuatro celdas y doce comparaciones, de modo que el dato es ruidoso; pero apunta a algo real: el reparto entre condiciones depende de cosas que el modelo no observa —campañas de recuperación y amnistías de deuda por el lado de los reingresos, exigencia académica del semestre por el lado de las repeticiones—. El total al que suman es, en cambio, el nivel mejor cubierto. Al planificar el acompañamiento a esas poblaciones conviene tomar el intervalo como un suelo, no como una garantía. El apartado 11.1 lo recoge.'),

    h2('1.7 Entregables'),
    tabla([3000, 6026],
      ['Archivo', 'Contenido'],
      [
        ['modelo_proyeccion_matricula.html', 'El modelo. Archivo autocontenido de unos 565 KB: no requiere instalación, conexión ni servidor. Se abre con doble clic en cualquier navegador moderno.'],
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
    p('Y los continuadores se separan a su vez en tres poblaciones, según la continuidad de su matrícula:'),
    ...vinetas([
      [neg('Regulares. '), txt('Se matricularon también el semestre inmediato anterior y cambiaron de ciclo: continúan sin interrupción. Son el grueso, entre el 74 % y el 78 % de la matrícula de un segundo semestre y entre el 54 % y el 62 % de la de un primero.')],
      [neg('Recuperados. '), txt('Se matricularon también el semestre inmediato anterior, pero vuelven al mismo ciclo: perdieron el que cursaban —figuran como desertores de ese ciclo— y lo retoman al semestre siguiente. Entre el 4,5 % y el 7,3 % de la matrícula.')],
      [neg('Reiniciados. '), txt('Interrumpieron uno o más semestres y volvieron a matricularse. Entre el 2,3 % y el 4,1 %.')],
    ]),
    p('Los dos últimos grupos son pequeños en volumen y muy distintos en comportamiento, que es justo la combinación que hace que valga la pena separarlos: son poco visibles en el agregado y se comportan de forma que el promedio no describe. Y no se parecen entre sí, como desarrolla el apartado 4.3: el reiniciado es un problema de retención y el recuperado uno de avance.'),
    nota('Por qué la condición se deriva del panel y no de la marca «Desertor» de la base.', 'La base trae una columna Desertor, y la tentación sería usarla para identificar al recuperado. No se puede, por dos razones que conviene dejar por escrito. La primera es lógica: la regla interna de esa marca es «no se matriculó el semestre inmediato siguiente» —se cumple con cero excepciones en los seis semestres cerrados— de modo que, por construcción, excluye a quien sí se matriculó, que es exactamente el recuperado; definirlo con ella daría una categoría vacía. La segunda es de vigencia: la marca está congelada a una fecha anterior a la campaña de 2026-II, y por eso señala como desertores al 65,5 % de los matriculados de 2026-I y al 0 % de los de 2026-II. La marca está bien construida para lo suyo —los 3 133 no marcados que tampoco continúan son, en un 96 %, estudiantes del último ciclo de su plan, es decir egresados y no desertores— pero mide otra cosa. La condición del modelo se deriva del propio panel de matrículas, que es lo observable y lo que el modelo proyecta.'),
    p('El encargo consiste en proyectar el total —ingresantes más continuadores, con esa apertura— desagregado por semestre académico, sede, carrera, modalidad de estudios, ciclo de estudios y turno, con tres escenarios estadísticamente validados y un horizonte configurable.'),

    h2('2.2 Dimensiones de la proyección'),
    tabla([2200, 1100, 5726],
      ['Dimensión', 'Valores', 'Observaciones'],
      [
        ['Semestre académico', 'configurable', 'Nomenclatura AAAA-I y AAAA-II. El primer semestre proyectable es 2027-I; el horizonte se elige entre 1 y 24 semestres.'],
        ['Sede', '2 + nuevas', 'Lima Sur y Lima Norte. Ningún estudiante del histórico cambia de sede, así que la sede se conserva a lo largo de la proyección. Una sede recién abierta despliega su plan ciclo a ciclo (apartado 5.7).'],
        ['Carrera', '25 + nuevas', 'Sólo un 0,4 % de los continuadores cambia de carrera, de modo que la carrera también se conserva. El archivo de entrada admite programas que no existen en el histórico.'],
        ['Modalidad de estudios', '3', 'Presencial, Semi Presencial y A distancia. El 99,4 % de los continuadores la conserva, así que se trata como atributo fijo; pero condiciona la continuación, el avance y el turno (apartado 5.4).'],
        ['Continuidad de la matrícula', '4', 'Ingresante, y tres clases de continuador: regular, recuperado y reiniciado. No se declara ni se estima: la determinan el rezago y el salto de ciclo del flujo que trae al estudiante al semestre (apartado 5.5).'],
        ['Ciclo de estudios', '1 a 11', 'El ciclo terminal depende del plan: 11 en Derecho y Psicología, 10 en el resto.'],
        ['Turno', '4', 'Mañana, Tarde y Noche en Lima Sur; Diurno y Noche en Lima Norte. El turno sí cambia entre semestres y se modela explícitamente.'],
      ], { al: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.LEFT] }),
    pieTabla('Dimensiones de la proyección y su tratamiento en el modelo.'),
    nota('Sobre el turno.', 'El archivo de entrada no declara el turno de los ingresantes, tal como pide el encargo: el reparto se estima matemáticamente. El apartado 6.7 explica cómo, y el apartado 4.5 por qué no puede darse por constante.'),
    nota('Sobre la modalidad.', 'La plantilla de entrada sí incluye una columna de modalidad, y conviene rellenarla: es la diferencia entre proyectar una cohorte con su retención real y proyectarla con la media de las tres. Si se deja vacía, el modelo la estima con la composición histórica de esa sede y esa carrera, restringida a la oferta que realmente existe (apartado 6.9).'),
    nota('Sobre la continuidad.', 'Ésta no se declara en absoluto, y no puede declararse: el archivo de entrada sólo contiene ingresantes, que por definición llegan sin historia. La condición aparece en la proyección porque la genera la propia recursión, y por eso no añade ningún supuesto del usuario al resultado.'),

    h2('2.3 Por qué un modelo de cohortes y no una extrapolación de la serie'),
    p('La tentación inmediata ante una serie de matrícula es ajustar una tendencia y prolongarla. Sería un error en este caso, por tres razones.'),
    ...numerada([
      [neg('La serie tiene estructura interna conocida. '), txt('La matrícula de 2028-I no es un punto de una serie: es lo que queda de las cohortes de 2027-II más lo que ingrese. Ignorar esa contabilidad desaprovecha información que está en los datos.')],
      [neg('El encargo exige desagregación. '), txt('Una extrapolación del total no dice cuántos estudiantes habrá en el ciclo 4 de Ingeniería Civil en modalidad semipresencial y turno noche, ni cuántos de ellos vuelven de una interrupción, que es justo lo que se necesita para programar aulas, docentes y acompañamiento académico.')],
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

    h2('3.3 La composición por continuidad de la matrícula'),
    p('La tercera apertura estructural, y la que motiva esta revisión del modelo, separa a los continuadores según si su matrícula viene seguida o retomada tras una pausa.'),
    tabla([1650, 922, 922, 922, 922, 922, 922, 922, 922],
      ['Condición', '23-I', '23-II', '24-I', '24-II', '25-I', '25-II', '26-I', '26-II'],
      [
        ['Ingresantes', '4 681', '2 144', '4 697', '2 108', '5 352', '2 160', '7 311', '3 560'],
        ['Regulares', '7 918', '10 187', '10 019', '12 004', '11 616', '13 670', '13 238', '16 175'],
        ['Reiniciados', '—', '—', '242', '347', '425', '419', '687', '486'],
        ['Recuperados', '—', '—', '105', '76', '105', '104', '184', '109'],
      ], { tam: 17 }),
    pieTabla('Matrícula por condición de llegada. Los guiones no son ceros: son semestres en los que la categoría todavía no puede observarse.'),
    nota('Un artefacto de la ventana, no un hecho.', 'Para ver a un recuperado hace falta un semestre previo y para ver a un reiniciado, dos: 2023-I no aporta ninguna observación de ninguna de las dos categorías y 2023-II sólo de recuperados. Las cifras en blanco del arranque no deben leerse como que no hubiera repeticiones ni reingresos, y el modelo tampoco las lee así: la estimación de cada tasa sólo usa los semestres en los que la categoría es observable.'),
    p([txt('Una vez la ventana lo permite, las proporciones son estables: los reiniciados oscilan entre el 2,3 % y el 4,1 % de la matrícula y los recuperados entre el 4,5 % y el 7,3 %. Juntos rondan el '), neg('9 % de la matrícula de cada semestre'), txt(', del orden de 1 800 estudiantes. Es poco volumen y mucha diferencia de comportamiento, que es exactamente el caso en que separar una población compensa.')]),

    h2('3.4 Calidad de los datos y decisiones de tratamiento'),
    h3('3.4.1 El campo «Desertor» no es utilizable como indicador prospectivo'),
    p('La base trae un campo que marca al estudiante como desertor. Contrastado con lo que después ocurre, resulta poco fiable: de los marcados como desertores, un 31,8 % sí vuelve a matricularse al semestre siguiente; y de los no marcados, un 4,7 % no vuelve.'),
    p('El modelo por tanto no usa ese campo. La continuación se mide directamente sobre los hechos: un estudiante continúa si aparece de nuevo en la base, y no continúa si no aparece. Es una definición observable y sin ambigüedad.'),

    h3('3.4.2 El semestre 2026-II estaba aún abierto'),
    p('La fecha máxima de matrícula registrada en 2026-II es el 10 de septiembre de 2026, y en los años anteriores la matrícula del segundo semestre seguía admitiendo altas hasta finales de septiembre. Es razonable concluir que 2026-II estaba todavía incompleto en el momento de la extracción.'),
    p('Esto tiene una consecuencia medible en la validación, que se documenta en el apartado 8.4: el sesgo aparente del modelo procede en su práctica totalidad de las proyecciones de ese semestre.'),

    h3('3.4.3 Registros duplicados'),
    p('Se detectó un único par estudiante-semestre duplicado en 130 130 registros. Se conserva una sola observación por estudiante y semestre, que es la unidad de análisis correcta para construir transiciones.'),

    h3('3.4.4 El etiquetado de turno de la modalidad a distancia en 2023-I'),
    p('Los 600 ingresantes a distancia de 2023-I figuran íntegramente en turno tarde, mientras que a partir de 2023-II esa misma modalidad aparece sistemáticamente en turno noche, por encima del 93 %. Es un cambio de convención de registro, no de comportamiento.'),
    p('El modelo no necesita corregirlo —la ponderación de recencia del apartado 6.7 hace que ese semestre pese poco— pero conviene tenerlo presente al comparar la composición por turno contra el inicio de la serie, como se hace en el apartado 4.5.'),
    salto(),
  ];
}

function hallazgos() {
  return [
    h1('4. Hallazgos que condicionan la especificación'),
    p('Antes de especificar un modelo conviene mirar los datos. Ocho hallazgos del análisis exploratorio determinaron decisiones concretas de diseño.'),

    h2('4.1 La retención depende fuertemente del ciclo'),
    p('La probabilidad de volver a matricularse al semestre siguiente no es un número único: va del 61,1 % en el primer ciclo al 93,2 % en el noveno.'),
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
    pieTabla('Comportamiento por modalidad de estudios. Tasas agrupadas de las transiciones observadas, sin contracción: describen los datos, no los parámetros con que proyecta el modelo. Con λ = 1,00 la ponderación de recencia es neutra, de modo que coinciden con las tasas sin ponderar. El anexo A.2 recoge las tasas contraídas que el modelo emplea realmente.'),
    ...figura('11a_modalidad.png', 'La dimensión modalidad tal como la documenta el modelo: continuación por ciclo en cada modalidad y cuadro de comportamiento comparado.', { maxAlto: 420 }),
    p([txt('El patrón es nítido y tiene una lectura sencilla: la brecha '), neg('se concentra en el arranque y se cierra en el cuarto ciclo'), txt('. La separación entre la modalidad presencial y la de a distancia es de 29 puntos en el ciclo 1, de 6 en el 2, de menos de 5 en el 3 y de medio punto en el 4. Quien supera el primer año a distancia se comporta después casi igual que un estudiante presencial —entre el ciclo 5 y el 9 la modalidad a distancia incluso retiene algo mejor—. Lo que distingue a las modalidades no presenciales es la barrera de entrada, no la permanencia.')]),
    p('También difieren en el ritmo de avance: el 90,4 % de los continuadores a distancia avanza exactamente un ciclo, frente al 84,5 % de los presenciales, que repiten ciclo con mayor frecuencia (9,6 % frente a 5,1 %). Sobre seis semestres de proyección esa diferencia desplaza de forma apreciable la distribución por ciclos.'),
    p([txt('La modalidad es, en cambio, '), neg('extraordinariamente estable a nivel individual'), txt(': el 99,44 % de los continuadores conserva su modalidad de un semestre al siguiente. Las tres tasas de permanencia son 99,35 % a distancia, 99,63 % presencial y 98,52 % semipresencial.')]),
    nota('Decisión de diseño.', 'La modalidad entra en el estado del modelo como atributo conservado —igual que la sede y la carrera— y condiciona la continuación, el avance de ciclo y la transición de turno. No necesita matriz de transición propia. El apartado 5.4 desarrolla la especificación y el 6.5 mide cuánto aporta.'),

    h2('4.3 Interrumpir y repetir son dos riesgos distintos'),
    p('El hallazgo de mayor magnitud de todo el análisis no está en ninguna característica del programa, sino en la historia reciente del propio estudiante. Clasificando cada matrícula según cómo se llega a ella:'),
    tabla([1900, 1300, 1700, 1500, 1350, 1376],
      ['Condición de llegada', 'Observaciones', 'Continúa al semestre siguiente', 'Avanza un ciclo', 'Repite ciclo', 'Retrocede'],
      [
        ['Regular', '73 063', '86,0 %', '86,4 %', '8,5 %', '2,2 %'],
        ['Recuperado', '5 589', '70,7 %', '57,4 %', '20,9 %', '3,8 %'],
        ['Ingresante', '28 453', '61,6 %', '92,4 %', '5,2 %', '0,2 %'],
        ['Reiniciado', '2 694', '58,2 %', '68,5 %', '18,3 %', '5,5 %'],
      ]),
    pieTabla('Comportamiento según la continuidad de la matrícula. Valores crudos sobre los orígenes con destino observable; las observaciones son el recuento sin ponderar. «Continúa» es matricularse en el semestre inmediato siguiente, que es la variable del contraste del apartado 6.4; las tres últimas columnas se calculan sobre los que vuelven dentro de la ventana de cuatro rezagos.'),
    p([txt('Lo que la tabla separa son '), neg('dos problemas que no se parecen'), txt(', y que un modelo que tratara a todos los continuadores por igual mezclaría en una sola tasa media.')]),
    ...vinetas([
      [neg('El reiniciado pierde matrícula. '), txt('Continúa el 58,2 % de las veces, veintiocho puntos por debajo de un regular y aún por debajo de un ingresante. Es un problema de retención puro.')],
      [neg('El recuperado pierde tiempo. '), txt('Continúa el 70,7 %, doce puntos y medio por encima del reiniciado: no se cae de la universidad, porque de hecho nunca llegó a irse. Lo que hace es no avanzar: sólo el 57,4 % cambia de ciclo, frente al 86,4 % de un regular.')],
    ]),
    p([txt('La diferencia de retención no es un efecto de composición por ciclo, y el contraste separa a los dos grupos con holgura: controlando ciclo, modalidad y semestre en un modelo logit, los momios de continuar de un reiniciado son '), neg('la quinta parte'), txt(' de los de un regular (razón de momios 0,185), mientras que los de un recuperado son algo más de '), neg('el doble de esos'), txt(' (0,424). No son dos etiquetas de una misma población frágil: son dos poblaciones. El apartado 6.4 da el contraste completo.')]),
    ...figura('11c_condicion.png', 'La dimensión de continuidad tal como la documenta el modelo: continuación por ciclo de cada condición y cuadro de comportamiento comparado.', { maxAlto: 430 }),
    p([txt('Las dos brechas se comportan además de forma distinta a lo largo del plan, y ése es el argumento para no fundirlas. La del '), neg('reiniciado apenas se estrecha'), txt(': veintinueve puntos en el ciclo 2 (55,0 % frente al 84,3 % de un regular) y todavía veintidós en el ciclo 9 (72,7 % frente a 94,4 %). Es una cicatriz. La del '), neg('recuperado se cierra a la mitad'), txt(': de doce puntos en el ciclo 2 (72,7 % frente a 84,3 %) a menos de ocho en el ciclo 9 (86,8 % frente a 94,4 %). Quien repite un ciclo y lo supera vuelve a parecerse a cualquier otro estudiante; quien se ausentó un semestre, no del todo.')]),

    h3('4.3.1 El recuperado se acumula en los ciclos bajos'),
    p('Conviene detenerse en el recuperado porque su efecto sobre la proyección no es el que sugiere la intuición. No reduce la matrícula futura: la desplaza hacia atrás en el plan de estudios.'),
    tabla([2226, 1360, 1360, 1360, 1360, 1360],
      ['Condición de llegada', 'Retrocede', 'Repite', 'Avanza +1', 'Adelanta +2', 'Convalida +3'],
      [
        ['Regular', '2,2 %', '8,5 %', '86,4 %', '1,8 %', '1,0 %'],
        ['Recuperado', '3,8 %', '20,9 %', '57,4 %', '16,5 %', '1,5 %'],
        ['Reiniciado', '5,5 %', '18,3 %', '68,5 %', '5,1 %', '2,6 %'],
        ['Ingresante', '0,2 %', '5,2 %', '92,4 %', '1,5 %', '0,8 %'],
      ]),
    pieTabla('Distribución observada del salto de ciclo entre los que continúan, por condición de llegada.'),
    p([txt('El perfil del recuperado es inconfundible: repite el 20,9 % de las veces —dos veces y media más que un regular— pero también '), neg('adelanta dos ciclos el 16,5 %'), txt(' de las veces, nueve veces más que un regular. Las dos cifras son la misma historia contada en dos momentos: el estudiante que repite un ciclo lo hace arrastrando parte de sus cursos, y cuando por fin lo supera puede recuperar el curso perdido de golpe. Su avance medio acaba siendo de 0,871 ciclos por semestre matriculado, muy cerca de los 0,896 de un regular y por encima de los 0,813 del reiniciado.')]),
    p('El efecto neto sobre la proyección es de composición, no de nivel: durante uno o dos semestres esos estudiantes ocupan plaza en ciclos que ya habían cursado. Para planificar secciones y aulas eso importa más que el total, porque la demanda no aparece donde la colocaría una progresión lineal.'),
    p([txt('La condición tiene además '), neg('persistencia propia'), txt(': de los recuperados que continúan, el 18,1 % vuelve a repetir ciclo, frente al 7,6 % de los regulares. Repetir un ciclo multiplica por 2,4 la probabilidad de repetir el siguiente. No es un sorteo independiente cada semestre, y por eso la condición tiene que formar parte del estado y no ser una etiqueta calculada al final.')]),

    h3('4.3.2 La cicatriz del reiniciado decae, pero no se cierra en un semestre'),
    p('Del lado del reiniciado la pregunta relevante es cuánto dura el efecto. Tomando a los estudiantes que interrumpieron de verdad —los que dejaron de estar matriculados— y contando los semestres transcurridos desde su regreso:'),
    tabla([3000, 1500, 1500, 1500, 1526],
      ['Semestres desde el regreso', '0 (el regreso)', '1', '2', 'Nunca interrumpió'],
      [
        ['Continúa al semestre siguiente', '58,2 %', '69,2 %', '74,8 %', '85,2 %'],
        ['Observaciones', '2 694', '1 081', '564', '76 668'],
      ]),
    pieTabla('Recuperación de la tasa de continuación tras un reingreso. La columna de comparación son los continuadores que nunca interrumpieron; se excluye al ingresante, cuya tasa es baja por motivos ajenos a la cicatriz. Ésta se atenúa pero no ha desaparecido dos semestres después.'),
    nota('Decisión de diseño, y su límite.', 'La condición entra en el estado del modelo con memoria de un semestre: quien vuelve de una interrupción es reiniciado en el semestre del regreso, y pasa a regular o a recuperado en el siguiente. Eso captura el grueso del efecto —el salto de 58 % a 85 % es el que mueve la aritmética— pero no la cola. De los 73 063 orígenes regulares, 1 367 vienen en realidad de una interrupción reciente y continúan al 72,6 % en vez de al 86,0 %. Son el 1,9 % del grupo, de modo que el sesgo que introduce en la tasa agregada de los regulares es de un cuarto de punto. Está medido y es pequeño, pero conviene conocerlo; el apartado 11.1 lo recoge como limitación.'),

    h2('4.4 La caída de los últimos ciclos es egreso, no deserción'),
    p('La continuación se desploma en el ciclo 10 (48,5 %) y el 11 (18,1 %). Interpretarlo como deserción sería un error: esos estudiantes no abandonan, terminan la carrera.'),
    p('El comportamiento identifica además la duración del plan de cada carrera. En Derecho y Psicología la continuación del ciclo 10 sigue siendo alta (87,8 % y 93,6 %) y sólo cae en el 11: su plan tiene once ciclos. En el resto de carreras la caída ocurre en el ciclo 10, que es su ciclo terminal.'),
    p('Las carreras cuyo historial no alcanza todavía los ciclos superiores —programas de apertura reciente, y la modalidad a distancia, cuyo historial no pasa todavía del ciclo 7— están censuradas: no se puede inferir su duración de los datos. El modelo les asigna por defecto diez ciclos, valor que puede declararse explícitamente en el archivo de entrada.'),

    h2('4.5 Un 2,7 % de las matrículas son reingresos tras una pausa'),
    p('Modelar únicamente la transición de un semestre al siguiente trataría como desertor a todo estudiante que interrumpe sus estudios y regresa. El histórico muestra que eso no es marginal.'),
    tabla([2400, 1600, 1600, 1600, 1826],
      ['Rezago entre matrículas', '1 semestre', '2 semestres', '3 semestres', '4 o más'],
      [
        ['Proporción de reapariciones', '96,25 %', '2,66 %', '0,70 %', '0,39 %'],
      ]),
    pieTabla('Distribución del rezago entre matrículas consecutivas del mismo estudiante. Los rezagos de 1 a 4 semestres recogen el 99,85 % de los flujos observados.'),
    p([txt('De los 40 933 estudiantes de la base, 3 017 interrumpen y regresan al menos una vez; son 3 344 matrículas, el 2,57 % del total. En estado estacionario, un modelo que los ignorase subestimaría la matrícula en ese orden de magnitud de forma sistemática. Por eso el modelo incorpora '), neg('rezagos múltiples'), txt(' de hasta cuatro semestres, que cubren el 99,85 % de los flujos.')]),

    h2('4.6 El turno cambia, y su composición está en deriva'),
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

    h3('4.6.1 Buena parte de esa deriva es composición por modalidad'),
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
    nota('Decisión de diseño.', 'De aquí salen dos decisiones. Primera: la transición de turno y el reparto de turno de los ingresantes se estiman condicionando en la modalidad, no sólo en la sede (apartados 5.7 y 6.8). Segunda: se mantiene la ponderación exponencial de recencia del apartado 6.7, porque aún queda deriva intra-modalidad, pero ya no tiene que cargar sola con el efecto de composición, y su parámetro óptimo se desplaza en consecuencia.'),

    h2('4.7 Lima Norte abrió en 2026-I y todavía está desplegando su plan'),
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

    h2('4.8 La retención se mueve en bloque de un semestre a otro'),
    p('Al comparar la tasa agregada de continuación entre semestres se observa una variación que no puede atribuirse al azar muestral: va del 75,4 % al 80,6 %. Con decenas de miles de observaciones por semestre, el ruido binomial no explica un rango así.'),
    p('La descomposición confirma la intuición: de la varianza observada de la tasa entre semestres (2,69·10⁻⁴), sólo un 4,1 % es atribuible al muestreo y el 95,9 % restante corresponde a variación de proceso genuina.'),
    p([txt('Ahora bien, «variación de proceso» no equivale a «choque aleatorio». Una parte de ese movimiento es '), neg('predecible'), txt(': la estacionalidad entre semestres pares e impares, y el cambio de composición por modalidad. Separar los tres componentes —muestreo, parte predecible y choque genuino— es el objeto del capítulo 6, y determina la amplitud de los escenarios.')]),
    nota('Decisión de diseño.', 'El componente sistémico que queda tras descontar ciclo, modalidad y estacionalidad —común a todas las cohortes de un mismo semestre— es el que gradúa los escenarios. Es la elección econométrica central del modelo y se desarrolla en el capítulo 7.'),
    salto(),
  ];
}

module.exports = { portada, indice, resumenEjecutivo, encargo, baseHistorica, hallazgos };
