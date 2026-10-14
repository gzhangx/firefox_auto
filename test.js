const { withFirefox } = require('./marionette');

const FIREFOX = 'D:\\firefox\\obj-x86_64-pc-mingw32\\dist\\bin\\firefox.exe';

const job = async m => {
  //Here read ../secs/testcc.txt, first line is the url, second line is the username, third line is the password  
  const testcc = fs.readFileSync('../secs/testcc.txt', 'utf8');
  const url = testcc.split('\n')[0];
  const username = testcc.split('\n')[1];
  const password = testcc.split('\n')[2];
  await m.go(url);
  console.log(await m.js('return document.title'));
};

Promise.all([
  withFirefox(2828, 'D:\\home\\data\\firefox_testprofile', job, { firefox: FIREFOX }),
  //withFirefox(2829, 'D:\\ff2', job, { firefox: FIREFOX, prefs: { 'browser.download.dir': 'D:\\dl2', 'browser.download.folderList': 2 } }),
]).catch(console.error);