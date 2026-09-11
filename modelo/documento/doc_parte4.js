/* Capítulos 8 a 11 y anexos. */
const U = require('./doc_parte1.js');
const {
  Paragraph, TextRun, AlignmentType, BorderStyle,
  AZUL, AMBAR, GRIS, FONDO, ANCHO_TABLA,
  p, neg, txt, cur, mono, h1, h2, h3, formula, nota, vinetas, numerada,
  tabla, figura, pieTabla, salto,
} = U;

function validacion() {
  return [
    h1('8. Validación estadística'),
    h2('8.1 El procedimiento'),
    p('La validación se hizo por backtesting de origen móvil, que es el procedimiento estándar para modelos de proyección temporal y el único que evita contaminar la evaluación con información del futuro.'),
    ...numerada([
      'Se fija un semestre de corte y se descarta todo lo posterior.',
      'Se reestima el modelo completo —tablas de transición, constantes de contracción y ponderación de recencia— usando exclusivamente los datos hasta ese corte.',
      'Se proyectan los semestres siguientes, alimentando el modelo con los ingresantes realmente observados —con su modalidad real— para aislar el error del modelo del error del supuesto de admisión.',
      'Se compara con la matrícula efectivamente registrada, en los ocho niveles de agregación.',
      'Se repite desplazando el corte.',
    ]),
    p([txt('Es esencial que la reestimación sea completa en cada corte. Si las constantes de contracción o λ se hubieran fijado con toda la muestra y sólo se reproyectara, el ejercicio filtraría información del futuro y los errores saldrían artificialmente bajos. Aquí se recalcula todo, incluida la selección de λ del apartado 6.6, que se ejecutó '), cur('dentro'), txt(' del bucle de validación, y lo mismo vale para el contraste de especificación del apartado 6.5.')]),
    p('Con ocho semestres de historia y la exigencia de al menos cinco para estimar, resultan tres orígenes de reestimación (hasta 2025-I, 2025-II y 2026-I) y seis comparaciones origen-horizonte.'),

    h2('8.2 La métrica'),
    p('Se emplea el error porcentual absoluto ponderado (EPAP, o WAPE en la literatura anglosajona):'),
    ...formula([
      '          Σ | proyectado_i − observado_i |',
      'EPAP =   ─────────────────────────────────',
      '                Σ  observado_i',
    ]),
    p('Se prefiere al error porcentual absoluto medio (EPAM) porque este último otorga el mismo peso a una celda de 800 estudiantes que a una de 3, y basta con unas pocas celdas diminutas para que el promedio pierda todo significado. El EPAP pondera cada celda por su matrícula, que es lo que importa cuando el resultado se usa para dimensionar recursos.'),
    nota('Sobre la comparación entre revisiones.', 'El EPAP depende del nivel de agregación en que se mide, y añadir la modalidad parte cada celda en hasta tres. Comparar el cruce más fino de esta revisión con el de la anterior no diría nada, porque no son la misma partición. Las comparaciones entre especificaciones de este documento —apartados 1.2 y 6.5— se hacen todas sobre niveles que existen en ambas.'),

    h2('8.3 Resultados'),
    ...figura('15_validacion.png', 'Tablas de validación dentro del propio modelo: error por nivel de agregación y cobertura empírica del intervalo.', { maxAlto: 470 }),
    tabla([1600, 1650, 1250, 1300, 1500, 1726],
      ['Ajustado hasta', 'Proyectado', 'Horizonte', 'Observado', 'Proyectado', 'Error'],
      [
        ['2025-I', '2025-II', '1', '16 353', '16 556', '+1,24 %'],
        ['2025-I', '2026-I', '2', '21 420', '21 257', '−0,76 %'],
        ['2025-I', '2026-II', '3', '20 330', '20 933', '+2,96 %'],
        ['2025-II', '2026-I', '1', '21 420', '21 084', '−1,57 %'],
        ['2025-II', '2026-II', '2', '20 330', '20 528', '+0,98 %'],
        ['2026-I', '2026-II', '1', '20 330', '20 817', '+2,40 %'],
      ]),
    pieTabla('Detalle del backtesting sobre el total institucional.'),
    p('El error a un semestre vista se mueve entre el 1,24 % y el 2,40 %, con una media del 1,73 %. Para una institución de veinte mil estudiantes, eso supone un error medio del orden de 350 estudiantes sobre el total. La revisión anterior del modelo, sin la dimensión de modalidad, promediaba un 2,16 % a ese mismo horizonte.'),

    h2('8.4 El sesgo y la matrícula abierta de 2026-II'),
    p('El sesgo medio del total es de +165 estudiantes: el modelo proyecta algo por encima. Conviene explicar de dónde procede.'),
    p([txt('Las tres comparaciones que apuntan a 2026-II tienen sesgo positivo (+603, +198 y +487); las tres que apuntan a otros semestres suman un sesgo medio de '), neg('−99 estudiantes'), txt(', es decir, medio punto porcentual por debajo sobre una matrícula de más de veinte mil. Excluir el semestre sospechoso no sólo reduce el sesgo: le cambia el signo.')]),
    tabla([3400, 2700, 2926],
      ['Conjunto de comparaciones', 'Sesgo medio', 'Sobre la matrícula'],
      [
        ['Las seis comparaciones', '+165 estudiantes', '+0,81 %'],
        ['Sólo las que apuntan a 2026-II', '+429 estudiantes', '+2,11 %'],
        ['Excluyendo 2026-II', '−99 estudiantes', '−0,50 %'],
      ], { al: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.CENTER] }),
    pieTabla('Descomposición del sesgo del backtesting según el semestre proyectado.'),
    p('Esto es coherente con el hallazgo del apartado 3.3.2: la matrícula de 2026-II seguía abierta en la fecha de extracción. El modelo no está sobreestimando; está proyectando una matrícula completa contra un dato aún incompleto. Una vez descontado ese semestre, el sesgo residual es pequeño y de signo contrario, que es lo que cabe esperar de un estimador sin sesgo sistemático evaluado sobre tres observaciones.'),
    nota('Cómo comprobarlo.', 'Cuando se disponga del cierre definitivo de 2026-II, basta con volver a ejecutar la estimación: si la interpretación es correcta, el sesgo de esas tres comparaciones debe reducirse sustancialmente. El procedimiento es reproducible y queda documentado en el Excel de exportación.'),
    p('Es relevante además que el contraste de especificación del apartado 6.5 apunte en la misma dirección: incorporar la modalidad reduce el sesgo medio de +259 a +153 estudiantes sobre los mismos datos. Parte de lo que parecía sobreestimación sistemática era, en realidad, aplicar a una población creciente de estudiantes a distancia la retención media de las tres modalidades.'),

    h2('8.5 Qué se puede afirmar y qué no'),
    p('La validación se apoya en tres orígenes y seis comparaciones. Es la información disponible, y conviene ser explícito sobre su alcance.'),
    ...vinetas([
      [neg('Se puede afirmar: '), txt('que el modelo no está sesgado de forma apreciable una vez se descuenta el semestre incompleto; que su error a un semestre vista en el total es del orden del 1,7 %; que la aritmética de la incertidumbre está bien planteada, porque el factor de inflación calibrado es 1,0; y que la dimensión de modalidad mejora la proyección en todos los niveles comparables.')],
      [neg('No se puede afirmar: '), txt('que el error vaya a mantenerse exactamente en ese nivel, ni que la mejora por incorporar la modalidad sea exactamente del 17 % en el total. Seis comparaciones no permiten estimar con precisión la distribución del error, y el horizonte 3 se apoya en una sola observación. Las cifras del horizonte 3 deben tomarse como indicativas.')],
      [neg('Conviene repetir: '), txt('cada semestre nuevo añade un origen de validación. El procedimiento está automatizado y reejecutarlo con datos actualizados no requiere trabajo adicional.')],
    ]),
    salto(),
  ];
}

