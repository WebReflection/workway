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
        resolve(remoted(result));
      });
    };
    //js:remoted
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
      var rejected = function (error) {
        if (
          error != null &&
          typeof error === 'object' &&
          'message' in error
        )
          send({error: {
            stack: error.stack,
            message: error.message
          }});
        else
          send({error: {source: error}});
      };
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
            return rejected('Unknown Class ' + path.join('.'));
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
            return rejected('Unknown namespace ' + path.slice(0, -1).join('.'));
          method = path[path.length - 1];
          if (typeof context[method] !== 'function')
            return rejected('Unknown method ' + path.join('.'));
          Promise.resolve(context[method].apply(context, args))
                  .then(resolved, rejected);
        }
      } catch(error) {
        rejected(error);
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
