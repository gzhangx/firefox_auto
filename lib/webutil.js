const { sleep, EL } = require('./mdriver');

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

// Run a script that returns an element (or null); returns its WebDriver id or null.
async function findByScript(m, script, args = []) {
  const r = await m.send('WebDriver:ExecuteScript', { script, args });
  return (r.value && r.value[EL]) || null;
}

// Real (WebDriver) click on the element returned by script. Returns true if clicked.
async function clickByScript(m, script, args = []) {
  const id = await findByScript(m, script, args);
  if (!id) return false;
  try { await m.send('WebDriver:ElementClick', { id }); }
  catch { await m.send('WebDriver:ExecuteScript', { script: 'arguments[0].click()', args: [{ [EL]: id }] }); }
  return true;
}

// Poll until script returns truthy; returns that value.
async function waitUntil(m, script, timeoutMs = 15000, args = []) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    try { const v = await m.js(script, args); if (v) return v; } catch {}
    if (Date.now() > end) throw new Error('timeout waiting for condition');
    await sleep(500);
  }
}

async function scrollToBottom(m) { await m.js('window.scrollTo(0, document.body.scrollHeight)'); }

module.exports = { waitFor, setField, clickWhenReady, currentUrl, findByScript, clickByScript, waitUntil, scrollToBottom };
