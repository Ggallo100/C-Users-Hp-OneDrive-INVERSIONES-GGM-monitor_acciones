/* ==========================================================================
   GRÁFICOS EN SVG
   Sin dependencias externas: el archivo debe funcionar sin conexión.
   Marcas finas, ejes atenuados, extremos de dato redondeados a 4 px,
   separación de 2 px entre segmentos apilados y capa de interacción propia.
   ========================================================================== */

const PALETA = ['--s1', '--s2', '--s3', '--s4', '--s5', '--s6'];
function tok(n) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  return v || ({ '--s1': '#2a78d6', '--s2': '#eb6834', '--s3': '#1baf7a', '--s4': '#eda100', '--s5': '#e87ba4', '--s6': '#4a3aa7' }[n] || '#888');
}
const serieColor = i => tok(PALETA[i % PALETA.length]);

/**
 * Leyenda. `tipo` distingue las marcas que comparten color: 'solido' (cuadro),
 * 'linea' (trazo), 'banda' (relleno translúcido con su opacidad real). Sin esto
 * cuatro entradas del mismo azul quedarían indistinguibles.
 */
function leyenda(sel, items) {
  const e = $(sel);
  if (!e) return;
  e.innerHTML = items.map(it => {
    const tipo = it.tipo || 'solido';
    let est = 'background:' + it.c;
    let cls = 'pin';
    if (tipo === 'linea') { cls += ' linea'; }
    else if (tipo === 'banda') { cls += ' banda'; est += ';opacity:' + (it.op || 0.2); }
    return '<span><i class="' + cls + '" style="' + est + '"></i>' + esc(it.t) + '</span>';
  }).join('');
}

/** Escala lineal “bonita”: devuelve [min, max, paso]. */
function escala(min, max, n) {
  n = n || 5;
  if (!isFinite(min) || !isFinite(max)) return [0, 1, 1];
  if (min === max) { min = Math.min(0, min); max = max || 1; }
  const bruto = (max - min) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(bruto, 1e-12))));
  const norm = bruto / mag;
  const paso = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return [Math.floor(min / paso) * paso, Math.ceil(max / paso) * paso, paso];
}

const emer = () => $('#emer');
function mostrarEmer(ev, html) {
  const e = emer();
  e.innerHTML = html;
  e.classList.add('ver');
  const r = e.getBoundingClientRect();
  let x = ev.clientX + 14, y = ev.clientY - r.height - 10;
  if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
  if (y < 8) y = ev.clientY + 18;
  e.style.left = x + 'px'; e.style.top = y + 'px';
}
function ocultarEmer() { emer().classList.remove('ver'); }

/** Rectángulo con las dos esquinas superiores redondeadas (extremo de dato). */
function barraPath(x, y, w, h, r) {
  if (h <= 0.5) return '';
  r = Math.min(r, w / 2, h);
  return 'M' + x + ',' + (y + h) + 'V' + (y + r) +
    'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + -r +
    'h' + (w - 2 * r) +
    'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r +
    'V' + (y + h) + 'Z';
}

/**
 * Serie temporal con banda de escenarios.
 *   datos: [{et, obs, cen, alt, baj, ipLo, ipHi, proy}]
 */
