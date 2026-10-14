const { setField, clickWhenReady, clickByScript, waitUntil, scrollToBottom } = require('./lib/webutil');
const { sleep } = require('./lib/mdriver');

const SEL = {
  user: '#username', password: '#password', signOn: '#signInBtn',
  accountTile: 'button[id$=TileBody]',                // dashboard account tiles (text contains last4)
  timePeriod: '#timePeriodDropdownID',                // "Last 30 Days" dropdown on account page
  txnRow: 'tr.transaction-row.desktop',               // one per transaction (mobile dupes excluded)
};

async function login(m, userId, password) {
  await setField(m, SEL.user, userId);
  await setField(m, SEL.password, password);
  await clickWhenReady(m, SEL.signOn);
}

// rank time-period options: longest first; ignore custom/date-range
function periodRank(t) {
  t = t.toLowerCase();
  if (/custom|range|select/.test(t)) return -1;
  if (/all/.test(t)) return 100000;
  const n = +((t.match(/(\d+)/) || [])[1] || 0);
  if (/year/.test(t)) return n * 365; if (/month/.test(t)) return n * 30; if (/day/.test(t)) return n;
  return 0;
}

async function openAccount(m, last4) {
  await waitUntil(m, `return [...document.querySelectorAll(arguments[0])].some(e=>e.textContent.includes(arguments[1]))`, 60000, [SEL.accountTile, last4]);
  await clickByScript(m, `return [...document.querySelectorAll(arguments[0])].find(e=>e.textContent.includes(arguments[1]))`, [SEL.accountTile, last4]);
  await waitUntil(m, `return document.querySelector(arguments[0]) && document.querySelector(arguments[1])`, 60000, [SEL.timePeriod, SEL.txnRow]);
}

// Pick the longest available time period. Returns the chosen label (and all labels).
async function selectLongestPeriod(m) {
  const rangeText = await m.js('const t=document.body.innerText.match(/Results for:[^\\n]*/); return t && t[0]');
  await clickByScript(m, `return document.querySelector(arguments[0])`, [SEL.timePeriod]);
  await sleep(1500);
  const opts = await m.js(`const b=document.querySelector(arguments[0]); let c=b.parentElement; for(let i=0;i<4&&c;i++,c=c.parentElement){const o=[...c.querySelectorAll('[role=option],li,button')].filter(e=>e!==b&&e.offsetParent&&e.textContent.trim()); if(o.length) return o.map(e=>e.textContent.trim());} return [];`, [SEL.timePeriod]);
  let best = null;
  for (const o of opts) if (periodRank(o) > (best ? periodRank(best) : 0)) best = o;
  if (!best) { await m.js('document.body.click()'); return { chosen: null, options: opts }; }
  await clickByScript(m, `const b=document.querySelector(arguments[0]); let c=b.parentElement; for(let i=0;i<4&&c;i++,c=c.parentElement){const o=[...c.querySelectorAll('[role=option],li,button')].find(e=>e!==b&&e.offsetParent&&e.textContent.trim()===arguments[1]); if(o) return o;} return null;`, [SEL.timePeriod, best]);
  // wait for the table to refresh: Results header changes, then row count stable (max ~60s)
  const before = rangeText;
  await waitUntil(m, 'const t=document.body.innerText.match(/Results for:[^\\n]*/); return t && t[0] !== arguments[0]', 30000, [before]).catch(() => {});
  let last = -1, same = 0;
  for (let i = 0; i < 45 && same < 4; i++) { await sleep(1000); const n = await m.js('return document.querySelectorAll(arguments[0]).length', [SEL.txnRow]); same = n === last ? same + 1 : 0; last = n; }
  return { chosen: best, options: opts };
}

async function readRows(m) {
  return m.js(`return [...document.querySelectorAll(arguments[0])].map(r=>{
    const td=[...r.querySelectorAll('td')].map(t=>t.innerText.trim());
    const amtIdx=td.findIndex(t=>/^-?\\$[\\d,]+\\.\\d\\d$/.test(t));
    const date=td.find(t=>/^[A-Z][a-z]{2} \\d{2}, \\d{4}$/.test(t))||'';
    const description=amtIdx>0?td[amtIdx-1]:'';
    const amount=amtIdx>=0?parseFloat(td[amtIdx].replace(/[$,]/g,'')):null;
    const after=amtIdx>=0?(td[amtIdx+1]||''):'';
    const pending=r.classList.contains('pending');
    return {date, description, amount, status: pending?'Pending':'Posted', balance: /\\$/.test(after)?parseFloat(after.replace(/[$,]/g,'')):null};
  }).filter(x=>x.date||x.description)`, [SEL.txnRow]);
}

// After login: open account ending in last4, widen period to max, load everything, return rows.
async function getTransactions(m, last4) {
  await openAccount(m, last4);
  const period = await selectLongestPeriod(m);
  let prev = -1;
  for (let i = 0; i < 30; i++) {
    await scrollToBottom(m); await sleep(3000);
    await clickByScript(m, `return [...document.querySelectorAll('button,a')].find(e=>e.offsetParent&&/^(show|load|view|see) more/i.test(e.textContent.trim()))`);
    const n = await m.js(`return document.querySelectorAll(arguments[0]).length`, [SEL.txnRow]);
    if (n === prev) break; prev = n;
  }
  const range = await m.js(`const t=document.body.innerText.match(/Results for:[^\\n]*/); return t&&t[0]`);
  const rows = await readRows(m);
  rows.period = period; rows.range = range;
  return rows;
}

module.exports = { login, getTransactions, openAccount, selectLongestPeriod, readRows, SEL };
