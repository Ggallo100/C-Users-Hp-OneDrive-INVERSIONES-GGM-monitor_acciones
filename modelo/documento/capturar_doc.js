/* Captura secciones concretas del render del Word para revisión visual. */
const { chromium } = require('playwright');
const path = require('path');
const objetivos = process.argv.slice(2);

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const pag = await (await nav.newContext({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 1.6 })).newPage();
  await pag.goto('file://' + path.join(__dirname, 'vista.html'), { waitUntil: 'networkidle' });
  for (const t of objetivos) {
    const n = await pag.evaluate(titulo => {
      const h = Array.from(document.querySelectorAll('h1,h2,h3'))
        .find(x => x.textContent.trim().startsWith(titulo));
      if (!h) return -1;
      h.scrollIntoView({ block: 'start' });
      window.scrollBy(0, -24);
      return 1;
    }, t);
    if (n < 0) { console.log('NO ENCONTRADO:', t); continue; }
    await pag.waitForTimeout(350);
    const f = 'sec_' + t.replace(/[^0-9A-Za-z.]/g, '') + '.png';
    await pag.screenshot({ path: path.join(__dirname, f) });
    console.log('  ', f);
  }
  await nav.close();
})();
