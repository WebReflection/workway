function remoted(object) {
  return function $(object, current, remote) {
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
        $(value, path, remote[key].value);
      } else if (value !== void 0) {
        remote[key] = {
          type: 'any',
          path: path,
          value: value
        };
      }
    });
    return remote;
  }(object, [], {});
  function no(within) {
    return function (what) {
      return within.indexOf(what) < 0;
    };
  }
}module.exports = remoted;
