const { withFirefox, sleep } = require('./lib/mdriver');
const { currentUrl } = require('./lib/webutil');
const citi = require('./citi');
const fs = require('fs');
// ../secs/testcc.txt lines: 0 firefox exe, 1 profile dir, 2 url, 3 userid, 4 password
function getParams() {
  const a = fs.readFileSync('../secs/testcc.txt', 'utf8').split(/\r?\n/).map(s => s.trim());
  return { firefoxLocation: a[0], profileLocation: a[1], url: a[2], userId: a[3], password: a[4] };
}
const csvq = v => v == null ? '' : /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);

const LAST4 = process.argv[2] || '8054';
const { firefoxLocation, profileLocation, url, userId, password } = getParams();
if (!userId || !password) throw new Error('add userid (line 4) and password (line 5) to ../secs/testcc.txt');

withFirefox(2828, profileLocation, async m => {
  await m.go(url);
  await citi.login(m, userId, password);
  const tx = await citi.getTransactions(m, LAST4);
  console.log('url:', await currentUrl(m));
  console.log('period:', JSON.stringify(tx.period), tx.range);
  fs.mkdirSync('temp', { recursive: true });
  fs.writeFileSync(`temp/transactions_${LAST4}.json`, JSON.stringify(tx, null, 1));
  const cols = ['date', 'description', 'amount', 'status', 'balance'];
  fs.writeFileSync(`temp/transactions_${LAST4}.csv`, [cols.join(','), ...tx.map(t => cols.map(c => csvq(t[c])).join(','))].join('\n') + '\n');
  console.log(`got ${tx.length} transactions` + (tx.length ? `, ${tx[tx.length - 1].date} .. ${tx[0].date}` : ''));
  await sleep(120000);
}, { firefox: firefoxLocation });
