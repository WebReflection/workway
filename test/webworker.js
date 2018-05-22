const workers = [];

class Event {
  constructor(data) {
    this._stopImmediatePropagation = false;
    this.type = 'message';
    this.data = data;
  }
  stopImmediatePropagation() {
    this._stopImmediatePropagation = true;
  }
}

global.Worker = class Worker extends require('events').EventEmitter {
  constructor(file) {
    workers.push(super());
    require(file);
  }
  addEventListener(type, listener) {
    this.on(type, listener);
  }
  postMessage(data) {
    process.emit('message', new Event(data));
  }
};

global.document = {
  body: {
    appendChild: Object
  },
  createElement() {
    return {set textContent(value) {
      console.log(value);
    }};
  }
};
global.importScripts = require;
global.self = new Proxy(
  {
    addEventListener(type, listener) {
      process.on(type, listener);
    },
    postMessage(data) {
      workers.forEach(worker => worker.emit('message', new Event(data)));
    }
  },
  {
    get: (self, key) => self[key] || global[key],
    set: (self, key, value) => {
      global[key] = value;
      return true;
    }
  }
);
