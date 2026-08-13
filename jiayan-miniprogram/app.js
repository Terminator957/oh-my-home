const { initSync } = require('./utils/data');

App({
  onLaunch() { initSync(); }
})
