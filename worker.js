(function () {'use strict';
  /*! (c) 2018 Andrea Giammarchi (ISC) */
  function walkThrough(O, K) { return O[K]; }
  var namespace;
  var channels = {};
  var instances = {};
  var onceExposed = new Promise(function (resolve) {
    self.workway = function workway(exposed) {
      return Promise.resolve(exposed).then(function (result) {
        namespace = result;
        resolve(createRemote([], result, {}));
      });
    };
    function createRemote(current, object, remote) {
      Object.keys(object).forEach(function (key) {
        var value = object[key];
        var path = current.concat(key);
        if (typeof value === 'function') {
          remote[key] = /^[A-Z]/.test(key) ?
            {
              type: 'class',
              path: path,
              methods: Object.getOwnPropertyNames(value.prototype)
                              .filter(no(['constructor']))
                              .concat('destroy'),
              statics: Object.getOwnPropertyNames(value)
                              .filter(no([
                                'arguments', 'callee', 'caller',
                                'length', 'name', 'prototype'
                              ]))
                              .reduce(
                                function (info, key) {
                                  if (typeof value[key] === 'function') {
                                    info.methods.push(key);
                                  } else {
                                    info.values.push([key, value[key]]);
                                  }
                                  return info;
                                },
                                {
                                  methods: [],
                                  values: []
                                }
                              )
            } :
            {
              type: 'function',
              path: path
            };
        } else if (remote.toString.call(value) === '[object Object]') {
          remote[key] = {
            type: 'object',
            path: path,
            value: {}
          };
          createRemote(path, value, remote[key].value);
        } else if (value !== void 0) {
          remote[key] = {
            type: 'any',
            path: path,
            value: value
          };
        }
      });
      return remote;
      function no(within) {
        return function (what) {
          return within.indexOf(what) < 0;
        };
      }
    }
  });
  self.addEventListener('message', function (event) {
    var method;
    var data = event.data;
    var channel = data.channel;
    var message = data.message;
    if (channels[channel]) {
      event.stopImmediatePropagation();
      var id = message.id;
      var path = message.path;
      var args = message.args;
      var resolved = function (result) { send({result: result}); };
      var rejected = function (error) {  send({error: error.message}); };
      var send = function (message) {
        message.id = id;
        self.postMessage({
          channel: channel,
          message: message
        });
      };
      try {
        if (message.hasOwnProperty('method')) {
          method = message.method;
          var Class = path.reduce(walkThrough, namespace);
          if (!Class)
            return send({
              error: 'Unknown Class ' + path.join('.')
            });
          if (message.hasOwnProperty('object')) {
            var object = message.object;
            var instance = instances[object.id] ||
                            (instances[object.id] = new Class);
            if (method === 'destroy')
              delete instances[object.id];
            else {
              Object.keys(object.value)
                    .forEach(function (key) {
                      instance[key] = object.value[key];
                    });
              Promise.resolve(instance[method].apply(instance, args))
                      .then(resolved, rejected);
            }
          } else {
            Promise.resolve(Class[method].apply(Class, args))
                    .then(resolved, rejected);
          }
        } else {
          var context = path.slice(0, -1).reduce(walkThrough, namespace);
          if (!context)
            return send({
              error: 'Unknown namespace ' + path.slice(0, -1).join('.')
            });
          method = path[path.length - 1];
          if (typeof context[method] !== 'function')
            return send({
              error: 'Unknown method ' + path.join('.')
            });
          Promise.resolve(context[method].apply(context, args))
                  .then(resolved, rejected);
        }
      } catch(error) {
        send({error: error.message});
      }
    } else if (/^(-?\d+\.\d+)$/.test(channel)) {
      channels[channel] = true;
      event.stopImmediatePropagation();
      onceExposed.then(function (namespace) {
        self.postMessage({
          channel: channel,
          namespace: namespace
        });
      });
    }
  });
}());