function manual() {
  return [
    h1('9. Manual de uso'),
    h2('9.1 Puesta en marcha'),
    p([txt('El modelo es un único archivo, '), mono('modelo_proyeccion_matricula.html'), txt('. Se abre con doble clic en cualquier navegador moderno. No necesita instalación, servidor ni conexión a internet: todos los datos y el motor de cálculo viajan dentro del archivo. Puede copiarse, enviarse por correo o guardarse en una carpeta compartida.')]),
    p('Al abrirlo, el modelo ya muestra una proyección calculada con un supuesto de referencia —repetir el último ingreso observado del semestre de la misma paridad, con su composición por modalidad— claramente señalado como marcador de posición. Sirve para explorar la herramienta antes de disponer del archivo de admisión; no es una previsión.'),
    ...figura('01_cabecera.png', 'Vista inicial del modelo: cinta de acciones, barra de control y pestaña de resumen.', { maxAlto: 400 }),

    h2('9.2 La plantilla de ingresantes'),
    p([txt('El botón '), neg('«Plantilla»'), txt(' descarga un Excel de tres hojas:')]),
    ...vinetas([
      [neg('Instrucciones. '), txt('Descripción de cada columna, tratamiento de los programas nuevos y nomenclatura de semestres.')],
      [neg('Ingresantes. '), txt('La hoja que hay que editar. Viene precargada con el último ingreso observado de cada paridad, desglosado por modalidad, de modo que se parte de una base realista y sólo hay que ajustar las cifras.')],
      [neg('Catálogos. '), txt('Sedes con sus turnos disponibles, sus modalidades y su ciclo máximo ofertable; y carreras con los ciclos de su plan y las modalidades en que se imparten, para escribir los nombres exactamente como los espera el modelo.')],
    ]),
    tabla([1700, 1200, 6126],
      ['Columna', 'Obligatoria', 'Contenido'],
      [
        ['Periodo', 'Sí', 'Semestre académico: 2027-I, 2027-II. También se admite el formato 202701.'],
        ['Sede', 'Sí', 'Debe coincidir con el catálogo para heredar el patrón de turno de esa sede. Una sede que no figure se entiende que abre en el primer semestre en que aparezca, con despliegue progresivo del plan.'],
        ['Carrera', 'Sí', 'Si no figura en el catálogo, se trata como programa nuevo.'],
        ['Modalidad', 'Recomendada', 'Presencial, Semi Presencial o A distancia. Se reconocen sinónimos habituales (virtual, online, blended, híbrida, semipresencial). Si se deja vacía, el modelo la estima por el apartado 6.8 y lo advierte.'],
        ['Ciclo', 'Sí', 'Ciclo al que ingresa: 1 en la admisión ordinaria, mayor que 1 en traslados y convalidaciones.'],
        ['Nuevos', 'Sí', 'Número de ingresantes de esa combinación.'],
        ['CiclosPlan', 'No', 'Ciclos totales del plan. Sólo hace falta para un programa nuevo cuya duración no sea de diez ciclos.'],
      ], { al: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.LEFT] }),
    pieTabla('Columnas del archivo de entrada. El lector reconoce además sinónimos habituales de cada encabezado.'),
    nota('El turno no se declara; la modalidad sí conviene declararla.', 'Tal como pide el encargo, el archivo de entrada no lleva columna de turno: el modelo lo estima con el procedimiento del apartado 6.7 y muestra el reparto resultante en la pestaña «Ingresantes», indicando en cada fila el nivel de evidencia empleado. La modalidad es distinta: es un dato que el área de admisión conoce y que el modelo no puede deducir. Si falta, se estima —y el modelo lo advierte fila por fila— pero la proyección pierde precisión.'),
    p([txt('Un archivo preparado con la plantilla anterior, sin columna de modalidad, '), neg('sigue funcionando'), txt(': el modelo lo detecta, avisa de cuántas filas ha tenido que estimar y aplica el reparto del apartado 6.8. No hay que rehacer nada para seguir usándolo.')]),

    h2('9.3 Cargar el archivo'),
    p([txt('El botón '), neg('«Cargar ingresantes»'), txt(' abre el selector de archivos y admite .xlsx y .csv. Tras la carga, el modelo:')]),
    ...numerada([
      'Ajusta automáticamente el horizonte al último semestre presente en el archivo.',
      'Identifica las carreras y sedes que no existen en el histórico y las marca como nuevas.',
      'Avisa de cuántas filas declaran modalidad y cuántas ha tenido que estimar.',
      'Avisa si alguna fila declara un ciclo superior al del plan de la carrera o al que la sede puede ofrecer todavía, y lo ajusta al máximo disponible.',
      'Advierte si el archivo contiene semestres anteriores o iguales al último observado, que no se proyectan.',
      'Recalcula y repinta toda la proyección.',
    ]),
    ...figura('09_ingresantes_estado.png', 'Resumen del archivo cargado y avisos de validación, incluida la detección del programa nuevo y el recuento de modalidades declaradas.', { maxAlto: 260 }),

    h2('9.4 Elegir el horizonte'),
    p([txt('El campo '), neg('«Semestres a proyectar»'), txt(' admite de 1 a 24 semestres. Debajo se muestra el intervalo resultante con la nomenclatura de la universidad, de modo que no hay ambigüedad sobre qué se está proyectando: con 6 semestres desde 2026-II, el intervalo es 2027-I → 2029-II.')]),
    p('La nomenclatura sigue el sistema institucional: el año seguido de I para el primer semestre y II para el segundo. El modelo la aplica en pantalla, en la plantilla y en todas las exportaciones.'),
    nota('Sobre horizontes largos.', 'La validación cubre hasta tres semestres. Proyectar doce es técnicamente posible y la recursión sigue siendo válida, pero a partir del cuarto o quinto semestre la práctica totalidad de la matrícula proviene de ingresantes supuestos por el usuario, de modo que el resultado refleja sobre todo ese supuesto —incluida la composición por modalidad que se haya declarado. El intervalo de predicción se ensancha en consecuencia y debe leerse con atención.'),

    h2('9.5 Leer los resultados'),
    h3('9.5.1 Resumen'),
    p('La pestaña de resumen presenta los indicadores principales, la serie histórica empalmada con la proyección y su banda, la composición entre ingresantes y continuadores, el reparto por sede, la composición por modalidad de estudios y la tabla por semestre y escenario.'),
    ...figura('02_kpis.png', 'Indicadores del resumen. Cada uno lleva su contexto: variación frente al semestre anterior, escenarios alternativos y amplitud del intervalo.', { maxAlto: 260 }),
    ...figura('05_tabla_resumen.png', 'Tabla por semestre y escenario, con la separación entre ingresantes y continuadores y el intervalo de predicción.', { maxAlto: 340 }),

    h3('9.5.2 Detalle'),
    p([txt('La pestaña de detalle permite filtrar por semestre, sede, carrera, modalidad y turno, y construir cualquier cruce eligiendo qué dimensión va en filas y cuál en columnas —la modalidad está disponible en ambos ejes. El selector '), neg('«Escenario en tablas»'), txt(' de la barra superior cambia el escenario mostrado en todas las tablas.')]),
    ...figura('07_detalle_cruce.png', 'Cruce de la proyección por carrera y ciclo. Filas y columnas son configurables, y el filtro de modalidad permite aislar cada población.', { maxAlto: 480 }),
    p('Debajo, el detalle por celda lista las combinaciones completas de semestre, sede, carrera, modalidad, ciclo y turno, con su margen de precisión. Es la vista que corresponde al nivel más desagregado del encargo.'),
    ...figura('08_detalle_celdas.png', 'Detalle por celda con el margen de precisión de cada una.', { maxAlto: 420 }),

    h3('9.5.3 Modelo y validación'),
    p('La última pestaña no contiene resultados sino el sustento: la ecuación, los parámetros estimados, la caracterización de las tres modalidades, la maduración de sede, las tasas de continuación, las matrices de avance y turno, la descomposición de varianza y los resultados de validación. Está pensada para que cualquier cifra de las otras pestañas pueda rastrearse hasta su origen.'),

    h2('9.6 Exportar'),
    p([txt('El botón '), neg('«Exportar proyección»'), txt(' genera un Excel de siete hojas:')]),
    tabla([2400, 6626],
      ['Hoja', 'Contenido'],
      [
        ['Resumen', 'Totales por semestre y escenario, con ingresantes, continuadores e intervalo de predicción. Incluye la cabecera de supuestos: archivo de entrada, horizonte, confianza y choque aplicado.'],
        ['Proyección detallada', 'Una fila por semestre, sede, carrera, modalidad, ciclo y turno, con los tres escenarios, la desviación típica independiente y el intervalo de predicción.'],
        ['Agregados', 'Seis cuadros listos para usar: por sede, por carrera, por modalidad, por ciclo, por turno y por modalidad y ciclo, cada uno con los tres escenarios.'],
        ['Ingresantes', 'Los ingresantes utilizados, su modalidad —declarada o estimada— y su reparto estimado por turno, en cantidad y porcentaje, con el nivel de evidencia empleado en cada fila.'],
        ['Parámetros', 'Tasas de continuación por ciclo y rezago, continuación por modalidad y ciclo, tasas por carrera con su valor crudo y contraído, matriz de avance por modalidad, matriz de turno por sede y modalidad, maduración de sede y ciclos de plan por carrera.'],
        ['Validación', 'Descomposición de varianza, backtesting por nivel y horizonte, cobertura empírica, detalle del total institucional y rejilla de selección de λ.'],
        ['Metodología', 'Explicación del modelo en once apartados, para que el archivo se sostenga por sí solo al circular.'],
      ], { al: [AlignmentType.LEFT, AlignmentType.LEFT] }),
    pieTabla('Contenido del archivo Excel de exportación.'),
    p('La exportación incluye todas las celdas de todos los semestres, no sólo las visibles en pantalla, y los totales de cada escenario coinciden exactamente con la suma de sus celdas.'),

    h2('9.7 Parámetros avanzados'),
    p('El botón «Parámetros avanzados» expone tres controles que normalmente no hace falta tocar, pero que permiten reestimar el modelo dentro del navegador y explorar su sensibilidad:'),
    tabla([2600, 1400, 5026],
      ['Control', 'Valor', 'Efecto'],
      [
        ['λ recencia (continuación)', '0,65', 'Ponderación de los semestres antiguos al estimar la continuación, el avance y el reparto por modalidad. Con 1,00 todo el histórico pesa igual.'],
        ['λ recencia (turno)', '0,30', 'Lo mismo para el reparto por turno de los ingresantes.'],
        ['Factor de contracción', '1,00', 'Multiplica las constantes k. Por encima de 1 se contrae más hacia los niveles agregados; por debajo, se cree más a cada celda.'],
      ], { al: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.LEFT] }),
    pieTabla('Controles avanzados. Los valores por defecto son los seleccionados por validación cruzada.'),
    p('El modelo no trae los parámetros congelados: al mover cualquiera de estos controles vuelve a agregar los conteos de transición semestre a semestre, recalcula las constantes de contracción por el método de los momentos y reproyecta. Incluso el reparto por modalidad de las filas que no la declaran se recalcula, de modo que nada queda fijado fuera del estimador. Es la misma aritmética de la implementación de referencia en Python, verificada punto por punto.'),
    ...figura('17_oscuro.png', 'El modelo también funciona en modo oscuro, conmutable desde la cinta superior.', { maxAlto: 400 }),
    salto(),
  ];
}

