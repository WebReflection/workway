function workway(file) {'use strict';
  /*! (c) 2018 Andrea Giammarchi (ISC) */
  return new Promise(function (res, rej) {
    function uid() { return ++i + Math.random(); }
    var i = 0;
    var channel = uid();
    var messages = {};
    var worker = new Worker(file);
    worker.addEventListener('message', function (event) {
      if (event.data.channel !== channel) return;
      event.stopImmediatePropagation();
      var namespace = event.data.namespace;
      if (namespace) {
        var Class = function (info) {
          var path = info.path;
          var methods = info.methods;
          var statics = info.statics;
          var wm = new WeakMap;
          function RemoteClass() { wm.set(this, uid()); }
          methods.forEach(function (method) {
            RemoteClass.prototype[method] = function () {
              return send({
                args: slice.call(arguments),
                path: path,
                method: method,
                object: {
                  id: wm.get(this),
                  value: this
                }
              });
            };
          });
          statics.methods.forEach(function (method) {
            RemoteClass[method] = function () {
              return send({
                args: slice.call(arguments),
                path: path,
                method: method
              });
            };
          });
          statics.values.forEach(function (pair) {
            RemoteClass[pair[0]] = pair[1];
          });
          return RemoteClass;
        };
        var callback = function (path) {
          return function remoteCallback() {
            return send({
              args: slice.call(arguments),
              path: path
            });
          };
        };
        var send = function (message) {
          var resolve, reject;
          var promise = new Promise(function (res, rej) {
            resolve = res;
            reject = rej;
          });
          promise.resolve = resolve;
          promise.reject = reject;
          messages[message.id = uid()] = promise;
          worker.postMessage({
            channel: channel,
            message: message
          });
          return promise;
        };
        var slice = [].slice;
        var update = function (namespace) {
          Object.keys(namespace).forEach(function (key) {
            var info = namespace[key];
            switch (info.type) {
              case 'class': namespace[key] = Class(info); break;
              case 'function': namespace[key] = callback(info.path); break;
              case 'object': update(namespace[key] = info.value); break;
              default: namespace[key] = info.value;
            }
          });
        };
        update(namespace);
        res({
          worker: worker,
          namespace: namespace
        });
      } else {
        var message = event.data.message;
        var id = message.id;
        var promise = messages[id];
        delete messages[id];
        if (message.hasOwnProperty('error'))
          promise.reject(new Error(message.error));
        else
          promise.resolve(message.result);
      }
    });
    worker.postMessage({channel: channel});
  });
}
export default workway;
