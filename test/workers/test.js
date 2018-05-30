var workway = require('workway');

workway({
  os: require('os'),
  ping: function () {
    self.postMessage('pong');
  }
});

self.addEventListener('message', function (event) {
  console.log(event.data);
});