function programasNuevos() {
  return [
    h1('10. Programas y sedes nuevas'),
    h2('10.1 El problema'),
    p('Un programa que se abre no tiene historia: no hay cohortes suyas de las que estimar retención, ritmo de avance ni preferencia de turno. Y sin embargo debe poder proyectarse, porque la apertura de programas es justamente uno de los escenarios de planificación más relevantes.'),
    p('Lo mismo vale para una carrera existente que se abre en una modalidad nueva —un programa presencial que empieza a ofrecerse a distancia—, que es un caso cada vez más frecuente a la vista de la deriva documentada en el apartado 3.2.'),

    h2('10.2 La solución: contracción, no reglas especiales'),
    p('El modelo no incorpora ningún tratamiento excepcional. La escalera de contracción resuelve el caso por construcción: al no encontrar evidencia en los niveles finos, la estimación se detiene en el nivel más específico que sí la tenga.'),
    tabla([2600, 3200, 3226],
      ['Parámetro', 'Nivel que se aplica', 'Fundamento'],
      [
        ['Continuación', 'Modalidad × ciclo × paridad', 'La estructura por ciclo y modalidad es la que más señal contiene y es común a todas las carreras.'],
        ['Avance de ciclo', 'Modalidad × ciclo', 'El patrón de aprobación y repetición depende sobre todo del ciclo y de la modalidad.'],
        ['Transición de turno', 'Sede × modalidad × ciclo', 'Depende del catálogo de turnos de la sede y del régimen de la modalidad, que sí se conocen.'],
        ['Reparto de turno de ingresantes', 'Sede × modalidad (o × paridad)', 'La preferencia de turno responde sobre todo a la modalidad y al perfil del alumnado de la sede.'],
        ['Reparto de modalidad, si no se declara', 'Sede × paridad', 'Composición institucional de la sede, restringida a su oferta.'],
        ['Ciclos del plan', 'Declarado o 10 por defecto', 'El usuario puede fijarlo en la columna CiclosPlan de la plantilla.'],
        ['Ciclo máximo ofertable', 'Tope de maduración de la sede', 'Si la sede también es nueva, el programa sólo crece al ritmo al que crece la sede.'],
      ], { al: [AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.LEFT] }),
    pieTabla('Niveles de la escalera de contracción que se aplican a un programa sin historia.'),
    p([txt('Obsérvese que un programa nuevo hereda el comportamiento de '), neg('su modalidad'), txt(', no el promedio institucional. Una carrera nueva a distancia arranca con una continuación de primer ciclo del orden del 42 %, no del 60 % que promedian las tres modalidades. Es una diferencia grande, y es de las que más se notan en el primer año de un programa.')]),
    p('A medida que el programa acumule semestres, sus propias celdas ganarán observaciones y el estimador les dará peso de forma progresiva y automática, sin intervención ni recalibrado.'),

    h2('10.3 Ejemplo verificado'),
    p('Para comprobar el comportamiento se preparó un archivo de entrada con un programa inexistente en el histórico, INTELIGENCIA ARTIFICIAL, con plan declarado de ocho ciclos y ingresantes en las tres modalidades, en Lima Sur y Lima Norte.'),
    ...vinetas([
      'El modelo lo detectó como programa nuevo y lo señaló en la pestaña de ingresantes.',
      'Aplicó el plan de ocho ciclos declarado, limitando correctamente el avance.',
      'Aplicó a cada fila la continuación y el avance de su modalidad declarada, no el promedio institucional.',
      'Resolvió el reparto de turno en el nivel «sede·modalidad·paridad», informándolo en la columna correspondiente.',
      'Proyectó su matrícula a lo largo del horizonte con la estructura de continuación por ciclo y modalidad.',
    ]),
    p('El resultado del reparto por turno ilustra bien lo que aporta condicionar en la modalidad. Las tres filas del programa comparten sede, carrera, ciclo y semestre; se diferencian sólo en la modalidad, y el modelo les asigna turnos radicalmente distintos:'),
    tabla([2500, 1450, 1450, 1450, 2176],
      ['Modalidad declarada', '→ Mañana', '→ Noche', '→ Tarde', 'Nivel de evidencia'],
      [
        ['Presencial', '76,2 %', '20,8 %', '3,0 %', 'sede·modalidad·paridad'],
        ['Semi Presencial', '0,0 %', '97,8 %', '2,2 %', 'sede·modalidad·paridad'],
        ['A distancia', '0,0 %', '98,8 %', '1,2 %', 'sede·modalidad·paridad'],
      ]),
    pieTabla('Reparto por turno estimado para el programa nuevo en Lima Sur, primer ciclo, semestre impar. Sin la dimensión de modalidad las tres filas habrían recibido el mismo reparto.'),
    ...figura('18_escenario_pesimista.png', 'Cruce por carrera y ciclo en escenario pesimista; el programa nuevo aparece con normalidad junto al resto de la oferta.', { maxAlto: 480 }),

    h2('10.4 Sedes nuevas'),
    p('El mismo archivo de entrada admite sedes que no existen en el histórico. La sede se da por abierta en el primer semestre en que aparece y a partir de ahí despliega su plan ciclo a ciclo, según el apartado 5.7.'),
    p('En la prueba se declaró una sede inexistente, Lima Este, con 160 ingresantes de primer ciclo en 2028-I y, en 2028-II, otros 50 de primer ciclo más una fila de 30 traslados declarados al ciclo 4. El modelo:'),
    ...vinetas([
      'La reconoció como sede nueva y fijó su apertura en 2028-I, con ciclo base 1.',
      'No le asignó ninguna matrícula en 2027-I ni 2027-II, semestres anteriores a su apertura.',
      [txt('Avisó fila por fila: '), cur('«Fila 581: Lima Este no imparte todavía el ciclo 4 en 2028-II (inició en 2028-I, llega hasta el ciclo 2); esos 30 ingresantes se asignan al ciclo 2»'), txt('.')],
      'Proyectó 160 estudiantes en el ciclo 1 en 2028-I y, en 2028-II, 56 en el ciclo 1 y 133 en el ciclo 2: ningún estudiante en un ciclo que la sede no imparte todavía.',
      'Tomó el reparto por turno de la distribución institucional de cada modalidad, al no haber ninguna evidencia propia de esa sede.',
    ]),
    nota('Sobre el turno de una sede nueva.', 'Es la estimación más frágil de todo el modelo. El turno depende del perfil del alumnado de cada sede —Lima Norte y Lima Sur ni siquiera comparten catálogo de turnos— y una sede nueva no aporta ninguna información al respecto. Incorporar la modalidad mitiga el problema, porque una carrera a distancia es nocturna con independencia de la sede, pero no lo resuelve para la parte presencial. Conviene revisar ese reparto en cuanto exista un semestre de matrícula real.'),
    nota('Lectura de cautela.', 'Que el modelo proyecte un programa nuevo no significa que acierte. Está aplicando el comportamiento medio de su modalidad a una población de la que no sabe nada, y un programa nuevo puede atraer un perfil de estudiante con retención distinta. La cifra es una hipótesis razonada de partida, no una previsión con la misma solidez que la de un programa consolidado. Conviene revisarla en cuanto existan dos o tres semestres de historia propia.'),
    salto(),
  ];
}

