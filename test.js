const { withFirefox, sleep } = require('./lib/mdriver');
const { currentUrl } = require('./lib/webutil');
const citi = require('./citi');
const fs = require('fs');
// ../secs/testcc.txt lines: 0 firefox exe, 1 profile dir, 2 url, 3 userid, 4 password
function getParams() {
  const a = fs.readFileSync('../secs/testcc.txt', 'utf8').split(/\r?\n/).map(s => s.trim());
  return { firefoxLocation: a[0], profileLocation: a[1], url: a[2], userId: a[3], password: a[4] };
}

const { firefoxLocation, profileLocation, url, userId, password } = getParams();
if (!userId || !password) throw new Error('add userid (line 4) and password (line 5) to ../secs/testcc.txt');
console.log(firefoxLocation, profileLocation, url);

withFirefox(2828, profileLocation, async m => {
  await m.go(url);
  console.log(await m.js('return document.title'));
  await citi.login(m, userId, password);
  await sleep(5000);
  console.log('after sign on:', await currentUrl(m));
  console.log("sleeping for 10 seconds");
  await sleep(10000);
}, { firefox: firefoxLocation });
