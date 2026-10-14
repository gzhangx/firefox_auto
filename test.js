const { withFirefox } = require('./marionette');

const FIREFOX = 'D:\\firefox\\obj-x86_64-pc-mingw32\\dist\\bin\\firefox.exe';

const job = async m => {
  await m.go('https://example.com');
  console.log(await m.js('return document.title'));
};

Promise.all([
  withFirefox(2828, 'D:\\home\\data\\firefox_testprofile', job, { firefox: FIREFOX }),
  //withFirefox(2829, 'D:\\ff2', job, { firefox: FIREFOX, prefs: { 'browser.download.dir': 'D:\\dl2', 'browser.download.folderList': 2 } }),
]).catch(console.error);