function graficoSerie(sel, datos) {
  const cont = $(sel);
  if (!cont) return;
  const W = Math.max(cont.clientWidth || 600, 320), H = 300;
  const M = { t: 14, r: 16, b: 40, l: 56 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;
  const vals = [];
  datos.forEach(d => {
    [d.obs, d.cen, d.alt, d.baj, d.ipLo, d.ipHi].forEach(v => { if (v != null) vals.push(v); });
  });
  const [y0, y1, paso] = escala(Math.min(...vals) * 0.97, Math.max(...vals) * 1.02, 5);
  const X = i => M.l + (datos.length === 1 ? iw / 2 : i * iw / (datos.length - 1));
  const Y = v => M.t + ih - (v - y0) / (y1 - y0) * ih;

  const g = [];
  for (let v = y0; v <= y1 + 1e-9; v += paso) {
    g.push('<line class="grid" x1="' + M.l + '" y1="' + Y(v) + '" x2="' + (W - M.r) + '" y2="' + Y(v) + '"/>');
    g.push('<text class="ejeTxt" x="' + (M.l - 8) + '" y="' + (Y(v) + 3.5) + '" text-anchor="end">' + fmtN(v) + '</text>');
  }
  // Separador entre observado y proyectado
  const iProy = datos.findIndex(d => d.proy);
  if (iProy > 0) {
    const xs = (X(iProy - 1) + X(iProy)) / 2;
    g.push('<line x1="' + xs + '" y1="' + M.t + '" x2="' + xs + '" y2="' + (M.t + ih) +
      '" stroke="' + tok('--eje') + '" stroke-width="1" stroke-dasharray="3 3"/>');
    g.push('<text class="ejeTxt" x="' + (xs + 5) + '" y="' + (M.t + 11) + '">proyección</text>');
  }

  const proy = datos.map((d, i) => ({ d, i })).filter(o => o.d.proy);
  if (proy.length) {
    /* La banda arranca pinzada en el último punto observado: ese punto no tiene
       escenarios, así que se sintetiza con su propio valor observado en las
       cuatro aristas. Sin esto las coordenadas del polígono salen NaN. */
    const ancla = [];
    if (iProy > 0) {
      const v = datos[iProy - 1].obs;
      if (v != null) ancla.push({ i: iProy - 1, d: { cen: v, alt: v, baj: v, ipLo: v, ipHi: v } });
    }
    const secu = ancla.concat(proy);
    // Intervalo de predicción (más ancho, al fondo)
    const ipArr = secu.map(o => X(o.i) + ',' + Y(o.d.ipHi != null ? o.d.ipHi : o.d.cen))
      .concat(secu.slice().reverse().map(o => X(o.i) + ',' + Y(o.d.ipLo != null ? o.d.ipLo : o.d.cen)));
    g.push('<polygon points="' + ipArr.join(' ') + '" fill="' + tok('--s1') + '" opacity=".10"/>');
    // Banda de escenarios
    const bd = secu.map(o => X(o.i) + ',' + Y(o.d.alt != null ? o.d.alt : o.d.cen))
      .concat(secu.slice().reverse().map(o => X(o.i) + ',' + Y(o.d.baj != null ? o.d.baj : o.d.cen)));
    g.push('<polygon points="' + bd.join(' ') + '" fill="' + tok('--s1') + '" opacity=".20"/>');
    g.push('<polyline points="' + secu.map(o => X(o.i) + ',' + Y(o.d.cen != null ? o.d.cen : o.d.obs)).join(' ') +
      '" fill="none" stroke="' + tok('--s1') + '" stroke-width="2" stroke-dasharray="5 3"/>');
  }
  const obs = datos.map((d, i) => ({ d, i })).filter(o => o.d.obs != null);
  if (obs.length) {
    g.push('<polyline points="' + obs.map(o => X(o.i) + ',' + Y(o.d.obs)).join(' ') +
      '" fill="none" stroke="' + tok('--s1') + '" stroke-width="2"/>');
    obs.forEach(o => g.push('<circle cx="' + X(o.i) + '" cy="' + Y(o.d.obs) +
      '" r="4" fill="' + tok('--s1') + '" stroke="' + tok('--sup') + '" stroke-width="2"/>'));
  }
  proy.forEach(o => g.push('<circle cx="' + X(o.i) + '" cy="' + Y(o.d.cen) +
    '" r="4" fill="' + tok('--sup') + '" stroke="' + tok('--s1') + '" stroke-width="2"/>'));

  // Etiquetas directas: primer y último punto proyectado
  const marcar = [];
  if (obs.length) marcar.push(obs[obs.length - 1]);
  if (proy.length) marcar.push(proy[proy.length - 1]);
  marcar.forEach(o => {
    const v = o.d.cen != null ? o.d.cen : o.d.obs;
    const yy = Y(v) - 12;
    g.push('<text class="rot" x="' + X(o.i) + '" y="' + yy + '" text-anchor="middle">' + fmtN(v) + '</text>');
  });

  g.push('<line class="eje" x1="' + M.l + '" y1="' + (M.t + ih) + '" x2="' + (W - M.r) + '" y2="' + (M.t + ih) + '"/>');
  const salto = Math.ceil(datos.length / Math.max(Math.floor(iw / 52), 1));
  datos.forEach((d, i) => {
    if (i % salto !== 0 && i !== datos.length - 1) return;
    g.push('<text class="ejeTxt" x="' + X(i) + '" y="' + (M.t + ih + 15) + '" text-anchor="middle">' + esc(d.et) + '</text>');
  });

  cont.innerHTML = '<svg class="gr" viewBox="0 0 ' + W + ' ' + H + '" role="img">' + g.join('') +
    '<rect id="capaSerie" x="' + M.l + '" y="' + M.t + '" width="' + iw + '" height="' + ih + '" fill="transparent"/>' +
    '<line id="cruzSerie" y1="' + M.t + '" y2="' + (M.t + ih) + '" stroke="' + tok('--eje') +
    '" stroke-width="1" opacity="0"/></svg>';

  const capa = $('#capaSerie', cont), cruz = $('#cruzSerie', cont);
  const svg = $('svg', cont);
  capa.addEventListener('mousemove', ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) / r.width * W;
    let mejor = 0, dmin = 1e9;
    datos.forEach((d, i) => { const dd = Math.abs(X(i) - px); if (dd < dmin) { dmin = dd; mejor = i; } });
    const d = datos[mejor];
    cruz.setAttribute('x1', X(mejor)); cruz.setAttribute('x2', X(mejor));
    cruz.setAttribute('opacity', '1');
    let h = '<b>' + esc(d.et) + '</b><table>';
    if (d.obs != null) h += '<tr><td>Observado</td><td><b>' + fmtN(d.obs) + '</b></td></tr>';
    if (d.alt != null) h += '<tr><td>Optimista</td><td><b>' + fmtN(d.alt) + '</b></td></tr>';
    if (d.cen != null) h += '<tr><td>Moderado</td><td><b>' + fmtN(d.cen) + '</b></td></tr>';
    if (d.baj != null) h += '<tr><td>Pesimista</td><td><b>' + fmtN(d.baj) + '</b></td></tr>';
    if (d.ipLo != null) h += '<tr><td>Int. predicción</td><td><b>' + fmtN(d.ipLo) + ' – ' + fmtN(d.ipHi) + '</b></td></tr>';
    h += '</table>';
    mostrarEmer(ev, h);
  });
  capa.addEventListener('mouseleave', () => { cruz.setAttribute('opacity', '0'); ocultarEmer(); });
}

