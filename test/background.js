// a Blackberry gotcha, no console in workers
if (!self.console) self.console = {log: function () {}, error: function () {}};
// import the polyfill you prefer for IE11 or IE10
if (!self.Promise) importScripts('https://cdn.jsdelivr.net/npm/es6-promise@4/dist/es6-promise.auto.min.js');
if (!self.WeakMap) importScripts('https://unpkg.com/poorlyfills@0.1.1/min.js');

// to avoid any possible issue with messages
// import the remote utility n the top of your worker
importScripts('../worker.js');

// ES2015 classes would work too
// ( not using class for IE11 tests )
function Test() {}
Test.method = function () {
  console.log('Test.method');
  console.log('arguments', [].slice.call(arguments));
  return Math.random();
};
Test.prototype.method = function () {
  console.log('Test.prototype.method');
  console.log('instance', JSON.stringify(this));
  console.log('arguments', [].slice.call(arguments));
  return Math.random();
};

// expose a namespace with serializable data
// but also classes and utilities as methods/functions
workway({
  test: 123,
  array: [1, 2, 3],
  object: {a: 'a'},
  nested: {
    method: function () {
      console.log('method');
      console.log('arguments', [].slice.call(arguments));
      return Math.random();
    },
    Test: Test
  }
});

// you can regularly post any sort of message, or listen
// to anything you want to
self.addEventListener('message', function (event) {
  console.log(event.type, event.data);
  if (event.data.hasOwnProperty('echo'))
    self.postMessage(event.data.echo);
});