function limitaciones() {
  return [
    h1('11. Limitaciones y mantenimiento'),
    h2('11.1 Limitaciones'),
    ...numerada([
      [neg('La proyección es condicional al archivo de ingresantes. '), txt('El modelo no pronostica la admisión ni su reparto por modalidad. Si el supuesto de ingreso es erróneo, la proyección lo será en la misma medida, y el modelo no tiene forma de advertirlo.')],
      [neg('Supone continuidad del comportamiento. '), txt('Un cambio de plan de estudios, de política de permanencia, de estructura de becas o de oferta de turnos y modalidades rompe el supuesto. La estimación lo recogerá con uno o dos semestres de retraso, no de inmediato.')],
      [neg('La validación se apoya en seis comparaciones. '), txt('Es la información disponible con ocho semestres de historia. Las cifras del horizonte 3 descansan sobre una única observación y deben leerse como indicativas. Lo mismo vale para la magnitud exacta de la mejora atribuida a la modalidad en el apartado 6.5.')],
      [neg('El nivel más desagregado es impreciso. '), txt('Un EPAP del 31 % en el cruce sede × carrera × modalidad × ciclo × turno refleja que muchas celdas tienen pocos estudiantes. A ese nivel, el intervalo de predicción es tan informativo como el punto.')],
      [neg('La modalidad a distancia tiene historia corta en los ciclos altos. '), txt('Su matrícula no pasa todavía del ciclo 7, de modo que su continuación en los ciclos 8 a 11 y su ciclo terminal se estiman por contracción hacia el perfil general, no con evidencia propia. Es la parte del modelo que más se beneficiará de cada semestre nuevo.')],
      [neg('El semestre 2026-II estaba incompleto. '), txt('Afecta al punto de partida de la recursión y a las comparaciones de validación que apuntan a ese semestre. Conviene reestimar con el cierre definitivo.')],
      [neg('Los programas nuevos heredan comportamiento ajeno. '), txt('Es la mejor estimación disponible sin historia propia, pero no equivale a una proyección basada en evidencia del propio programa.')],
      [neg('El tope de maduración es una restricción, no una predicción. '), txt('Establece qué ciclos puede ofrecer una sede recién abierta, pero supone que el despliegue avanza un ciclo por semestre sin interrupción. Si la sede abriera dos ciclos a la vez, o retrasara la apertura de uno, habría que reflejarlo en los datos y reestimar.')],
    ]),

    h2('11.2 Cuándo reestimar'),
    p('El modelo lleva incorporados los conteos de transición semestre a semestre, de modo que puede reestimarse dentro del navegador moviendo los parámetros de recencia y contracción. Lo que no puede hacer por sí solo es incorporar semestres nuevos: para eso hay que regenerar el archivo con la base actualizada.'),
    ...vinetas([
      [neg('Cada semestre, '), txt('al cerrar la matrícula: añadir el semestre a la base y regenerar. Se gana un origen de validación y se actualiza el punto de partida.')],
      [neg('Ante un cambio estructural '), txt('—nuevo plan de estudios, nueva sede, nueva modalidad en una carrera, cambio en la política de turnos—: reestimar y comprobar si las constantes de contracción y la λ seleccionada se desplazan.')],
      [neg('Si el error fuera de muestra se degrada '), txt('de forma sostenida por encima del 3 % en el total: es señal de que algo cambió en el comportamiento y conviene revisar la especificación, no sólo reestimar.')],
      [neg('Si la λ seleccionada se va al borde de la rejilla, '), txt('como ocurría sin la dimensión de modalidad: es el síntoma de una variable relevante omitida, y conviene buscarla antes de aceptar la proyección.')],
    ]),

    h2('11.3 Reproducibilidad'),
    p('Todo el procedimiento es determinista. Con la misma base histórica y el mismo archivo de ingresantes, el modelo devuelve exactamente las mismas cifras: no hay simulación, muestreo aleatorio ni semillas.'),
    p([txt('La implementación de referencia se escribió en Python (pandas, numpy, scipy y statsmodels) y el motor de producción en JavaScript dentro del HTML. Ambos se verificaron sobre el mismo conjunto de parámetros y el mismo caso de prueba: sobre seis semestres proyectados, los totales, las desviaciones típicas y el desglose por modalidad coinciden con una diferencia relativa máxima del orden de 10⁻¹⁶ —el epsilon de la doble precisión— y las constantes de contracción, del orden de 10⁻¹⁵. Lo que queda es el orden de acumulación en coma flotante, no diferencia de lógica.')]),
    nota('Por qué dos implementaciones.', 'La versión en Python permite usar bibliotecas econométricas contrastadas para el GLM y los contrastes estadísticos, y sirve de referencia frente a la cual verificar el motor del navegador. La versión en JavaScript es la que el usuario ejecuta, sin instalar nada. La verificación cruzada entre ambas es la garantía de que lo que se documenta aquí es lo que el modelo calcula.'),
    salto(),
  ];
}