/**
 * Barras apiladas verticales.
 *   etiquetas: [str]; series: [{t, v:[n]}]
 */
function graficoApilado(sel, etiquetas, series, opts) {
  opts = opts || {};
  const cont = $(sel);
  if (!cont) return;
  const W = Math.max(cont.clientWidth || 500, 300), H = opts.alto || 250;
  const M = { t: 12, r: 12, b: 38, l: 52 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;
  const tot = etiquetas.map((_, i) => series.reduce((s, se) => s + (se.v[i] || 0), 0));
  const [y0, y1, paso] = escala(0, Math.max(...tot, 1) * 1.04, 4);
  const bw = Math.min(iw / etiquetas.length * 0.62, 46);
  const X = i => M.l + (i + 0.5) * iw / etiquetas.length;
  const Y = v => M.t + ih - (v - y0) / (y1 - y0) * ih;

  const g = [];
  for (let v = y0; v <= y1 + 1e-9; v += paso) {
    g.push('<line class="grid" x1="' + M.l + '" y1="' + Y(v) + '" x2="' + (W - M.r) + '" y2="' + Y(v) + '"/>');
    g.push('<text class="ejeTxt" x="' + (M.l - 8) + '" y="' + (Y(v) + 3.5) + '" text-anchor="end">' + fmtN(v) + '</text>');
  }
  etiquetas.forEach((et, i) => {
    let acum = 0;
    const x = X(i) - bw / 2;
    series.forEach((se, k) => {
      const v = se.v[i] || 0;
      if (v <= 0) return;
      const yTop = Y(acum + v), yBot = Y(acum);
      // 2 px de superficie entre segmentos apilados
      const alto = Math.max(yBot - yTop - (acum > 0 ? 2 : 0), 0.5);
      const esUltimo = k === series.length - 1 ||
        series.slice(k + 1).every(s2 => (s2.v[i] || 0) <= 0);
      const d = esUltimo ? barraPath(x, yTop, bw, alto, 4)
        : 'M' + x + ',' + yTop + 'h' + bw + 'v' + alto + 'h' + (-bw) + 'Z';
      g.push('<path d="' + d + '" fill="' + se.c + '" data-i="' + i + '" class="mk"/>');
      acum += v;
    });
    if (opts.rotulos !== false && tot[i] > 0) {
      g.push('<text class="rot" x="' + X(i) + '" y="' + (Y(tot[i]) - 6) + '" text-anchor="middle">' +
        fmtN(tot[i]) + '</text>');
    }
  });
  /* Separador entre lo observado y lo proyectado, cuando la serie empalma
     ambos tramos: sin él no se distingue el dato del pronóstico. */
  if (opts.desdeProy != null && opts.desdeProy > 0 && opts.desdeProy < etiquetas.length) {
    const xs = (X(opts.desdeProy - 1) + X(opts.desdeProy)) / 2;
    g.push('<line x1="' + xs + '" y1="' + M.t + '" x2="' + xs + '" y2="' + (M.t + ih) +
      '" stroke="' + tok('--eje') + '" stroke-width="1" stroke-dasharray="3 3"/>');
    g.push('<text class="ejeTxt" x="' + (xs + 5) + '" y="' + (M.t + 11) + '">proyección</text>');
  }
  g.push('<line class="eje" x1="' + M.l + '" y1="' + (M.t + ih) + '" x2="' + (W - M.r) + '" y2="' + (M.t + ih) + '"/>');
  const salto = Math.ceil(etiquetas.length / Math.max(Math.floor(iw / 48), 1));
  etiquetas.forEach((et, i) => {
    if (i % salto !== 0 && i !== etiquetas.length - 1) return;
    g.push('<text class="ejeTxt" x="' + X(i) + '" y="' + (M.t + ih + 15) + '" text-anchor="middle">' + esc(et) + '</text>');
  });

  cont.innerHTML = '<svg class="gr" viewBox="0 0 ' + W + ' ' + H + '" role="img">' + g.join('') + '</svg>';
  $$('.mk', cont).forEach(el => {
    el.addEventListener('mousemove', ev => {
      const i = +el.dataset.i;
      let h = '<b>' + esc(etiquetas[i]) + '</b><table>';
      series.forEach(se => {
        h += '<tr><td><i class="pin" style="background:' + se.c + '"></i>' + esc(se.t) + '</td><td><b>' +
          fmtN(se.v[i] || 0) + '</b></td></tr>';
      });
      h += '<tr><td>Total</td><td><b>' + fmtN(tot[i]) + '</b></td></tr></table>';
      mostrarEmer(ev, h);
    });
    el.addEventListener('mouseleave', ocultarEmer);
  });
}

/**
 * Barras simples, opcionalmente divergentes respecto de cero.
 *   datos: [{et, v, sub}]
 */
function graficoBarras(sel, datos, opts) {
  opts = opts || {};
  const cont = $(sel);
  if (!cont) return;
  const W = Math.max(cont.clientWidth || 500, 300), H = opts.alto || 230;
  const M = { t: 14, r: 12, b: 36, l: 50 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;
  const vs = datos.map(d => d.v);
  const negativos = vs.some(v => v < 0);
  let [y0, y1, paso] = escala(negativos ? Math.min(...vs) * 1.15 : 0,
    Math.max(...vs) * 1.1, 4);
  /* Una proporción no pasa del 100 %: sin este tope la escala «bonita» sube
     hasta el 150 % y deja el gráfico aplastado en su mitad inferior. */
  if (opts.tope1 && y1 > 1) { y1 = 1; paso = 0.25; }
  const bw = Math.min(iw / datos.length * 0.64, 40);
  const X = i => M.l + (i + 0.5) * iw / datos.length;
  const Y = v => M.t + ih - (v - y0) / (y1 - y0) * ih;
  const base = Y(0);

  const g = [];
  for (let v = y0; v <= y1 + 1e-9; v += paso) {
    g.push('<line class="grid" x1="' + M.l + '" y1="' + Y(v) + '" x2="' + (W - M.r) + '" y2="' + Y(v) + '"/>');
    g.push('<text class="ejeTxt" x="' + (M.l - 8) + '" y="' + (Y(v) + 3.5) + '" text-anchor="end">' +
      (opts.fmtEje ? opts.fmtEje(v) : fmtN(v)) + '</text>');
  }
  datos.forEach((d, i) => {
    const x = X(i) - bw / 2;
    const c = d.c || opts.color || tok('--s1');
    let path;
    if (d.v >= 0) path = barraPath(x, Y(d.v), bw, base - Y(d.v), 4);
    else {  // hacia abajo: el extremo de dato es el inferior
      const h = Y(d.v) - base;
      path = 'M' + x + ',' + base + 'v' + (h - 4) + 'a4,4 0 0 0 4,4h' + (bw - 8) +
        'a4,4 0 0 0 4,-4V' + base + 'Z';
    }
    g.push('<path d="' + path + '" fill="' + c + '" class="mk" data-i="' + i + '"/>');
    if (opts.rotulos !== false) {
      g.push('<text class="rot" x="' + X(i) + '" y="' + (d.v >= 0 ? Y(d.v) - 6 : Y(d.v) + 13) +
        '" text-anchor="middle">' + (opts.fmtRot ? opts.fmtRot(d.v) : fmtN(d.v)) + '</text>');
    }
  });
  g.push('<line class="eje" x1="' + M.l + '" y1="' + base + '" x2="' + (W - M.r) + '" y2="' + base + '"/>');
  datos.forEach((d, i) =>
    g.push('<text class="ejeTxt" x="' + X(i) + '" y="' + (M.t + ih + 15) + '" text-anchor="middle">' +
      esc(d.et) + '</text>'));

  cont.innerHTML = '<svg class="gr" viewBox="0 0 ' + W + ' ' + H + '" role="img">' + g.join('') + '</svg>';
  $$('.mk', cont).forEach(el => {
    el.addEventListener('mousemove', ev => {
      const d = datos[+el.dataset.i];
      mostrarEmer(ev, '<b>' + esc(d.etLargo || d.et) + '</b><br>' +
        (opts.fmtRot ? opts.fmtRot(d.v) : fmtN(d.v)) + (d.sub ? '<br><span style="color:var(--tinta3)">' + esc(d.sub) + '</span>' : ''));
    });
    el.addEventListener('mouseleave', ocultarEmer);
  });
}

/** Varias líneas sobre el mismo eje (curva de selección de λ). */
function graficoLineas(sel, etiquetas, series, opts) {
  opts = opts || {};
  const cont = $(sel);
  if (!cont) return;
  const W = Math.max(cont.clientWidth || 500, 300), H = opts.alto || 240;
  const M = { t: 14, r: 16, b: 38, l: 54 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;
  const todos = series.flatMap(s => s.v.filter(v => v != null && isFinite(v)));
  let [y0, y1, paso] = escala(Math.min(...todos) * 0.96, Math.max(...todos) * 1.04, 4);
  /* Una proporción no pasa del 100 %: sin este tope la escala «bonita» sube
     hasta el 150 % y deja las curvas aplastadas en la mitad inferior. */
  if (opts.tope100 && y1 > 100) { y1 = 100; paso = 25; if (y0 > 0) y0 = 0; }
  const X = i => M.l + (etiquetas.length === 1 ? iw / 2 : i * iw / (etiquetas.length - 1));
  const Y = v => M.t + ih - (v - y0) / (y1 - y0) * ih;
  const g = [];
  for (let v = y0; v <= y1 + 1e-9; v += paso) {
    g.push('<line class="grid" x1="' + M.l + '" y1="' + Y(v) + '" x2="' + (W - M.r) + '" y2="' + Y(v) + '"/>');
    g.push('<text class="ejeTxt" x="' + (M.l - 8) + '" y="' + (Y(v) + 3.5) + '" text-anchor="end">' +
      (opts.fmtEje ? opts.fmtEje(v) : fmtD(v)) + '</text>');
  }
  series.forEach(s => {
    /* Una serie puede no tener dato en todos los puntos (una modalidad que no
       llega a los ciclos altos). Se dibuja sólo el tramo con dato en lugar de
       forzar un cero que mentiría sobre la tasa. */
    const pts = s.v.map((v, i) => ({ v, i })).filter(o => o.v != null && isFinite(o.v));
    if (!pts.length) return;
    g.push('<polyline points="' + pts.map(o => X(o.i) + ',' + Y(o.v)).join(' ') +
      '" fill="none" stroke="' + s.c + '" stroke-width="2"/>');
    pts.forEach(o => g.push('<circle cx="' + X(o.i) + '" cy="' + Y(o.v) + '" r="3.4" fill="' + s.c +
      '" stroke="' + tok('--sup') + '" stroke-width="1.5"/>'));
    /* Etiqueta directa al INICIO de la línea. Al final las series convergen y
       los rótulos se solapan; en el arranque están bien separadas. */
    g.push('<text x="' + (X(pts[0].i) + 8) + '" y="' + (Y(pts[0].v) - 7) +
      '" style="fill:' + s.c + ';font-size:10px;font-weight:600">' + esc(s.t) + '</text>');
  });
  if (opts.marcar != null) {
    g.push('<line x1="' + X(opts.marcar) + '" y1="' + M.t + '" x2="' + X(opts.marcar) + '" y2="' + (M.t + ih) +
      '" stroke="' + tok('--acento') + '" stroke-width="1.5" stroke-dasharray="4 3"/>');
    g.push('<text class="rot" x="' + X(opts.marcar) + '" y="' + (M.t - 3) + '" text-anchor="middle" style="fill:' +
      tok('--acento') + '">elegida</text>');
  }
  g.push('<line class="eje" x1="' + M.l + '" y1="' + (M.t + ih) + '" x2="' + (W - M.r) + '" y2="' + (M.t + ih) + '"/>');
  etiquetas.forEach((et, i) =>
    g.push('<text class="ejeTxt" x="' + X(i) + '" y="' + (M.t + ih + 15) + '" text-anchor="middle">' + esc(et) + '</text>'));
  cont.innerHTML = '<svg class="gr" viewBox="0 0 ' + W + ' ' + H + '" role="img">' + g.join('') + '</svg>';
}
