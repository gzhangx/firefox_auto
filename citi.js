const { setField, clickWhenReady } = require('./lib/webutil');

const SEL = { user: '#username', password: '#password', signOn: '#signInBtn' };

async function login(m, userId, password) {
  await setField(m, SEL.user, userId);
  await setField(m, SEL.password, password);
  await clickWhenReady(m, SEL.signOn);
}

module.exports = { login, SEL };
