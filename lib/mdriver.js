// marionette.js
const net = require('net'), fs = require('fs'), path = require('path');
const { spawn } = require('child_process');

const EL = 'element-6066-11e4-a52e-4f735466cecf';

class Marionette {
  constructor(port) { this.port = port; this.id = 0; this.pending = {}; this.buf = Buffer.alloc(0); }
  connect() {
    return new Promise((res, rej) => {
      let hello = false;
      this.s = net.connect(this.port, '127.0.0.1');
      this.s.on('error', rej);
      this.s.on('data', d => {
        this.buf = Buffer.concat([this.buf, d]);
        for (;;) {
          const i = this.buf.indexOf(':'); if (i < 0) return;
          const len = +this.buf.subarray(0, i).toString();
          if (this.buf.length < i + 1 + len) return;
          const msg = JSON.parse(this.buf.subarray(i + 1, i + 1 + len).toString());
          this.buf = this.buf.subarray(i + 1 + len);
          if (!hello) { hello = true; res(msg); continue; }
          const [, id, err, result] = msg;
          const p = this.pending[id]; delete this.pending[id];
          if (p) err ? p.rej(new Error(JSON.stringify(err))) : p.res(result);
        }
      });
    });
  }
  send(cmd, params = {}) {
    const id = ++this.id, body = Buffer.from(JSON.stringify([0, id, cmd, params]));
    this.s.write(`${body.length}:`); this.s.write(body);
    return new Promise((res, rej) => (this.pending[id] = { res, rej }));
  }
  // helpers
  go(url) { return this.send('WebDriver:Navigate', { url }); }
  async find(css) { const r = await this.send('WebDriver:FindElement', { using: 'css selector', value: css }); return (r.value || r)[EL]; }
  async type(css, text) { return this.send('WebDriver:ElementSendKeys', { id: await this.find(css), text }); }
  async click(css) { return this.send('WebDriver:ElementClick', { id: await this.find(css) }); }
  async js(script, args = []) { return (await this.send('WebDriver:ExecuteScript', { script, args })).value; }
  close() { this.s && this.s.destroy(); }
}

function setPrefs(profileDir, prefs) {
  fs.mkdirSync(profileDir, { recursive: true, force: true });
  const f = path.join(profileDir, 'user.js');
  let txt = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  for (const [k, v] of Object.entries(prefs)) {
    const line = `user_pref(${JSON.stringify(k)}, ${JSON.stringify(v)});`;
    const re = new RegExp(`^user_pref\\(${JSON.stringify(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},.*$`, 'm');
    txt = re.test(txt) ? txt.replace(re, line) : txt + line + '\n';
  }
  fs.writeFileSync(f, txt);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function withFirefox(port, profileDir, fn, { firefox, headless = false, prefs = {}, timeoutMs = 30000 } = {}) {
  setPrefs(profileDir, { 'marionette.port': port, ...prefs });
  const args = ['-marionette', '-no-remote', '-profile', profileDir];
  if (headless) args.push('-headless');
  const ff = spawn(firefox, args, { stdio: 'ignore' });

  const m = new Marionette(port);
  const start = Date.now();
  for (;;) {
    try { await m.connect(); break; }
    catch (e) {
      if (Date.now() - start > timeoutMs) { ff.kill(); throw new Error(`Marionette not up on ${port}`); }
      m.buf = Buffer.alloc(0); await sleep(500);
    }
  }
  try {
    await m.send('WebDriver:NewSession', { capabilities: {} });
    return await fn(m);
  } finally {
    try { await Promise.race([m.send('Marionette:Quit', { flags: ['eForceQuit'] }), sleep(5000)]); } catch {}
    m.close();
    await sleep(1000);
    if (ff.exitCode === null) spawn('taskkill', ['/PID', ff.pid, '/T', '/F']);
  }
}

module.exports = { withFirefox, Marionette, EL, sleep };