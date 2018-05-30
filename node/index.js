// core modules
var EventEmitter = require('events').EventEmitter;
var crypto = require('crypto');
var fs = require('fs');
var http = require('http');
var path = require('path');
var vm = require('vm');

// dependencies
var socketIO = require('socket.io');
var JSON = require('flatted');
var remoted = require('../cjs/remoted');
var workerjs = fs.readFileSync(
  path.resolve(__dirname, '..', 'worker.js')
).toString();

// local constants / variables
// used as communication channel
var SECRET = crypto.randomBytes(32).toString('hex');

var jsClient = {
  SECRET: SECRET,
  JSON: fs.readFileSync(require.resolve('flatted/min.js'))
          .toString()
          .replace(
            /var \w+\s*=/,
            'var JSON = (function(JSON){return ') + '}(window.JSON));'
};

var jsContent = fs.readFileSync(path.join(__dirname, 'client.js'))
                  .toString()
                  .replace(/\$\{(SECRET|JSON)\}/g, function ($0, $1) {
                    return jsClient[$1];
                  });

// return a new Worker sandbox
function createSandbox(filename, socket) {
  var self = new EventEmitter;
  var listeners = new WeakMap;
  self.addEventListener = function (type, listener) {
    if (!listeners.has(listener)) {
      var facade = function (event) {
        if (!event.canceled) listener.apply(this, arguments);
      };
      listeners.set(listener, facade);
      self.on(type, facade);
    }
  };
  self.removeEventListener = function (type, listener) {
    self.removeListener(type, listeners.get(listener));
  };
  self.__filename = filename;
  self.__dirname = path.dirname(filename);
  self.postMessage = function postMessage(data) { message(socket, data); };
  self.console = console;
  self.process = process;
  self.Buffer = Buffer;
  self.clearImmediate = clearImmediate;
  self.clearInterval = clearInterval;
  self.clearTimeout = clearTimeout;
  self.setImmediate = setImmediate;
  self.setInterval = setInterval;
  self.setTimeout = setTimeout;
  self.module = module;
  self.global = self;
  self.self = self;
  self.require = function (file) {
    switch (true) {
      case file === 'workway':
        return self.workway;
      case /^[./]/.test(file):
        file = path.resolve(self.__dirname, file);
      default:
        return require(file);
    }
  };
  return self;
}

// notify the socket there was an error
function error(socket, error) {
  socket.emit(SECRET + ':error', JSON.stringify(error));
}

// send serialized data to the client
function message(socket, data) {
  socket.emit(SECRET + ':message', JSON.stringify(data));
}

// used to send /node-worker.js client file
function responder(request, response, next) {
  response.writeHead(200, 'OK', {
    'Content-Type': 'application/javascript'
  });
  response.end(jsContent);
  if (next) next();
}

uid.i = 0;
uid.map = Object.create(null);
uid.delete = function (sandbox) {
  Object.keys(uid.map).some(function (key) {
    var found = uid.map[key] === sandbox;
    if (found) delete uid.map[key];
    return found;
  });
};
function uid(filename, socket) {
  var id = filename + ':uid-'.concat(++uid.i, '-', crypto.randomBytes(8).toString('hex'));
  uid.map[id] = socket;
  return id;
}

process.on('uncaughtException', function (err) {
  if (/\(([\S]+?(:uid-\d+-[a-f0-9]{16}))/.test(err.stack)) {
    var socket = uid.map[RegExp.$1];
    var secret = RegExp.$2;
    if (socket) {
      error(socket, {
        message: err.message,
        stack: ''.replace.call(err.stack, secret, '')
      });
    }
  }
});

function Event(data) {
  this.canceled = false;
  this.data = JSON.parse(data);
}
Event.prototype.stopImmediatePropagation = function () {
  this.canceled = true;
};

var workers = '';
module.exports = {
  authorize: function (folder) {
    if (workers.length) throw new Error('workway already authorized');
    workers = folder;
    return this;
  },
  app: function (app) {
    var io;
    var native = app instanceof http.Server;
    if (native) {
      io = socketIO(app);
      var request = app._events.request;
      app._events.request = function (req) {
        return /^\/workway@node\.js(?:\?|$)/.test(req.url) ?
          responder.apply(this, arguments) :
          request.apply(this, arguments);
      };
    } else {
      var wrap = http.Server(app);
      io = socketIO(wrap);
      app.get('/workway@node.js', responder);
      Object.defineProperty(app, 'listen', {
        configurable: true,
        value: function () {
          wrap.listen.apply(wrap, arguments);
          return app;
        }
      });
    }
    io.on('connection', function (socket) {
      var sandbox;
      var queue = [];
      function message(data) {
        if (sandbox) {
          try {
            var event = new Event(data);
            sandbox.emit('message', event);
            if ('onmessage' in sandbox && !event.canceled) {
              sandbox.onmessage(event);
            }
          } catch(err) {
            error(socket, {message: err.message, stack: err.stack});
          }
        }
        else queue.push(data);
      }
      socket.on(SECRET, message);
      socket.on(SECRET + ':setup', function (worker) {
        var filename = path.resolve(path.join(workers, worker));
        if (filename.indexOf(workers)) {
          error(socket, {
            message: 'Unauthorized worker: ' + worker,
            stack: ''
          });
        } else {
          fs.readFile(filename, function (err, content) {
            if (err) {
              error(socket, {
                message: 'Worker not found: ' + worker,
                stack: err.stack
              });
            } else {
              sandbox = createSandbox(filename, socket);
              vm.createContext(sandbox);
              vm.runInContext(workerjs, sandbox);
              vm.runInContext(content, sandbox, {
                filename: uid(worker, socket),
                displayErrors: true
              });
              while (queue.length) {
                setTimeout(message, queue.length * 100, queue.pop());
              }
            }
          });
        }
      });
      socket.on('disconnect', function () {
        uid.delete(socket);
        sandbox = null;
      });
    });
    return app;
  }
};
