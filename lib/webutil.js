const { sleep } = require('./mdriver');

async function waitFor(m, css, timeoutMs = 15000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    try { const id = await m.find(css); if (id) return id; } catch {}
    if (Date.now() > end) throw new Error('timeout waiting for ' + css);
    await sleep(300);
  }
}

async function setField(m, css, text) {
  const id = await waitFor(m, css);
  await m.send('WebDriver:ElementClear', { id });
  await m.send('WebDriver:ElementSendKeys', { id, text });
}

async function clickWhenReady(m, css) {
  const id = await waitFor(m, css);
  await m.send('WebDriver:ElementClick', { id });
}

async function currentUrl(m) {
  return (await m.send('WebDriver:GetCurrentURL')).value;
}

module.exports = { waitFor, setField, clickWhenReady, currentUrl };