function anexos() {
  return [
    h1('Anexo A. Parámetros estimados'),
    h2('A.1 Continuación por ciclo y rezago'),
    tabla([1150, 1700, 1550, 1550, 1550, 1526],
      ['Ciclo', 'Observaciones', 'L = 1', 'L = 2', 'L = 3', 'L = 4'],
      [
        ['1', '28 870', '60,5 %', '1,8 %', '0,5 %', '0,4 %'],
        ['2', '15 622', '81,4 %', '2,8 %', '1,1 %', '0,4 %'],
        ['3', '13 403', '86,6 %', '3,2 %', '1,1 %', '0,3 %'],
        ['4', '10 613', '87,8 %', '3,0 %', '0,9 %', '0,4 %'],
        ['5', '9 418', '89,8 %', '3,2 %', '0,9 %', '0,5 %'],
        ['6', '7 149', '90,2 %', '2,8 %', '0,8 %', '0,3 %'],
        ['7', '7 132', '91,1 %', '3,1 %', '1,3 %', '0,4 %'],
        ['8', '5 579', '90,3 %', '2,8 %', '1,1 %', '0,4 %'],
        ['9', '5 220', '92,7 %', '2,6 %', '0,6 %', '0,5 %'],
        ['10', '4 708', '47,1 %', '2,0 %', '1,2 %', '0,2 %'],
        ['11', '2 085', '16,3 %', '2,0 %', '0,5 %', '0,5 %'],
      ]),
    pieTabla('Probabilidad de que la siguiente matrícula ocurra L semestres después, por ciclo de origen. Valores con la ponderación de recencia λ = 0,65 activa; las observaciones son el recuento sin ponderar. La caída de los ciclos 10 y 11 corresponde al egreso. Nótese que el reingreso tras pausa (L ≥ 2) es menos frecuente en el ciclo 1: quien abandona en el primer ciclo rara vez vuelve.'),

    h2('A.2 Continuación por modalidad y ciclo'),
    p('Tasas de continuación a un semestre (L = 1) tal como las emplea el modelo: contraídas hacia el perfil del ciclo y ponderadas por recencia, promediadas sobre las dos paridades. Son las que entran en la recursión.'),
    tabla([1500, 2500, 2500, 2526],
      ['Ciclo', 'Presencial', 'Semi Presencial', 'A distancia'],
      [
        ['1', '68,9 %', '56,6 %', '42,2 %'],
        ['2', '82,5 %', '81,8 %', '76,8 %'],
        ['3', '86,1 %', '85,2 %', '83,3 %'],
        ['4', '87,5 %', '87,7 %', '87,3 %'],
        ['5', '88,5 %', '88,6 %', '91,1 %'],
        ['6', '89,1 %', '91,0 %', '92,5 %'],
        ['7', '90,0 %', '93,4 %', '90,4 %'],
        ['8', '90,0 %', '92,2 %', '90,3 %'],
        ['9', '91,8 %', '97,3 %', '92,5 %'],
        ['10', '47,0 %', '47,6 %', '47,1 %'],
        ['11', '17,0 %', '10,0 %', '16,5 %'],
      ]),
    pieTabla('Continuación a un semestre por modalidad y ciclo. La brecha se concentra en los dos primeros ciclos y se cierra a partir del cuarto; en los ciclos 8 a 11 la modalidad a distancia no tiene evidencia propia y los valores proceden de la contracción hacia el perfil general.'),
    p('Difieren ligeramente de las del apartado 4.2, que agrupan los conteos observados sin contraerlos: la diferencia es exactamente el peso que el estimador concede al perfil general del ciclo frente a la evidencia propia de cada modalidad, y es mayor donde esa evidencia escasea.'),
    p([txt('Las tres columnas convergen a partir del ciclo 4 y la caída terminal de los ciclos 10 y 11 es común: el egreso no depende de la modalidad. La diferencia de comportamiento está en la '), neg('entrada'), txt(', no en la permanencia ni en la salida.')]),

    h2('A.3 Ciclos del plan por carrera'),
    p('El ciclo terminal se infiere del comportamiento de continuación observado. Las carreras cuyo historial no alcanza aún los ciclos superiores conservan el valor por defecto de diez ciclos.'),
    tabla([4500, 1400, 3126],
      ['Carrera', 'Ciclos', 'Origen del valor'],
      [
        ['DERECHO', '11', 'Inferido: continuación alta en el ciclo 10 (87,8 %).'],
        ['PSICOLOGÍA', '11', 'Inferido: continuación alta en el ciclo 10 (93,6 %).'],
        ['Las 23 carreras restantes', '10', 'Inferido o valor por defecto en las carreras censuradas.'],
      ], { al: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.LEFT] }),
    pieTabla('Duración del plan de estudios por carrera.'),

    h2('A.4 Oferta por modalidad'),
    p('De las 150 combinaciones teóricas de sede, carrera y modalidad sólo existen 83. El modelo respeta esa restricción tanto al proyectar continuadores como al repartir ingresantes sin modalidad declarada.'),
    tabla([3400, 1800, 3826],
      ['Restricción de oferta', 'Alcance', 'Consecuencia en la proyección'],
      [
        ['Carreras sólo presenciales', '7 de 25', 'Enfermería, Obstetricia, Farmacia y Bioquímica, Ingeniería Biomédica, Ciencias de la Comunicación y las dos de Tecnología Médica.'],
        ['Carreras en dos modalidades', '6 de 25', 'Reparto entre las dos disponibles.'],
        ['Carreras en las tres modalidades', '12 de 25', 'Reparto completo.'],
        ['Lima Norte', 'sin «A distancia»', 'La sede imparte 17 carreras, en modalidad presencial y semipresencial.'],
        ['Lima Sur', 'las tres modalidades', 'Las 25 carreras.'],
      ], { al: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.LEFT] }),
    pieTabla('Estructura de la oferta por modalidad, tal como la detecta el modelo del histórico.'),

    h2('A.5 Continuación global por rezago'),
    tabla([2600, 1600, 4826],
      ['Rezago', 'Probabilidad', 'Interpretación'],
      [
        ['L = 1', '77,55 %', 'Se rematricula en el semestre inmediato siguiente.'],
        ['L = 2', '2,66 %', 'Regresa tras interrumpir un semestre.'],
        ['L = 3', '0,87 %', 'Regresa tras interrumpir dos semestres.'],
        ['L = 4', '0,39 %', 'Regresa tras interrumpir tres semestres.'],
        ['No vuelve', '18,53 %', 'Deserción o egreso, según el ciclo.'],
      ], { al: [AlignmentType.LEFT, AlignmentType.CENTER, AlignmentType.LEFT] }),
    pieTabla('Continuación global por rezago, con la ponderación de recencia activa.'),
    salto(),

    h1('Anexo B. Glosario'),
    tabla([2600, 6426],
      ['Término', 'Definición'],
      [
        ['Ablación', 'Contraste que ejecuta el procedimiento completo con y sin un componente para medir su aportación. Aquí se aplica a la dimensión de modalidad (apartado 6.5).'],
        ['Backtesting de origen móvil', 'Validación que reestima el modelo con datos hasta un corte y proyecta el resto, desplazando el corte. Evita usar información del futuro en la evaluación.'],
        ['Cadena de Markov de cohortes', 'Modelo en el que una población se reparte entre estados y avanza según probabilidades de transición estimadas.'],
        ['Choque de periodo', 'Desviación de la tasa de continuación de un semestre respecto de su nivel esperado, común a todas las cohortes de ese semestre.'],
        ['Contracción (shrinkage)', 'Combinar la estimación de una celda con la de un nivel más agregado, en proporción a la información disponible en cada uno.'],
        ['Descomposición de Oaxaca-Blinder', 'Reparto del cambio de una media entre la parte debida al cambio de composición de los grupos y la debida al cambio dentro de cada grupo (apartado 4.5.1).'],
        ['EPAP (WAPE)', 'Error porcentual absoluto ponderado: suma de errores absolutos dividida por la suma de observados. Pondera cada celda por su tamaño.'],
        ['Empírico-Bayes', 'Enfoque en que los parámetros de la distribución a priori se estiman de los propios datos en lugar de fijarse de antemano.'],
        ['Escala logit', 'Transformación log(p/(1−p)) que lleva una probabilidad a toda la recta real. Un desplazamiento en logit nunca produce probabilidades fuera de [0, 1].'],
        ['GLM binomial', 'Modelo lineal generalizado para variable dependiente binaria; con enlace logit equivale a la regresión logística.'],
        ['Intervalo de predicción', 'Rango en el que se espera que caiga el valor observado. Incluye la incertidumbre sistémica y el azar de realización.'],
        ['Método de los momentos', 'Estimación que iguala momentos teóricos y muestrales. Aquí se usa para obtener la constante de contracción.'],
        ['Modalidad de estudios', 'Régimen en que se cursa el programa: presencial, semipresencial o a distancia. En este modelo es un atributo conservado del estado que condiciona la continuación, el avance y el turno.'],
        ['Paridad del semestre', 'Si un semestre es el primero (I) o el segundo (II) del año. La continuación y la mezcla de turno difieren sistemáticamente entre ambos.'],
        ['Restricción de oferta', 'Conjunto de combinaciones de sede, carrera y modalidad que la universidad imparte realmente. El modelo no genera matrícula fuera de ellas.'],
        ['Rezago', 'Número de semestres entre una matrícula y la siguiente del mismo estudiante. Un rezago mayor que 1 es un reingreso tras pausa.'],
        ['Semivida', 'Antigüedad a la que el peso de recencia se reduce a la mitad: log(0,5)/log(λ).'],
        ['Tamaño muestral efectivo', 'Observaciones equivalentes de una estimación tras la ponderación de recencia y la contracción. Gobierna el error de parámetro.'],
        ['Variable omitida', 'Regresor relevante ausente de la especificación, cuyo efecto se reparte entre los regresores incluidos y sesga sus coeficientes.'],
      ], { al: [AlignmentType.LEFT, AlignmentType.LEFT] }),
    pieTabla('Glosario de términos empleados en este documento.'),
  ];
}

module.exports = { validacion, manual, programasNuevos, limitaciones, anexos };
