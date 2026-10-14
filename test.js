const { withFirefox } = require('./lib/mdriver');
const fs = require('fs');
function getParams() {
const testcc = fs.readFileSync('../secs/testcc.txt', 'utf8');
const testccArray = testcc.split(/\r?\n/).map(s => s.trim());
const firefoxLocation = testccArray[0];
const profileLocation = testccArray[1];
const url = testccArray[2];
return { firefoxLocation, profileLocation, url };
}
const { firefoxLocation, profileLocation, url } = getParams();
console.log(firefoxLocation, profileLocation, url);
withFirefox(2828, profileLocation, async m => {
  await m.go(url);
  console.log(await m.js('return document.title'));
}, { firefox: firefoxLocation });