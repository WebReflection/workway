workway('./background.js').then(function (info) {
  // {worker, namespace}
  var worker = info.worker;
  var namespace = info.namespace;

  // you can either use addEventListener
  // or onmessage and onerror and
  // these will never receive remote events,
  // only user messages, and same goes if you post messages
  // the remote logic won't ever be affected
  worker.onmessage = function (event) { showData(event.data); };
  worker.addEventListener('message', console.log.bind(console));

  // you can also send regular messages
  // without affecting namespace operations
  worker.postMessage({echo: 'hello remote'});

  // classes can have static methods
  // static values, and regular prototypal methods
  // however there are few limitations such inheritance
  // and constructor arguments, which is always, and only
  // the unique identifier used to pair local/remote instances
  const instance = new namespace.nested.Test;

  // properties can be added, as long as these are serializable
  instance.test = Math.random();

  // and every method of the class returns a Promise
  // that will resolve once the instance has been updated
  // (properties) and the method invoked,
  // with serializable arguments
  instance.method(1, 2, 3)
          .then(showData, console.error.bind(console))
          .then(function () { instance.destroy(); });

  function showData(data) {
    document.body.appendChild(
      document.createElement('pre')
    ).textContent = JSON.stringify(data, null, '  ');
  }

});
